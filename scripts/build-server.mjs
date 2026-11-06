// Empacota server.ts (+ utils/api.ts, etc.) num único arquivo CommonJS para o Electron.
import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync('dist-server', { recursive: true });
await build({
  entryPoints: ['server.ts'],
  outfile: 'dist-server/server.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  logLevel: 'info',
  // vite só é usado em desenvolvimento (import dinâmico) -> fora do executável
  external: ['vite', 'electron'],
  banner: { js: "const __importMetaUrl = require('url').pathToFileURL(__filename).href;" },
  define: { 'import.meta.url': '__importMetaUrl' },
});
copyFileSync('legacy-ipad1.html', 'dist-server/legacy-ipad1.html');
console.log('✔ dist-server/server.cjs gerado');
