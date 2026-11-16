/**
 * Hand-in program: copies game/ and screenshots/ and builds the gate's dossier.
 * Run with Node 22: MAKEFUN_OUTPUT_DIR=out node main.ts (defaults to /output).
 * Supply the finished screenshots before running; buildDossier validates all caps.
 */
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = dirname(fileURLToPath(import.meta.url));
const output = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
mkdirSync(output, { recursive: true });
if (output !== source) {
  for (const folder of ['game', 'screenshots']) {
    cpSync(resolve(source, folder), resolve(output, folder), { recursive: true });
  }
}
writeFileSync(resolve(output, 'dossier.json'), buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
}));
