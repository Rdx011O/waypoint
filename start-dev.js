// WAYPOINT — Dual-Service Dev Orchestrator (Cross-Platform)
// Launches backend Express API server (port 5000) and Vite Frontend Dev Server (port 5173) concurrently.

const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const nodeCmd = isWin ? 'node.exe' : 'node';

console.log('🚀 Starting WAYPOINT full-stack development environment...');
console.log('   - Backend API: http://localhost:5000');
console.log('   - Frontend UI: http://localhost:5173\n');

// 1. Start Backend Express Server
const backend = spawn(nodeCmd, ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 2. Start Frontend Vite Dev Server
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error('[Backend Error]', err);
});

frontend.on('error', (err) => {
  console.error('[Frontend Error]', err);
});

function shutdown() {
  console.log('\n🛑 Stopping WAYPOINT dev processes...');
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
