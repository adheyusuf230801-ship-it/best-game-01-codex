(function (BK) {
  'use strict';
  function nearest(k, list) { return list.reduce((a, b) => !a || Math.hypot(b.x-k.x,b.y-k.y) < Math.hypot(a.x-k.x,a.y-k.y) ? b : a, null); }
  BK.shots = {
    setup(name, seed) {
      if (!name) return null;
      const s = BK.world.create(seed);
      let screen = 'title';
      if (name === 'play') {
        for (let i = 0; i < 2600 && s.status === 'playing'; i++) {
          const k = s.keeper, target = nearest(k, s.moths), orb = nearest(k, s.orbs);
          const destination = orb || { x: 640 + Math.cos(i / 180) * 180, y: 400 + Math.sin(i / 180) * 160 };
          const d = Math.hypot(destination.x-k.x, destination.y-k.y) || 1;
          BK.world.step(s, { moveX: (destination.x-k.x)/d, moveY: (destination.y-k.y)/d,
            aimX: target ? target.x : 640, aimY: target ? target.y : 180, firing: true, dash: i % 180 === 0 });
        }
        screen = s.status === 'playing' ? 'playing' : s.status;
      } else if (name === 'win' || name === 'over') {
        const win = name === 'win'; screen = win ? 'won' : 'lost'; s.status = screen;
        s.score = win ? 8240 : 1265; s.wave.number = win ? 8 : 4; s.hearts = win ? 3 : 0;
        s.bloomsGrown = win ? 12 : 3;
        s.beds.forEach(b => { b.hp = win ? 3 : 0; b.growth = win ? 1 : 0; b.stage = win ? 3 : 0; });
      }
      return { world: s, screen, time: name === 'play' ? s.time : 12 };
    }
  };
})(globalThis.BK = globalThis.BK || {});
