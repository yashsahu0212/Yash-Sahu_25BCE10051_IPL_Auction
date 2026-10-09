const { spawn } = require('child_process');
const http = require('http');

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, res => resolve());
        req.on('error', reject);
        req.end();
      });
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Server did not start in time');
}

async function main() {
  console.log('Starting server.js...');
  const serverProc = spawn('node', ['server.js'], { cwd: __dirname + '/..', stdio: 'inherit' });

  try {
    await waitForServer('http://localhost:3000/api/teams');
    console.log('Server is UP!');

    const testFiles = [
      'tests/test_ipl_rules_demo.js',
      'tests/test_captain_retention.js',
      'tests/test_timer_and_resolution.js',
      'tests/test_pause_resume_squad_and_rbac.js',
      'tests/test_competition_features_e2e.js',
      'tests/test_team_console_auth_matrix.js',
      'tests/test_final_audit.js'
    ];

    for (const testFile of testFiles) {
      console.log(`\n========================================`);
      console.log(`RUNNING ${testFile}...`);
      console.log(`========================================`);
      await new Promise((resolve, reject) => {
        const p = spawn('node', [testFile], { cwd: __dirname + '/..', stdio: 'inherit' });
        p.on('exit', code => {
          if (code === 0) resolve();
          else reject(new Error(`${testFile} failed with code ${code}`));
        });
      });
    }

    console.log('\n========================================');
    console.log('ALL TEST SUITES PASSED SUCCESSFULLY!');
    console.log('========================================');
  } finally {
    serverProc.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
