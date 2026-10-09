const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');

const SERVER_URL = 'http://localhost:3000';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}${path}`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function waitForServer() {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      await get('/api/teams');
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Server did not start');
}

async function main() {
  const serverProc = spawn('node', ['server.js'], { cwd: __dirname + '/..', stdio: 'inherit' });

  try {
    await waitForServer();
    console.log('--- TEST: VIRAT KOHLI SOLD TO CSK FOR 2.6 CR ---');

    // 1. Log in auctioneer, CSK, and MI
    const auctioneerAuth = await post('/api/auth/login', { username: 'auctioneer', password: 'hammer2026' });
    const cskAuth = await post('/api/auth/login', { username: 'csk', password: 'csk2026' });
    const miAuth = await post('/api/auth/login', { username: 'mi', password: 'mi2026' });
    
    assert(auctioneerAuth.token, 'Failed auctioneer login');
    assert(cskAuth.token, 'Failed CSK login');
    assert(miAuth.token, 'Failed MI login');

    // 2. Reset auction to start clean
    await post('/api/auction/reset', {}, auctioneerAuth.token);

    // 3. Check CSK initial purse before sale
    const cskInitial = await get('/api/teams/CSK');
    console.log(`CSK Initial Purse: ₹${cskInitial.remaining / 100} Cr (${cskInitial.remaining} Lakhs), Spent: ₹${cskInitial.spent}L, Squad Count: ${cskInitial.players.length}`);
    assert.strictEqual(cskInitial.remaining, 12500, 'CSK starting purse must be 12500 lakhs (125 Cr)');

    // 4. Start auction for Virat Kohli (ID 1, Base reserve 200L)
    const playersRes = await get('/api/players');
    const virat = (playersRes.players || playersRes).find(p => p.name.toUpperCase().includes('VIRAT') || p.id === 1);
    assert(virat, 'Virat Kohli player record found');

    const startRes = await post('/api/auction/start', { playerId: virat.id }, auctioneerAuth.token);
    assert(startRes.success, 'Auction start success');

    // Bidding sequence to reach 260L:
    // Opening bid by CSK: 200L
    const bid1 = await post('/api/auction/bid', { expectedBid: 200 }, cskAuth.token);
    assert(bid1.success, `CSK opening bid 200L: ${bid1.error}`);

    // Counter bid by MI: 220L (+20L tier increment)
    const bid2 = await post('/api/auction/bid', { expectedBid: 220 }, miAuth.token);
    assert(bid2.success, `MI counter bid 220L: ${bid2.error}`);

    // Counter bid by CSK: 240L
    const bid3 = await post('/api/auction/bid', { expectedBid: 240 }, cskAuth.token);
    assert(bid3.success, `CSK counter bid 240L: ${bid3.error}`);

    // Counter bid by MI: 260L
    const bid4 = await post('/api/auction/bid', { expectedBid: 260 }, miAuth.token);
    assert(bid4.success, `MI counter bid 260L: ${bid4.error}`);

    // Counter bid by CSK: 280L or let's say CSK wins at 260L (if CSK placed 260L)
    // Let's do CSK winning at 260L:
    // Re-sequence: MI opening 200L, CSK 220L, MI 240L, CSK 260L!
    await post('/api/auction/reset', {}, auctioneerAuth.token);
    await post('/api/auction/start', { playerId: virat.id }, auctioneerAuth.token);

    const b1 = await post('/api/auction/bid', { expectedBid: 200 }, miAuth.token);
    assert(b1.success, `MI bid 200L: ${b1.error}`);

    const b2 = await post('/api/auction/bid', { expectedBid: 220 }, cskAuth.token);
    assert(b2.success, `CSK bid 220L: ${b2.error}`);

    const b3 = await post('/api/auction/bid', { expectedBid: 240 }, miAuth.token);
    assert(b3.success, `MI bid 240L: ${b3.error}`);

    const b4 = await post('/api/auction/bid', { expectedBid: 260 }, cskAuth.token);
    assert(b4.success, `CSK bid 260L: ${b4.error}`);

    // 5. Auctioneer marks SOLD to CSK at 260L (₹2.6 Cr)
    const soldRes = await post('/api/auction/sold', {}, auctioneerAuth.token);
    assert(soldRes.success, 'Auctioneer marked SOLD');
    assert.strictEqual(soldRes.team.id, 'CSK');
    assert.strictEqual(soldRes.price, 260);

    // 6. Verify CSK purse after sale: ₹125 Cr - ₹2.6 Cr = ₹122.40 Cr (12240 Lakhs)
    const cskUpdated = await get('/api/teams/CSK');
    console.log(`\nAFTER SALE (Virat sold to CSK at ₹2.60 Cr / 260 Lakhs):`);
    console.log(`CSK Remaining Purse: ₹${cskUpdated.remaining / 100} Cr (${cskUpdated.remaining} Lakhs)`);
    console.log(`CSK Spent: ₹${cskUpdated.spent / 100} Cr (${cskUpdated.spent} Lakhs)`);
    console.log(`CSK Squad Players Count: ${cskUpdated.players.length}`);
    console.log(`CSK Filled Slots: ${cskUpdated.filledSlots}`);

    assert.strictEqual(cskUpdated.spent, 260, 'CSK spent should be exactly 260 lakhs (2.6 Cr)');
    assert.strictEqual(cskUpdated.remaining, 12240, 'CSK remaining purse should be exactly 12240 lakhs (122.40 Cr)');
    assert.strictEqual(cskUpdated.players.length, 1, 'CSK squad should contain exactly 1 player');
    assert.strictEqual(cskUpdated.filledSlots, 1, 'CSK filledSlots should be exactly 1');

    console.log('\n✓ VERIFICATION SUCCESSFUL! CSK purse correctly updated to ₹122.40 Cr (12,240 Lakhs). No double deduction or duplicate player entry.');
  } finally {
    serverProc.kill();
  }
}

main().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
