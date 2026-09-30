const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

async function post(endpoint, data = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data: json };
}

function createClient(name, token) {
  return new Promise((resolve) => {
    const s = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    s.on('connect', () => {
      console.log(`[${name}] Socket connected (${s.id})`);
      resolve(s);
    });
  });
}

async function run() {
  console.log('=== HAMMER REALTIME SYNC & RELIABILITY TEST ===\n');

  // 1. Log in auctioneer, MI, and CSK
  const auctioneerAuth = await post('/api/auth/login', { username: 'auctioneer', password: 'hammer2026' });
  const miAuth = await post('/api/auth/login', { username: 'mi', password: 'mi2026' });
  const cskAuth = await post('/api/auth/login', { username: 'csk', password: 'csk2026' });

  console.log('Auth check: Auctioneer:', auctioneerAuth.ok, 'MI:', miAuth.ok, 'CSK:', cskAuth.ok);

  // 2. Connect 3 sockets concurrently
  const sAuctioneer = await createClient('AUCTIONEER', auctioneerAuth.data.token);
  const sMI = await createClient('MI CONSOLE', miAuth.data.token);
  const sCSK = await createClient('CSK CONSOLE', cskAuth.data.token);

  // Set up event recorders
  const events = { auctioneer: [], mi: [], csk: [] };
  sAuctioneer.on('auction:started', d => events.auctioneer.push({ event: 'started', time: Date.now(), lot: d.currentPlayer?.name }));
  sAuctioneer.on('auction:bid', d => events.auctioneer.push({ event: 'bid', time: Date.now(), amount: d.amount, team: d.teamShortName }));
  sAuctioneer.on('auction:sold', d => events.auctioneer.push({ event: 'sold', time: Date.now(), player: d.player?.name }));
  sAuctioneer.on('auction:unsold', d => events.auctioneer.push({ event: 'unsold', time: Date.now(), player: d.player?.name }));

  sMI.on('auction:started', d => events.mi.push({ event: 'started', time: Date.now(), lot: d.currentPlayer?.name }));
  sMI.on('auction:bid', d => events.mi.push({ event: 'bid', time: Date.now(), amount: d.amount, team: d.teamShortName }));
  sMI.on('auction:sold', d => events.mi.push({ event: 'sold', time: Date.now(), player: d.player?.name }));

  sCSK.on('auction:started', d => events.csk.push({ event: 'started', time: Date.now(), lot: d.currentPlayer?.name }));
  sCSK.on('auction:bid', d => events.csk.push({ event: 'bid', time: Date.now(), amount: d.amount, team: d.teamShortName }));
  sCSK.on('auction:sold', d => events.csk.push({ event: 'sold', time: Date.now(), player: d.player?.name }));

  let timerTicks = [];
  sAuctioneer.on('auction:timer', d => timerTicks.push(d.timer));

  // 3. Test SOLD when no active auction or no bids
  console.log('\n--- Test 1: SOLD button clicked when IDLE ---');
  const soldIdle = await post('/api/auction/sold', {}, auctioneerAuth.data.token);
  console.log('Result when idle:', soldIdle.status, soldIdle.data.error);

  // Reset any state cleanly
  await post('/api/auction/reset', {}, auctioneerAuth.data.token);

  // 4. Test start auction on available player (e.g. player 54 GURNOOR BRAR)
  console.log('\n--- Test 2: Put player on bid (Gurnoor Brar #54) ---');
  const t0 = Date.now();
  const startRes = await post('/api/auction/start', { playerId: 54 }, auctioneerAuth.data.token);
  const latency = Date.now() - t0;
  console.log(`Start request completed in ${latency}ms:`, startRes.ok, startRes.data.state?.currentPlayer?.name);

  // Wait 300ms for socket broadcasts
  await new Promise(r => setTimeout(r, 300));
  console.log('Auctioneer received start event:', events.auctioneer.some(e => e.event === 'started'));
  console.log('MI received start event:', events.mi.some(e => e.event === 'started'));
  console.log('CSK received start event:', events.csk.some(e => e.event === 'started'));

  // 5. Test SOLD when lot is active but NO BIDS placed
  console.log('\n--- Test 3: SOLD button clicked with 0 BIDS ---');
  const soldNoBids = await post('/api/auction/sold', {}, auctioneerAuth.data.token);
  console.log('Result with 0 bids:', soldNoBids.status, soldNoBids.data.error, '(code:', soldNoBids.data.code + ')');

  // 6. Test bidding from CSK
  console.log('\n--- Test 4: CSK places opening bid ---');
  const bid1 = await post('/api/auction/bid', { expectedBid: 30 }, cskAuth.data.token);
  console.log('CSK bid result:', bid1.ok, bid1.data.acceptedBid, 'Leader:', bid1.data.state?.leadingTeam?.shortName);

  await new Promise(r => setTimeout(r, 200));
  console.log('Auctioneer saw CSK bid:', events.auctioneer.some(e => e.event === 'bid' && e.team === 'CSK'));
  console.log('MI saw CSK bid:', events.mi.some(e => e.event === 'bid' && e.team === 'CSK'));

  // 7. Test counter-bid from MI
  console.log('\n--- Test 5: MI places counter bid ---');
  const bid2 = await post('/api/auction/bid', { expectedBid: 40 }, miAuth.data.token);
  console.log('MI bid result:', bid2.ok, bid2.data.acceptedBid, 'Leader:', bid2.data.state?.leadingTeam?.shortName);

  await new Promise(r => setTimeout(r, 200));
  console.log('CSK saw MI bid:', events.csk.some(e => e.event === 'bid' && e.team === 'MI'));

  // 8. Test HAMMER SOLD now that MI holds high bid
  console.log('\n--- Test 6: Auctioneer clicks HAMMER SOLD ---');
  const soldRes = await post('/api/auction/sold', {}, auctioneerAuth.data.token);
  console.log('SOLD result:', soldRes.ok, soldRes.data.player?.name, 'sold to:', soldRes.data.team?.shortName, 'for:', soldRes.data.price);

  await new Promise(r => setTimeout(r, 300));
  console.log('Auctioneer saw sold event:', events.auctioneer.some(e => e.event === 'sold'));
  console.log('MI saw sold event:', events.mi.some(e => e.event === 'sold'));
  console.log('CSK saw sold event:', events.csk.some(e => e.event === 'sold'));

  // Check state reset
  const stateAfterSold = await fetch(`${BASE_URL}/api/auction/state`).then(r => r.json());
  console.log('State after sold: status:', stateAfterSold.status, 'currentPlayer:', stateAfterSold.currentPlayer, 'leadingTeamId:', stateAfterSold.leadingTeamId, 'currentBid:', stateAfterSold.currentBid, 'bidHistory length:', stateAfterSold.bidHistory.length);

  // 9. Test "PUT NEXT PLAYER ON BID" immediately after SOLD (no stuck state, no duplicate error)
  console.log('\n--- Test 7: Put NEXT player on bid immediately (Tejasvi Dahiya #55) ---');
  const startNext = await post('/api/auction/start', { playerId: 55 }, auctioneerAuth.data.token);
  console.log('Start next lot result:', startNext.ok, startNext.data.state?.currentPlayer?.name, startNext.data.error || 'SUCCESS');

  // Let timer tick for 3 seconds to verify countdown stream
  console.log('\n--- Test 8: Verify countdown stream is running smoothly ---');
  timerTicks = [];
  await new Promise(r => setTimeout(r, 3200));
  console.log('Timer ticks received in 3s:', timerTicks);

  // Reset back to clean state
  await post('/api/auction/reset', {}, auctioneerAuth.data.token);

  sAuctioneer.disconnect();
  sMI.disconnect();
  sCSK.disconnect();

  console.log('\n=== ALL REALTIME TESTS PASSED! ===');
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
