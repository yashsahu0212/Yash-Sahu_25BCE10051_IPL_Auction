const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          // not json
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function login(username, password) {
  const res = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });

  const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
  return { res, cookie, user: res.json ? res.json.user : null };
}

async function runTests() {
  console.log('=== STARTING TEST SUITE FOR NEW FEATURES ===\n');
  let passed = 0;
  let failed = 0;

  function assert(desc, condition, debugInfo = '') {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc} ${debugInfo}`);
      failed++;
    }
  }

  try {
    // 1. Login as auctioneer
    const auctioneerSession = await login('auctioneer', 'hammer2026');
    assert('Login as Auctioneer (auctioneer/hammer2026)', auctioneerSession.user && auctioneerSession.user.role === 'auctioneer');
    const authHeaders = { 'Content-Type': 'application/json', 'Cookie': auctioneerSession.cookie };

    // 2. Reset tournament
    const resetRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/reset-all',
      method: 'POST',
      headers: authHeaders
    }, {});
    assert('Reset tournament successfully', resetRes.status === 200 && resetRes.json && resetRes.json.success);

    // 3. Test squad limit configuration
    console.log('\n--- Testing Squad Limit API ---');
    const invalidLimit = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/squad-limit',
      method: 'POST',
      headers: authHeaders
    }, { maxSlots: 5 });
    assert('Reject squad limit < 7 (got 400)', invalidLimit.status === 400);

    const validLimit = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/squad-limit',
      method: 'POST',
      headers: authHeaders
    }, { maxSlots: 18 });
    assert('Set squad limit to 18 (got 200)', validLimit.status === 200 && validLimit.json.maxSlots === 18);

    const stateAfterLimit = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/state',
      method: 'GET'
    });
    assert('Auction state reports teams maxSlots=18', stateAfterLimit.json && stateAfterLimit.json.teams && stateAfterLimit.json.teams[0].maxSlots === 18);

    // 4. Test franchise expansion API
    console.log('\n--- Testing Franchise Expansion API ---');
    const newTeamPayload = {
      name: 'Pune Strikers',
      code: 'PNS',
      shortName: 'PNS',
      color: '#7C3AED',
      purse: 12500
    };
    const createTeamRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/teams/create',
      method: 'POST',
      headers: authHeaders
    }, newTeamPayload);
    assert('Create 11th franchise (PNS)', createTeamRes.status === 200 && createTeamRes.json.team && createTeamRes.json.team.id === 'PNS', createTeamRes.data);

    const teamsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/teams',
      method: 'GET'
    });
    assert('Total teams now equals 11', teamsRes.json.length === 11);
    const foundTeam = teamsRes.json.find(t => t.id === 'PNS');
    assert('New team found in team list with custom color', foundTeam && foundTeam.color === '#7C3AED');

    // 5. Test login with newly created franchise
    console.log('\n--- Testing Login with Newly Created Franchise ---');
    const pnsLogin = await login('pns', 'pns2026');
    assert('Login as newly created team PNS (credentials pns/pns2026)', pnsLogin.user && pnsLogin.user.teamId === 'PNS');
    const pnsHeaders = { 'Content-Type': 'application/json', 'Cookie': pnsLogin.cookie };

    // 6. Test franchise expansion up to 15 teams limit
    console.log('\n--- Testing Franchise Limit (Max 15) ---');
    const extraTeams = [
      { name: 'Kochi Tuskers', code: 'KTK', shortName: 'KTK', color: '#EA580C', purse: 12500 },
      { name: 'Gujarat Lions', code: 'GL', shortName: 'GL', color: '#CA8A04', purse: 12500 },
      { name: 'Rising Pune', code: 'RPS', shortName: 'RPS', color: '#EC4899', purse: 12500 },
      { name: 'Deccan Chargers', code: 'DCG', shortName: 'DCG', color: '#2563EB', purse: 12500 }
    ];

    for (const t of extraTeams) {
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/teams/create',
        method: 'POST',
        headers: authHeaders
      }, t);
      assert(`Added team ${t.code}`, res.status === 200);
    }

    const maxTeamsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/teams',
      method: 'GET'
    });
    assert('Teams reached maximum of 15', maxTeamsRes.json.length === 15);

    // Try 16th team - should be rejected
    const team16 = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/teams/create',
      method: 'POST',
      headers: authHeaders
    }, { name: 'Extra Team', code: 'EXT', purse: 12500 });
    assert('Reject 16th team beyond maximum limit', team16.status === 400);

    // 7. Test active lot stability and timer expiration
    console.log('\n--- Testing Active Lot Stability and Timer ---');
    // Get first available player
    const playersRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/players?status=available&limit=1',
      method: 'GET'
    });
    const firstPlayer = playersRes.json.players[0];
    assert('Found available player for auction', !!firstPlayer);

    // Start lot
    const startLotRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/start',
      method: 'POST',
      headers: authHeaders
    }, { playerId: firstPlayer.id });
    assert(`Start lot (${firstPlayer.name})`, startLotRes.status === 200 && startLotRes.json.state.currentPlayer.name === firstPlayer.name);

    const stateDuringLot = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/state',
      method: 'GET'
    });
    assert('Lot is live with current player', stateDuringLot.json.status === 'live' && stateDuringLot.json.currentPlayer.id === firstPlayer.id);

    // Pause auction
    const pauseRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/pause',
      method: 'POST',
      headers: authHeaders
    }, {});
    assert('Pause auction', pauseRes.status === 200 && pauseRes.json.state.status === 'paused');

    const stateDuringPause = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/state',
      method: 'GET'
    });
    assert('Paused state retains active player', stateDuringPause.json.currentPlayer && stateDuringPause.json.currentPlayer.id === firstPlayer.id);

    // Resume auction
    const resumeRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/resume',
      method: 'POST',
      headers: authHeaders
    }, {});
    assert('Resume auction', resumeRes.status === 200 && resumeRes.json.state.status === 'live');

    // Now place bid as PNS
    const bidRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/bid',
      method: 'POST',
      headers: pnsHeaders
    }, {});
    assert('PNS successfully places opening bid at reserve price', bidRes.status === 200 && bidRes.json.state && bidRes.json.state.leadingTeamId === 'PNS', bidRes.data);

    // Sell lot to PNS
    const sellRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/sold',
      method: 'POST',
      headers: authHeaders
    }, {});
    assert(`Auctioneer sells ${firstPlayer.name} to PNS`, sellRes.status === 200 && sellRes.json.success && sellRes.json.team.id === 'PNS', sellRes.data);

    // Check PNS squad
    const pnsTeamData = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/teams',
      method: 'GET'
    });
    const pnsUpdated = pnsTeamData.json.find(t => t.id === 'PNS');
    assert('PNS squad now has the player', pnsUpdated.squad.some(p => p.id === firstPlayer.id));
    assert('PNS filled slots equals 1', pnsUpdated.filledSlots === 1);

    // Reset back to clean state
    await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auction/reset-all',
      method: 'POST',
      headers: authHeaders
    }, {});
    console.log('\nClean reset executed after test suite.');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
