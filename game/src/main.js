(function (BK) {
  'use strict';
  const audio = BK.audio;
  let world, screen = 'title', canvas, ctx, accumulator = 0, last = null, seed;
  function restart() {
    audio.unlock(); audio.stopAmbient();
    world = BK.world.create(seed); screen = 'playing'; accumulator = 0;
    audio.startAmbient(world.wave.number, seed);
  }
  function snapshot() {
    return { moths: new Map(world.moths.map(m => [m.id, m.hp])),
      kills: world.kills, collected: world.collected, blooms: world.bloomsGrown,
      hearts: world.hearts, cleared: world.wave.cleared, wave: world.wave.number,
      status: world.status, nectar: world.nectar };
  }
  function soundChanges(before) {
    // Step events preserve throws/dashes even if a bolt hits in its birth step.
    for (const event of world.events) {
      if (event.type === 'fire') audio.dewBoltThrow();
      if (event.type === 'dash') audio.dash();
    }
    const remaining = new Map(world.moths.map(m => [m.id, m.hp]));
    for (const [id, hp] of before.moths) {
      if (!remaining.has(id) || remaining.get(id) < hp) audio.boltHit();
    }
    for (let i = before.kills; i < world.kills; i++) audio.mothDeath();
    for (let i = 0; i < world.collected - before.collected; i++)
      audio.nectarPickup(((before.nectar + i) % BK.config.orbsPerBloom + 1) / BK.config.orbsPerBloom);
    for (let i = before.blooms; i < world.bloomsGrown; i++) audio.bloomGrown();
    if (world.hearts < before.hearts) audio.keeperHurt();
    if (world.wave.cleared > before.cleared) audio.waveClear();
    if (world.wave.number !== before.wave) audio.startAmbient(world.wave.number, seed);
    if (world.status !== before.status) {
      audio.stopAmbient();
      if (world.status === 'won') audio.win();
      if (world.status === 'lost') audio.lose();
    }
  }
  function frame(ms) {
    const elapsed = last === null ? 0 : Math.min(0.25, Math.max(0, (ms-last)/1000)); last = ms;
    const edge = BK.input.consume();
    if (edge.mute) audio.setMuted(!audio.isMuted());
    if (edge.restart && ['title', 'won', 'lost'].includes(screen)) restart();
    if (edge.pause && (screen === 'playing' || screen === 'paused')) { screen = screen === 'playing' ? 'paused' : 'playing'; accumulator = 0;
      if (screen === 'paused') audio.stopAmbient(); else audio.startAmbient(world.wave.number, seed);
    }
    if (screen === 'playing') {
      accumulator += elapsed;
      while (accumulator >= BK.config.fixedDt) {
        const before = snapshot();
        BK.world.step(world, BK.input.read()); accumulator -= BK.config.fixedDt;
        soundChanges(before);
        if (world.status !== 'playing') { screen = world.status; accumulator = 0; break; }
      }
    }
    BK.render.draw(ctx, world, screen, ms/1000, audio.isMuted());
    window.requestAnimationFrame(frame);
  }
  function boot() {
    canvas = document.getElementById('garden'); ctx = canvas.getContext('2d');
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('seed'); seed = raw === null ? 2026 : /^-?\d+$/.test(raw) ? Number(raw) : raw;
    BK.input.attach(canvas); world = BK.world.create(seed);
    const shot = BK.shots.setup(params.get('shot'), seed);
    if (shot) { world = shot.world; screen = shot.screen; BK.render.draw(ctx, world, screen, shot.time, false); window.__shotReady = true; return; }
    window.requestAnimationFrame(frame);
  }
  BK.main = { boot, restart, audio, get state() { return world; }, get screen() { return screen; } };
  document.addEventListener('DOMContentLoaded', boot);
})(globalThis.BK = globalThis.BK || {});
