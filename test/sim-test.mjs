// Run with: node test/sim-test.mjs. No browser, dependencies, or wall clock.
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import assert from 'node:assert/strict';

for (const file of ['random', 'config', 'world']) {
  const path = new URL(`../game/src/${file}.js`, import.meta.url);
  runInThisContext(readFileSync(path, 'utf8'), { filename: path.pathname });
}
const { world, config } = globalThis.BK;
let failures = 0;
function check(name, test) {
  try { const detail = test(); console.log(`PASS ${name}${detail ? ': ' + detail : ''}`); }
  catch (error) { failures++; console.log(`FAIL ${name}: ${error.message}`); }
}
function scripted(tick) {
  return {
    moveX: Math.cos(tick / 90), moveY: Math.sin(tick / 90),
    aimX: 640 + Math.cos(tick / 25) * 500,
    aimY: 400 + Math.sin(tick / 25) * 350,
    firing: tick % 120 < 110, dash: tick % 150 === 0
  };
}
check('determinism', () => {
  const a = world.create(7), b = world.create(7);
  for (let i = 0; i < 3600; i++) {
    world.step(a, scripted(i), config.fixedDt);
    world.step(b, scripted(i), config.fixedDt);
  }
  assert.equal(a.tick > 0, true);
  assert.equal(world.fingerprint(a), world.fingerprint(b));
  // Deep equality also guards against a coincidental short-hash collision.
  assert.deepEqual(a, b);
  const restored = JSON.parse(JSON.stringify(a));
  for (let i = 3600; i < 3660; i++) {
    world.step(a, scripted(i), config.fixedDt);
    world.step(restored, scripted(i), config.fixedDt);
  }
  assert.deepEqual(a, restored);
  return world.fingerprint(b);
});
check('progression', () => {
  const state = world.create(7);
  const initialHp = state.beds.reduce((sum, b) => sum + b.hp, 0);
  for (let i = 0; i < 18000 && state.status === 'playing'; i++) world.step(state, {}, config.fixedDt);
  const hp = state.beds.reduce((sum, b) => sum + b.hp, 0);
  assert.ok(state.hearts < config.startingHearts || hp < initialHp, 'passive garden suffered no damage');
  assert.equal(state.status, 'lost', 'after eating the garden, moths must seek the keeper');
  return `${state.bloomsLost} blooms lost, ${state.hearts} hearts`;
});
check('wave 1 bot', () => {
  const state = world.create(7);
  for (let i = 0; i < 7200 && state.wave.cleared < 1 && state.status === 'playing'; i++) {
    const k = state.keeper;
    const target = state.moths.reduce((best, m) => !best ||
      Math.hypot(m.x - k.x, m.y - k.y) < Math.hypot(best.x - k.x, best.y - k.y) ? m : best, null);
    world.step(state, { aimX: target ? target.x : 640, aimY: target ? target.y : 0,
      moveX: 0, moveY: 0, firing: true, dash: false }, config.fixedDt);
  }
  assert.ok(state.wave.cleared >= 1, 'nearest-moth bot did not clear wave 1');
  assert.equal(state.kills, config.waves[0].drifter);
  assert.equal(state.status, 'playing');
  return `${state.kills} moths destroyed in ${state.tick} ticks`;
});
process.exitCode = failures ? 1 : 0;
