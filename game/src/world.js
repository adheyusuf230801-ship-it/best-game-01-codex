/* Pure fixed-step simulation. Arrays are stable ordered; ties choose the oldest entity.
 * A state can be JSON saved/restored, including RNG and cooldowns, without losing entropy.
 * Events last one step and give later audio/render layers a DOM-free integration point.
 */
(function (BK) {
  'use strict';
  const C = BK.config, R = BK.random;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function nearest(origin, items, eligible) {
    let best = null, d = Infinity;
    for (const item of items) {
      if (eligible && !eligible(item)) continue;
      const next = distance(origin, item);
      if (next < d) { best = item; d = next; }
    }
    return best;
  }
  function event(s, type, data) { s.events.push(Object.assign({ type: type }, data)); }
  function beginWave(s) {
    s.wave.number++;
    s.wave.queue = [];
    const composition = C.waves[s.wave.number - 1];
    for (const kind of Object.keys(composition)) {
      for (let i = 0; i < composition[kind]; i++) s.wave.queue.push(kind);
    }
    // Fisher-Yates, consuming only the world's RNG.
    for (let i = s.wave.queue.length - 1; i > 0; i--) {
      const j = R.int(s.rng, 0, i);
      [s.wave.queue[i], s.wave.queue[j]] = [s.wave.queue[j], s.wave.queue[i]];
    }
    s.wave.phase = 'active';
    s.wave.spawnTimer = 0;
    event(s, 'wave', { number: s.wave.number });
  }
  function spawn(s, kind, x, y) {
    if (x === undefined) {
      const edge = R.int(s.rng, 0, 3), a = C.arena;
      x = edge < 2 ? (edge === 0 ? -a.spawnMargin : a.width + a.spawnMargin) : R.range(s.rng, 0, a.width);
      y = edge >= 2 ? (edge === 2 ? -a.spawnMargin : a.height + a.spawnMargin) : R.range(s.rng, 0, a.height);
    }
    const spec = C.moths[kind];
    s.moths.push({ id: s.nextId++, kind: kind, x: x, y: y, hp: spec.hp,
      age: 0, phase: R.range(s.rng, 0, Math.PI * 2), cycle: 0, vx: 0, vy: 0 });
  }
  function grow(s) {
    // Fill empty beds first, then repair the weakest when the ring is full.
    const bed = s.beds.find(b => b.hp <= 0) || s.beds.reduce((a, b) => b.hp < a.hp ? b : a);
    bed.hp = C.bloom.hp;
    bed.growth = 0;
    bed.stage = 1;
    s.bloomsGrown++;
    s.score += C.bloom.score;
    event(s, 'bloom', { bed: bed.id });
  }
  function kill(s, moth) {
    const spec = C.moths[moth.kind];
    s.kills++;
    s.score += spec.score;
    event(s, 'kill', { x: moth.x, y: moth.y, kind: moth.kind });
    for (let i = 0; i < spec.nectar; i++) {
      const angle = R.range(s.rng, 0, Math.PI * 2);
      s.orbs.push({ id: s.nextId++, x: moth.x + Math.cos(angle) * C.orb.radius,
        y: moth.y + Math.sin(angle) * C.orb.radius });
    }
    if (moth.kind === 'splitter') {
      for (let i = 0; i < spec.children; i++) {
        const angle = moth.phase + i * Math.PI * 2 / spec.children;
        spawn(s, 'bulb', moth.x + Math.cos(angle) * spec.spread, moth.y + Math.sin(angle) * spec.spread);
      }
    }
  }
  function create(seed) {
    return {
      seed: seed, rng: R.create(seed), tick: 0, time: 0, status: 'playing', nextId: 1,
      keeper: { x: C.arena.width / 2, y: C.arena.height / 2, radius: C.keeper.radius,
        aimX: 1, aimY: 0, dashX: 1, dashY: 0, dashTime: 0, dashCooldown: 0,
        dashHeld: false, invulnerable: 0, fireCooldown: 0 },
      beds: C.beds.map((b, i) => ({ id: i, x: b.x, y: b.y,
        hp: i % 2 === 0 && i / 2 < C.startingBlooms ? C.bloom.hp : 0,
        growth: i % 2 === 0 && i / 2 < C.startingBlooms ? 1 : 0,
        stage: i % 2 === 0 && i / 2 < C.startingBlooms ? 3 : 0 })),
      wave: { number: 0, cleared: 0, phase: 'waiting', timer: C.wave.initialDelay, spawnTimer: 0, queue: [] },
      moths: [], bolts: [], orbs: [], events: [], score: 0, kills: 0, bloomsGrown: 0,
      hearts: C.startingHearts, nectar: 0, collected: 0, bloomsLost: 0
    };
  }
  function step(s, input, dt) {
    if (dt === undefined) dt = C.fixedDt;
    if (!Number.isFinite(dt) || Math.abs(dt - C.fixedDt) > 1e-12) throw new RangeError('Use a fixed 1/60 step');
    if (s.status !== 'playing') return s;
    input = input || {};
    s.events = [];
    s.tick++;
    s.time = s.tick * dt;
    const k = s.keeper;
    for (const key of ['dashTime', 'dashCooldown', 'invulnerable', 'fireCooldown']) k[key] = Math.max(0, k[key] - dt);
    let mx = Number.isFinite(input.moveX) ? input.moveX : 0;
    let my = Number.isFinite(input.moveY) ? input.moveY : 0;
    const length = Math.hypot(mx, my);
    if (length > 1) { mx /= length; my /= length; }
    if (Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) {
      const ax = input.aimX - k.x, ay = input.aimY - k.y, al = Math.hypot(ax, ay);
      if (al > 0) { k.aimX = ax / al; k.aimY = ay / al; }
    }
    if (input.dash && !k.dashHeld && k.dashCooldown === 0) {
      k.dashX = length > 0 ? mx / Math.hypot(mx, my) : k.aimX;
      k.dashY = length > 0 ? my / Math.hypot(mx, my) : k.aimY;
      k.dashTime = C.keeper.dashDuration;
      k.dashCooldown = C.keeper.dashCooldown;
      k.invulnerable = Math.max(k.invulnerable, C.keeper.dashDuration);
      event(s, 'dash');
    }
    k.dashHeld = !!input.dash;
    k.x = clamp(k.x + (k.dashTime > 0 ? k.dashX * C.keeper.dashSpeed : mx * C.keeper.speed) * dt, k.radius, C.arena.width - k.radius);
    k.y = clamp(k.y + (k.dashTime > 0 ? k.dashY * C.keeper.dashSpeed : my * C.keeper.speed) * dt, k.radius, C.arena.height - k.radius);
    if (input.firing && k.fireCooldown === 0) {
      s.bolts.push({ id: s.nextId++, x: k.x, y: k.y, vx: k.aimX * C.bolt.speed, vy: k.aimY * C.bolt.speed, life: C.bolt.lifetime });
      k.fireCooldown = C.bolt.fireInterval;
      event(s, 'fire', { x: k.x, y: k.y });
    }
    if (s.wave.phase === 'waiting') {
      s.wave.timer -= dt;
      if (s.wave.timer <= 0) beginWave(s);
    }
    if (s.wave.phase === 'active' && s.wave.queue.length) {
      s.wave.spawnTimer -= dt;
      if (s.wave.spawnTimer <= 0) {
        spawn(s, s.wave.queue.shift());
        s.wave.spawnTimer += Math.max(C.wave.minInterval, C.wave.spawnInterval - (s.wave.number - 1) * C.wave.intervalScale);
      }
    }
    for (const bed of s.beds) {
      if (bed.hp > 0) {
        bed.growth = Math.min(1, bed.growth + dt / C.bloom.growthTime);
        bed.stage = bed.growth < 0.5 ? 1 : bed.growth < 1 ? 2 : 3;
      }
    }
    for (const m of s.moths) {
      const spec = C.moths[m.kind];
      m.age += dt;
      const target = nearest(m, s.beds, b => b.hp > 0) || k;
      const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
      const nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : 0;
      let vx = nx * spec.speed, vy = ny * spec.speed;
      if (m.kind === 'drifter') {
        const sway = Math.sin(m.age * spec.frequency + m.phase) * spec.wobble * spec.speed;
        vx -= ny * sway; vy += nx * sway;
      } else if (m.kind === 'darter') {
        // Lock lunge direction at the end of each pause; the keeper can dodge it.
        const previous = m.cycle;
        m.cycle = (m.cycle + dt) % (spec.pause + spec.lunge);
        if (previous < spec.pause && m.cycle >= spec.pause) { m.vx = nx * spec.lungeSpeed; m.vy = ny * spec.lungeSpeed; }
        vx = m.cycle < spec.pause ? 0 : m.vx;
        vy = m.cycle < spec.pause ? 0 : m.vy;
      }
      if (target !== k && d <= spec.radius + C.bloom.radius) {
        target.hp = Math.max(0, target.hp - spec.chew * dt);
        if (target.hp === 0) { target.stage = 0; target.growth = 0; s.bloomsLost++; event(s, 'wither', { bed: target.id }); }
      } else { m.x += vx * dt; m.y += vy * dt; }
    }
    // Swept bolt segments prevent tunnelling through small, fast bulbs.
    for (const bolt of s.bolts) {
      const ox = bolt.x, oy = bolt.y;
      bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt;
      const dx = bolt.x - ox, dy = bolt.y - oy, len2 = dx * dx + dy * dy;
      let hit = null, first = Infinity;
      for (const m of s.moths) {
        if (m.hp <= 0) continue;
        const t = len2 ? clamp(((m.x - ox) * dx + (m.y - oy) * dy) / len2, 0, 1) : 0;
        if (Math.hypot(m.x - ox - t * dx, m.y - oy - t * dy) <= C.moths[m.kind].radius + C.bolt.radius && t < first) { hit = m; first = t; }
      }
      if (hit) { hit.hp -= C.bolt.damage; bolt.life = 0; }
    }
    s.bolts = s.bolts.filter(b => b.life > 0);
    // Process deaths from a snapshot so newborn bulbs cannot die twice in this step.
    const dead = s.moths.filter(m => m.hp <= 0);
    s.moths = s.moths.filter(m => m.hp > 0);
    for (const m of dead) kill(s, m);
    for (const m of s.moths) {
      if (k.invulnerable === 0 && distance(k, m) < k.radius + C.moths[m.kind].radius) {
        s.hearts--; k.invulnerable = C.keeper.hurtInvulnerability;
        event(s, 'hurt', { hearts: s.hearts });
        if (s.hearts <= 0) { s.status = 'lost'; event(s, 'lose'); return s; }
      }
    }
    s.orbs = s.orbs.filter(orb => {
      const d = distance(k, orb);
      if (d <= C.orb.pickupRadius) {
        s.nectar++; s.collected++; event(s, 'nectar');
        if (s.nectar >= C.orbsPerBloom) { s.nectar -= C.orbsPerBloom; grow(s); }
        return false;
      }
      if (d < C.orb.magnetRadius) {
        const travel = Math.min(d, C.orb.speed * dt);
        orb.x += (k.x - orb.x) / d * travel; orb.y += (k.y - orb.y) / d * travel;
      }
      return true;
    });
    if (s.wave.phase === 'active' && !s.wave.queue.length && !s.moths.length) {
      s.wave.cleared = s.wave.number;
      event(s, 'waveClear', { number: s.wave.number });
      if (s.wave.number === C.waves.length) {
        s.status = 'won'; s.wave.phase = 'complete';
        for (const b of s.beds) { b.hp = C.bloom.hp; b.growth = 1; b.stage = 3; }
        event(s, 'win');
      } else { s.wave.phase = 'waiting'; s.wave.timer = C.wave.intermission; }
    }
    return s;
  }
  BK.world = { create: create, step: step, fingerprint: s => BK.hash(JSON.stringify(s)) };
})(globalThis.BK = globalThis.BK || {});
