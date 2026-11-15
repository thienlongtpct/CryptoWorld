// Starts the account server and the Vite dev server together.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const node = process.execPath;
const server = spawn(node, ['--experimental-strip-types', 'server/index.mjs'], { stdio: 'inherit' });
const vite = spawn(node, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))], { stdio: 'inherit' });

function stop() {
  server.kill('SIGTERM');
  vite.kill('SIGTERM');
}
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
server.on('exit', code => { if (code) { vite.kill('SIGTERM'); process.exit(code ?? 1); } });
vite.on('exit', code => { server.kill('SIGTERM'); process.exit(code ?? 0); });
