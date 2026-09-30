const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// Block direct access to server files, sensitive data, and environment configs
const SENSITIVE_PATTERNS = [
  /^\/\.env/i,
  /^\/server\.js/i,
  /^\/package.*\.json/i,
  /^\/data(\/|$)/i,
  /^\/backend(\/|$)/i,
  /^\/test_.*\.js/i,
  /^\/\.git/i
];
app.use((req, res, next) => {
  if (SENSITIVE_PATTERNS.some(p => p.test(req.path))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// ─── DATA STORE ─────────────────────────────────────────────
let players = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'players.json'), 'utf-8'));
let teams = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'teams.json'), 'utf-8'));

// Compute remaining purse for each team
teams.forEach(t => { t.remaining = parseFloat((t.purse - t.spent).toFixed(2)); });

const sessions = new Map(); // token -> { userId, role, teamId, username }
const revokedTokens = new Set();
const SESSION_SECRET = process.env.SESSION_SECRET || 'hammer-authoritative-auction-secret-2026';

function signSession(data) {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `hm.${payload}.${sig}`;
}

function verifySignedSession(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('hm.')) return null;
  if (revokedTokens.has(token)) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, payloadB64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
    if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Date.now()) return null;
      return {
        userId: payload.userId,
        role: payload.role,
        teamId: payload.teamId,
        username: payload.username
      };
    }
  } catch (e) {}
  return null;
}

const USERS = [
  { id: 'auctioneer', username: 'auctioneer', password: 'hammer2026', role: 'auctioneer', teamId: null },
  { id: 'mi',   username: 'mi',   password: 'mi2026',   role: 'team_owner', teamId: 'MI' },
  { id: 'csk',  username: 'csk',  password: 'csk2026',  role: 'team_owner', teamId: 'CSK' },
  { id: 'rcb',  username: 'rcb',  password: 'rcb2026',  role: 'team_owner', teamId: 'RCB' },
  { id: 'dc',   username: 'dc',   password: 'dc2026',   role: 'team_owner', teamId: 'DC' },
  { id: 'gt',   username: 'gt',   password: 'gt2026',   role: 'team_owner', teamId: 'GT' },
  { id: 'kkr',  username: 'kkr',  password: 'kkr2026',  role: 'team_owner', teamId: 'KKR' },
  { id: 'lsg',  username: 'lsg',  password: 'lsg2026',  role: 'team_owner', teamId: 'LSG' },
  { id: 'pbks', username: 'pbks', password: 'pbks2026', role: 'team_owner', teamId: 'PBKS' },
  { id: 'rr',   username: 'rr',   password: 'rr2026',   role: 'team_owner', teamId: 'RR' },
  { id: 'srh',  username: 'srh',  password: 'srh2026',  role: 'team_owner', teamId: 'SRH' },
  { id: 'viewer', username: 'viewer', password: 'view2026', role: 'viewer', teamId: null }
];

// ─── AUCTION STATE ──────────────────────────────────────────
let auction = {
  status: 'idle',          // idle | live | paused | completed
  currentPlayerId: null,
  currentBid: 0,           // Integer lakhs
  basePrice: 0,            // Integer lakhs
  leadingTeamId: null,
  round: 1,
  lotIndex: 0,
  timer: 15,
  maxTimer: 15,            // Default 15-second timer (authoritative & configurable)
  gavelStage: 0,           // 0=bidding, 1=1st call, 2=2nd call, 3=final call
  bidIncrement: 10,        // Integer lakhs (+10L, +20L, +50L)
  bidHistory: [],          // { teamId, teamName, amount, timestamp }
  sessionLabel: '2026 MEGA AUCTION'
};

let auctionHistory = [];    // completed lots: { player, soldTo, soldPrice, bidHistory, timestamp }
let timerInterval = null;

// ─── HELPERS ────────────────────────────────────────────────
function getTeam(id) { return teams.find(t => t.id === id); }
function getPlayer(id) { return players.find(p => p.id === id); }

function decodeSupabaseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload && payload.exp && payload.exp * 1000 < Date.now()) return null;
      const email = payload.email || '';
      const username = payload.user_metadata?.username || email.split('@')[0] || 'user';
      let role = payload.user_metadata?.role || payload.role;
      if (!role) {
        if (email.includes('auctioneer') || username === 'auctioneer') role = 'auctioneer';
        else if (teams.some(t => t.id.toLowerCase() === username.toLowerCase())) role = 'team_owner';
        else role = 'viewer';
      }
      let teamId = payload.user_metadata?.team_id || payload.team_id;
      if (!teamId && role === 'team_owner') {
        const matched = teams.find(t => t.id.toLowerCase() === username.toLowerCase());
        teamId = matched ? matched.id : null;
      }
      return {
        userId: payload.sub,
        role,
        teamId,
        username
      };
    }
  } catch (e) {}
  return null;
}

function checkToken(token) {
  if (!token || revokedTokens.has(token)) return null;
  const cleanToken = typeof token === 'string' ? token.trim().replace(/^["']|["']$/g, '') : null;
  if (!cleanToken || cleanToken === 'null' || cleanToken === 'undefined') return null;
  if (sessions.has(cleanToken)) return sessions.get(cleanToken);
  const signed = verifySignedSession(cleanToken);
  if (signed) {
    sessions.set(cleanToken, signed);
    return signed;
  }
  const decoded = decodeSupabaseJwt(cleanToken);
  if (decoded) {
    sessions.set(cleanToken, decoded);
    return decoded;
  }
  return null;
}

function getSession(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const s = checkToken(authHeader.slice(7));
    if (s) return s;
  }
  if (req.cookies && req.cookies.hammer_token) {
    const s = checkToken(req.cookies.hammer_token);
    if (s) return s;
  }
  return null;
}

function requireAuth(roles = []) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Authentication required' });
    if (roles.length > 0 && !roles.includes(session.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.session = session;
    next();
  };
}

function saveData() {
  fs.writeFileSync(path.join(__dirname, 'data', 'players.json'), JSON.stringify(players, null, 2));
  fs.writeFileSync(path.join(__dirname, 'data', 'teams.json'), JSON.stringify(teams, null, 2));
}

function getPublicAuctionState() {
  const currentPlayer = auction.currentPlayerId ? getPlayer(auction.currentPlayerId) : null;
  const leadingTeam = auction.leadingTeamId ? getTeam(auction.leadingTeamId) : null;
  return {
    ...auction,
    currentPlayer,
    leadingTeam,
    teams: teams.map(t => ({
      id: t.id, name: t.name, shortName: t.shortName,
      remaining: t.remaining, filledSlots: t.filledSlots, maxSlots: t.maxSlots
    }))
  };
}

function formatCR(val) {
  if (val == null) return '—';
  if (val >= 100) return `₹${(val / 100).toFixed(2)} Cr`;
  return `₹${val} L`;
}

// Tiered bid increment calculator (Rule 6 from brief)
// Current bid < 100L  -> +10L
// Current bid < 500L  -> +20L
// Current bid >= 500L -> +50L
function getBidIncrement(currentBidLakhs) {
  if (currentBidLakhs < 100) return 10;
  if (currentBidLakhs < 500) return 20;
  return 50;
}

// ─── TIMER ENGINE ───────────────────────────────────────────
function startTimer() {
  stopTimer();
  auction.timer = auction.maxTimer;
  auction.gavelStage = 0;
  timerInterval = setInterval(() => {
    if (auction.status !== 'live') return;
    auction.timer--;

    // Dynamic Gavel stage progression based on maxTimer
    const ratio = auction.timer / auction.maxTimer;
    if (ratio <= 0.66 && ratio > 0.33) auction.gavelStage = 1;
    else if (ratio <= 0.33 && ratio > 0.1) auction.gavelStage = 2;
    else if (ratio <= 0.1 && auction.timer > 0) auction.gavelStage = 3;

    io.emit('auction:timer', {
      timer: auction.timer,
      maxTimer: auction.maxTimer,
      gavelStage: auction.gavelStage
    });

    if (auction.timer <= 0) {
      stopTimer();
      // Auto-action when timer expires
      if (auction.leadingTeamId) {
        io.emit('auction:hammer_ready', {
          message: 'Timer expired. Confirm SOLD or continue.',
          leadingTeamId: auction.leadingTeamId,
          currentBid: auction.currentBid
        });
      } else {
        markUnsold();
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  auction.timer = auction.maxTimer;
  auction.gavelStage = 0;
}

// ─── AUCTION ENGINE ─────────────────────────────────────────
function startAuctionForPlayer(playerId) {
  const player = getPlayer(playerId);
  if (!player) return { error: 'Player not found' };
  if (player.status !== 'available' && player.status !== 'on_hammer') return { error: 'Player not available' };
  if (auction.status === 'live' && auction.currentPlayerId !== playerId) return { error: 'Auction already in progress' };

  // Set player on hammer
  player.status = 'on_hammer';
  auction.status = 'live';
  auction.currentPlayerId = player.id;
  auction.currentBid = 0; // Reserve base price active, first bid starts at base price
  auction.basePrice = player.basePrice;
  auction.leadingTeamId = null;
  auction.bidHistory = [];
  auction.gavelStage = 0;
  auction.timer = auction.maxTimer; // Use configured auction duration
  auction.bidIncrement = getBidIncrement(player.basePrice);
  auction.lotIndex++;

  startTimer();
  io.emit('auction:started', getPublicAuctionState());
  return { success: true, state: getPublicAuctionState() };
}

function placeBid(teamId, expectedBid) {
  if (auction.status !== 'live') {
    return { error: 'Auction is not currently live', code: 'NOT_LIVE' };
  }
  if (!auction.currentPlayerId) {
    return { error: 'No player currently on the hammer', code: 'NO_PLAYER' };
  }
  const team = getTeam(teamId);
  if (!team) {
    return { error: 'Team not found', code: 'TEAM_NOT_FOUND' };
  }

  // RULE 7: LEADING TEAM CANNOT RE-BID ON SAME LOT
  if (auction.leadingTeamId === teamId) {
    return { error: 'Leading team cannot outbid itself on the same lot.', code: 'ALREADY_LEADING' };
  }

  // Calculate new bid amount using Tiered Increments (Rule 6)
  const newBid = auction.leadingTeamId
    ? auction.currentBid + getBidIncrement(auction.currentBid)
    : auction.basePrice; // First bid is at base reserve price

  // Anti-race-condition check: if client specified expected bid, ensure it matches
  if (expectedBid != null) {
    const expectedNum = Number(expectedBid);
    if (Math.abs(expectedNum - newBid) > 0.001) {
      const leader = getTeam(auction.leadingTeamId);
      return {
        error: `Outbid! Current bid is now ${formatCR(auction.currentBid)} (${leader ? leader.shortName : 'another franchise'}). Next valid bid is ${formatCR(newBid)}.`,
        code: 'OUTBID',
        currentBid: auction.currentBid,
        nextBid: newBid,
        leadingTeam: leader ? leader.shortName : null
      };
    }
  }

  // Validate squad slot limit (max 25)
  if (team.filledSlots >= team.maxSlots) {
    return { error: 'Squad is full (maximum 25 players reached)', code: 'SQUAD_FULL' };
  }

  // Validate team can afford in integer lakhs
  if (newBid > team.remaining) {
    return {
      error: `Insufficient purse: ${team.shortName} has ${formatCR(team.remaining)} remaining, but this bid requires ${formatCR(newBid)}.`,
      code: 'INSUFFICIENT_PURSE'
    };
  }

  // RULE 10: Squad constraint preservation:
  // Must preserve at least ₹30L reserve per remaining required slot to reach minimum 7 players
  const remainingReqSlots = Math.max(0, 7 - (team.filledSlots + 1));
  const minReserveNeeded = remainingReqSlots * 30; // Minimum base reserve is ₹30L
  if ((team.remaining - newBid) < minReserveNeeded) {
    return {
      error: `Purse deficit: Bidding ${formatCR(newBid)} leaves ${formatCR(team.remaining - newBid)}, insufficient to fill the mandatory 7-player minimum squad.`,
      code: 'SQUAD_CONSTRAINT_VIOLATION'
    };
  }

  // Atomically apply the bid
  auction.currentBid = newBid;
  auction.leadingTeamId = teamId;
  auction.bidIncrement = getBidIncrement(newBid);

  const bidRecord = {
    teamId,
    teamName: team.name,
    teamShortName: team.shortName,
    amount: newBid,
    timestamp: Date.now()
  };
  auction.bidHistory.push(bidRecord);

  // RULE 9: Reset lot timer to 10 seconds on each accepted bid
  resetTimer();
  if (!timerInterval) startTimer();

  const state = getPublicAuctionState();
  io.emit('auction:bid', {
    teamId,
    teamName: team.name,
    teamShortName: team.shortName,
    amount: newBid,
    bidHistory: auction.bidHistory,
    bid: bidRecord,
    state
  });

  return { success: true, acceptedBid: newBid, amount: newBid, state };
}

function markSold() {
  if (auction.status !== 'live' && auction.status !== 'paused') return { error: 'No active auction' };
  if (!auction.leadingTeamId) return { error: 'No leading bidder' };

  stopTimer();
  const player = getPlayer(auction.currentPlayerId);
  const team = getTeam(auction.leadingTeamId);

  // Update player
  player.status = 'sold';
  player.soldTo = team.id;
  player.soldPrice = auction.currentBid;

  // Update team (Integer Lakhs)
  team.spent = team.spent + auction.currentBid;
  team.remaining = team.purse - team.spent;
  team.filledSlots++;
  const playerItem = {
    id: player.id,
    lotNumber: player.lotNumber,
    name: player.name,
    role: player.role,
    roleLabel: player.roleLabel,
    price: auction.currentBid,
    soldPrice: auction.currentBid,
    overseas: !!player.overseas
  };
  if (!team.players) team.players = [];
  team.players.push(playerItem);
  if (!team.squad) team.squad = [];
  team.squad.push(playerItem);

  // Record history
  auctionHistory.push({
    player: { id: player.id, name: player.name, role: player.role, lotNumber: player.lotNumber },
    result: 'sold',
    soldTo: { id: team.id, name: team.name, shortName: team.shortName },
    soldPrice: auction.currentBid,
    basePrice: auction.basePrice,
    bidCount: auction.bidHistory.length,
    bidHistory: [...auction.bidHistory],
    timestamp: Date.now()
  });

  // Reset auction state
  auction.status = 'idle';
  auction.currentPlayerId = null;
  auction.gavelStage = 0;
  auction.timer = 0;

  saveData();
  const state = getPublicAuctionState();
  io.emit('auction:sold', {
    player: { id: player.id, name: player.name },
    team: { id: team.id, name: team.name, shortName: team.shortName },
    price: player.soldPrice,
    state
  });

  return {
    success: true,
    player: { id: player.id, name: player.name },
    team: { id: team.id, name: team.name, shortName: team.shortName },
    price: player.soldPrice,
    state
  };
}

function markUnsold() {
  if (auction.status !== 'live' && auction.status !== 'paused' && auction.status !== 'idle') {
    // Allow markUnsold even from timer expiry
  }
  if (!auction.currentPlayerId) return { error: 'No player on hammer' };

  stopTimer();
  const player = getPlayer(auction.currentPlayerId);

  // Update player
  player.status = 'unsold';

  // Record history
  auctionHistory.push({
    player: { id: player.id, name: player.name, role: player.role, lotNumber: player.lotNumber },
    result: 'unsold',
    soldTo: null,
    soldPrice: null,
    basePrice: auction.basePrice,
    bidCount: auction.bidHistory.length,
    bidHistory: [...auction.bidHistory],
    timestamp: Date.now()
  });

  // Reset auction state
  auction.status = 'idle';
  auction.currentPlayerId = null;
  auction.leadingTeamId = null;
  auction.currentBid = 0;
  auction.gavelStage = 0;
  auction.timer = 0;

  saveData();
  const state = getPublicAuctionState();
  io.emit('auction:unsold', {
    player: { id: player.id, name: player.name },
    state
  });

  return { success: true, state };
}

function pauseAuction() {
  if (auction.status !== 'live') return { error: 'Auction not live' };
  auction.status = 'paused';
  stopTimer();
  io.emit('auction:paused', getPublicAuctionState());
  return { success: true };
}

function resumeAuction() {
  if (auction.status !== 'paused') return { error: 'Auction not paused' };
  auction.status = 'live';
  startTimer();
  io.emit('auction:resumed', getPublicAuctionState());
  return { success: true };
}

// ─── AUTH ROUTES ────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase() && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const sessionData = { userId: user.id, role: user.role, teamId: user.teamId, username: user.username };
  const token = signSession(sessionData);
  sessions.set(token, sessionData);

  res.cookie('hammer_token', token, { httpOnly: false, maxAge: 24 * 60 * 60 * 1000, path: '/', sameSite: 'lax' });
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, teamId: user.teamId },
    team: user.teamId ? getTeam(user.teamId) : null
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.slice(7);
    sessions.delete(t);
    revokedTokens.add(t);
  }
  if (req.cookies && req.cookies.hammer_token) {
    sessions.delete(req.cookies.hammer_token);
    revokedTokens.add(req.cookies.hammer_token);
  }
  res.clearCookie('hammer_token', { path: '/' });
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  const team = session.teamId ? getTeam(session.teamId) : null;
  res.json({ user: session, team });
});

// ─── PLAYER ROUTES ──────────────────────────────────────────
app.get('/api/players', (req, res) => {
  let result = [...players];

  // Filter by role
  if (req.query.role && req.query.role !== 'all') {
    if (req.query.role === 'overseas') {
      result = result.filter(p => p.overseas);
    } else if (req.query.role === 'uncapped') {
      result = result.filter(p => !p.capped);
    } else {
      result = result.filter(p => p.role === req.query.role ||
        (req.query.role === 'allrounders' && p.role === 'allrounder') ||
        (req.query.role === 'bowlers' && p.role === 'bowler') ||
        (req.query.role === 'batters' && p.role === 'batter') ||
        (req.query.role === 'wicketkeepers' && p.role === 'wicketkeeper'));
    }
  }

  // Filter by status
  if (req.query.status) {
    result = result.filter(p => p.status === req.query.status);
  }

  // Search
  if (req.query.search) {
    const s = req.query.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.nationality.toLowerCase().includes(s) ||
      p.role.toLowerCase().includes(s)
    );
  }

  // Sort
  const sortBy = req.query.sort || 'basePrice';
  const sortDir = req.query.dir === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    if (sortBy === 'name') return sortDir * a.name.localeCompare(b.name);
    if (sortBy === 'basePrice') return sortDir * (b.basePrice - a.basePrice);
    if (sortBy === 'lotNumber') return sortDir * (a.lotNumber - b.lotNumber);
    return 0;
  });

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  result = result.slice(offset, offset + limit);

  res.json({ players: result, total, page, totalPages, limit });
});

app.get('/api/players/:id', (req, res) => {
  const player = getPlayer(parseInt(req.params.id));
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

// ─── TEAM ROUTES ────────────────────────────────────────────
app.get('/api/teams', (req, res) => {
  res.json(teams.map(t => ({
    ...t,
    remaining: parseFloat((t.purse - t.spent).toFixed(2))
  })));
});

app.get('/api/teams/:id', (req, res) => {
  const team = getTeam(req.params.id.toUpperCase());
  if (!team) return res.status(404).json({ error: 'Team not found' });
  res.json({ ...team, remaining: parseFloat((team.purse - team.spent).toFixed(2)) });
});

// ─── AUCTION ROUTES ─────────────────────────────────────────
app.get('/api/auction/state', (req, res) => {
  res.json(getPublicAuctionState());
});

app.get('/api/auction/history', (req, res) => {
  res.json(auctionHistory);
});

app.post('/api/auction/start', requireAuth(['auctioneer']), (req, res) => {
  const { playerId } = req.body;
  const result = startAuctionForPlayer(playerId);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Place bid (strictly team owners only — auctioneer cannot bid)
app.post('/api/auction/bid', requireAuth(['team_owner']), (req, res) => {
  const teamId = req.session.teamId;
  const { expectedBid } = req.body;

  if (!teamId) return res.status(400).json({ error: 'Team ID required' });
  const result = placeBid(teamId, expectedBid);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Auctioneer configures authoritative timer duration (e.g. 5s, 10s, 15s, 20s, 30s, 45s, 60s)
app.post('/api/auction/timer/settings', requireAuth(['auctioneer']), (req, res) => {
  const duration = parseInt(req.body.duration);
  if (isNaN(duration) || duration < 5 || duration > 120 || !Number.isInteger(duration)) {
    return res.status(400).json({ error: 'Invalid timer duration. Must be an integer between 5 and 120 seconds.' });
  }

  auction.maxTimer = duration;
  if (auction.status === 'idle') {
    auction.timer = duration;
  }

  io.emit('auction:timer_settings', {
    maxTimer: auction.maxTimer,
    timer: auction.timer
  });
  io.emit('auction:state', getPublicAuctionState());

  res.json({ success: true, duration: auction.maxTimer, maxTimer: auction.maxTimer, timer: auction.timer, state: getPublicAuctionState() });
});

// Auctioneer extends timer by N seconds
app.post('/api/auction/timer/add', requireAuth(['auctioneer']), (req, res) => {
  if (auction.status !== 'live') return res.status(400).json({ error: 'Auction is not live' });
  const seconds = parseInt(req.body.seconds) || 10;
  auction.timer = Math.min(auction.timer + seconds, 120);
  io.emit('auction:timer', { timer: auction.timer, maxTimer: auction.maxTimer, gavelStage: auction.gavelStage });
  res.json({ success: true, timer: auction.timer, maxTimer: auction.maxTimer });
});

// Auctioneer resets timer to configured or specified seconds
app.post('/api/auction/timer/reset', requireAuth(['auctioneer']), (req, res) => {
  if (auction.status !== 'live' && auction.status !== 'paused') {
    return res.status(400).json({ error: 'Auction is not active' });
  }
  const seconds = parseInt(req.body.seconds) || auction.maxTimer || 15;
  auction.timer = seconds;
  io.emit('auction:timer', { timer: auction.timer, maxTimer: auction.maxTimer, gavelStage: auction.gavelStage });
  res.json({ success: true, timer: auction.timer, maxTimer: auction.maxTimer });
});

// Auctioneer manually advances or sets gavel stage (0=Bidding, 1=1st Call, 2=2nd Call, 3=Final Call)
app.post('/api/auction/gavel', requireAuth(['auctioneer']), (req, res) => {
  if (auction.status !== 'live' && auction.status !== 'paused') {
    return res.status(400).json({ error: 'Auction is not active' });
  }
  const stage = parseInt(req.body.stage);
  if (stage >= 0 && stage <= 3) {
    auction.gavelStage = stage;
    io.emit('auction:timer', { timer: auction.timer, gavelStage: auction.gavelStage });
    res.json({ success: true, gavelStage: auction.gavelStage });
  } else {
    res.status(400).json({ error: 'Invalid gavel stage' });
  }
});

app.post('/api/auction/sold', requireAuth(['auctioneer']), (req, res) => {
  const result = markSold();
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auction/unsold', requireAuth(['auctioneer']), (req, res) => {
  const result = markUnsold();
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auction/pause', requireAuth(['auctioneer']), (req, res) => {
  const result = pauseAuction();
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auction/resume', requireAuth(['auctioneer']), (req, res) => {
  const result = resumeAuction();
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Reset current lot (auctioneer debug/override)
app.post('/api/auction/reset', requireAuth(['auctioneer']), (req, res) => {
  stopTimer();
  if (auction.currentPlayerId) {
    const player = getPlayer(auction.currentPlayerId);
    if (player && (player.status === 'on_hammer' || player.status === 'available')) {
      player.status = 'available';
    }
  }
  auction.status = 'idle';
  auction.currentPlayerId = null;
  auction.currentBid = 0;
  auction.leadingTeamId = null;
  auction.bidHistory = [];
  auction.gavelStage = 0;
  auction.timer = 0;

  io.emit('auction:reset', getPublicAuctionState());
  res.json({ success: true, state: getPublicAuctionState() });
});

// Full session reset for testing / tournament restart
app.post('/api/auction/reset-all', requireAuth(['auctioneer']), (req, res) => {
  stopTimer();
  auction = {
    status: 'idle',
    currentPlayerId: null,
    currentBid: 0,
    basePrice: 0,
    leadingTeamId: null,
    round: 1,
    lotIndex: 0,
    timer: 15,
    maxTimer: 15,
    gavelStage: 0,
    bidIncrement: 10,
    bidHistory: [],
    sessionLabel: '2026 MEGA AUCTION'
  };
  auctionHistory = [];
  players.forEach(p => {
    p.status = 'available';
    p.soldTo = null;
    p.soldPrice = null;
  });
  teams.forEach(t => {
    t.purse = 12500;
    t.spent = 0;
    t.remaining = 12500;
    t.filledSlots = 0;
    t.players = [];
    t.squad = [];
  });
  saveData();
  io.emit('auction:reset', getPublicAuctionState());
  io.emit('teams:update', teams);
  res.json({ success: true, state: getPublicAuctionState() });
});

// ─── SOCKET.IO ──────────────────────────────────────────────
io.on('connection', (socket) => {
  // Authenticate socket connection
  const token = socket.handshake.auth?.token;
  const session = checkToken(token);
  socket.session = session;

  // Handle explicit auth message from client
  socket.on('auth', (data, ack) => {
    const s = checkToken(data?.token);
    if (s) {
      socket.session = s;
      if (typeof ack === 'function') ack({ success: true, session: s });
    } else {
      if (typeof ack === 'function') ack({ success: false, error: 'Invalid or missing authentication token' });
    }
  });

  // Send current state immediately
  socket.emit('auction:state', getPublicAuctionState());
  socket.emit('teams:update', teams.map(t => ({
    ...t, remaining: t.purse - t.spent
  })));

  // Handle bid via socket (for instant low-latency bidding)
  const handleBid = (data, ack) => {
    if (socket.session?.role !== 'team_owner') {
      const err = { error: 'Only franchise team owners can place bids from their consoles', code: 'UNAUTHORIZED' };
      if (typeof ack === 'function') ack(err);
      return socket.emit('error', { message: err.error, code: err.code });
    }

    const teamId = socket.session.teamId;
    const expectedBid = data?.expectedBid;
    const result = placeBid(teamId, expectedBid);

    if (typeof ack === 'function') ack(result);
    if (result.error) {
      socket.emit('error', { message: result.error, code: result.code });
    }
  };

  socket.on('bid', handleBid);
  socket.on('bid:place', handleBid);

  socket.on('disconnect', () => {
    // cleanup if needed
  });
});

// ─── FRONTEND PAGE ROUTES ───────────────────────────────────
// Both clean URLs (/player-pool) and extension URLs (/player-pool.html) are explicitly supported.

// 1. Live Auction (Broadcast Stage)
app.get(['/', '/index', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Player Pool Catalogue
app.get(['/player-pool', '/player-pool.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'player-pool.html'));
});

// 3. Lot Replay & Settlement Archive
app.get(['/lot-replay', '/lot-replay.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'lot-replay.html'));
});

// 4. Unified Authentication Portal
app.get(['/login', '/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 5. Access Restricted (403)
app.get(['/unauthorized', '/unauthorized.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'unauthorized.html'));
});

// 6. Auctioneer Master Control Desk Guard
const auctionDeskGuard = (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect('/login.html?redirect=/auction-desk.html');
  }
  if (session.role !== 'auctioneer') {
    return res.status(403).sendFile(path.join(__dirname, 'unauthorized.html'));
  }
  return res.sendFile(path.join(__dirname, 'auction-desk.html'));
};
app.get(['/auction-desk', '/auction-desk.html'], auctionDeskGuard);

// 7. Team Console Guard
const teamConsoleGuard = (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect('/login.html?redirect=/team-console.html');
  }
  if (session.role !== 'team_owner' || !session.teamId) {
    return res.status(403).sendFile(path.join(__dirname, 'unauthorized.html'));
  }
  return res.sendFile(path.join(__dirname, 'team-console.html'));
};
app.get(['/team-console', '/team-console.html'], teamConsoleGuard);

// 8. Profile / Avatar Routing
const profileHandler = (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.redirect('/login.html?redirect=/profile');
  }
  if (session.role === 'auctioneer') {
    return res.redirect('/auction-desk.html');
  }
  if (session.role === 'team_owner') {
    return res.redirect('/team-console.html');
  }
  return res.redirect('/');
};
app.get(['/profile', '/profile.html', '/avatar'], profileHandler);

// ─── STATIC ASSET SERVING ───────────────────────────────────
// Root directories take priority — they contain the latest, canonical implementations.
// public/ dirs serve as fallback only. Do NOT reverse this order.
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/players', express.static(path.join(__dirname, 'players')));
app.use('/players', express.static(path.join(__dirname, 'public', 'players')));
app.use('/screens', express.static(path.join(__dirname, 'screens')));
app.use(express.static(__dirname, {
  extensions: ['html'],
  index: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 404 HANDLERS (SEPARATED API VS FRONTEND) ───────────────
// Unknown API requests -> return JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found', path: req.path });
});

// Unknown static asset files with an extension -> return JSON 404
app.use((req, res, next) => {
  if (path.extname(req.path)) {
    return res.status(404).json({ error: 'Asset not found', path: req.path });
  }
  next();
});

// Unknown frontend page routes -> return broadcast-styled 404 HTML
app.use((req, res) => {
  res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>HAMMER // 404 Page Not Found</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/css/hammer-editorial.css"/>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0B0C0D] text-[#F2F0EA] min-h-screen flex items-center justify-center p-6 font-['Inter',sans-serif]">
  <div class="max-w-md w-full bg-[#181A1C] border border-[#232527] p-8 text-center rounded-[6px]">
    <div class="w-12 h-12 bg-[#C74632] text-white flex items-center justify-center font-['Bebas_Neue',sans-serif] text-2xl mx-auto mb-4 rounded-[4px]">H</div>
    <span class="font-['Space_Mono',monospace] text-[10px] text-[#C74632] tracking-[0.25em] uppercase font-bold block mb-1">HAMMER BROADCAST ENGINE</span>
    <h1 class="font-['Bebas_Neue',sans-serif] text-5xl uppercase tracking-wide text-white leading-none my-2">404 // NOT FOUND</h1>
    <p class="font-['Space_Mono',monospace] text-xs text-[#A7A9AA] uppercase tracking-wider mb-6">THE REQUESTED STAGE ROUTE DOES NOT EXIST.</p>
    <div class="flex flex-col sm:flex-row gap-2">
      <a href="/" class="flex-1 py-2.5 bg-[#C74632] text-white font-['Space_Mono',monospace] text-xs uppercase tracking-wider font-bold rounded-[4px] hover:bg-[#9E3628] transition-colors text-center">LIVE AUCTION</a>
      <a href="/player-pool" class="flex-1 py-2.5 bg-[#1E2022] border border-[#303234] text-[#F2F0EA] font-['Space_Mono',monospace] text-xs uppercase tracking-wider rounded-[4px] hover:bg-[#242628] transition-colors text-center">PLAYER POOL</a>
    </div>
  </div>
</body>
</html>`);
});

// ─── START SERVER ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  HAMMER — REALTIME AUCTION CONTROL ENGINE    ║`);
  console.log(`  ║  Server running on http://localhost:${PORT}      ║`);
  console.log(`  ╠══════════════════════════════════════════════╣`);
  console.log(`  ║  Live Board:    http://localhost:${PORT}/          ║`);
  console.log(`  ║  Player Pool:   http://localhost:${PORT}/player-pool.html ║`);
  console.log(`  ║  Auction Desk:  http://localhost:${PORT}/auction-desk.html║`);
  console.log(`  ║  Team Console:  http://localhost:${PORT}/team-console.html║`);
  console.log(`  ║  Lot Replay:    http://localhost:${PORT}/lot-replay.html  ║`);
  console.log(`  ║  Login:         http://localhost:${PORT}/login.html       ║`);
  console.log(`  ╠══════════════════════════════════════════════╣`);
  console.log(`  ║  Players loaded: ${players.length.toString().padEnd(27)}║`);
  console.log(`  ║  Teams loaded:   ${teams.length.toString().padEnd(27)}║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
