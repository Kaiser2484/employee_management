import { execSync, spawn } from 'node:child_process';

function getBackendPort() {
  const raw = process.env.BACKEND_PORT || '3002';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 3002;
}

function freePort(port) {
  try {
    // Find process IDs listening on the target port (Windows command).
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes('LISTENING'));

    const pids = [...new Set(output.map((line) => line.split(/\s+/).at(-1)).filter(Boolean))];

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[dev] Killed PID ${pid} on port ${port}`);
      } catch {
        // Ignore race conditions where process exits between lookup and kill.
      }
    }
  } catch {
    // No process is listening on this port.
  }
}

function runNestWatch() {
  const child = spawn('npm run dev:raw', {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

const port = getBackendPort();
freePort(port);
runNestWatch();
