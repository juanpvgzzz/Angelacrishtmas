import { dev } from 'astro';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const server = await dev({
  server: { host: '127.0.0.1', port: 4321 },
  vite: { server: { strictPort: true } },
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await server.stop(); process.exit(0); });
}
