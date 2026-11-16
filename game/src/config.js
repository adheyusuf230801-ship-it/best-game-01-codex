(function (BK) {
  'use strict';
  BK.config = {
    arena: { width: 1280, height: 800, spawnMargin: 30 },
    fixedDt: 1 / 60,
    keeper: { speed: 250, radius: 13, dashSpeed: 760, dashDuration: 0.16,
      dashCooldown: 1.15, hurtInvulnerability: 1.5 },
    bolt: { speed: 720, radius: 5, damage: 1, fireInterval: 0.14, lifetime: 1.8 },
    moths: {
      drifter: { hp: 2, speed: 48, radius: 17, wobble: 0.65, frequency: 3, nectar: 1, score: 10, chew: 0.24 },
      darter: { hp: 2, speed: 38, radius: 15, pause: 0.65, lunge: 0.45, lungeSpeed: 205, nectar: 1, score: 15, chew: 0.3 },
      splitter: { hp: 3, speed: 40, radius: 21, children: 3, spread: 20, nectar: 2, score: 25, chew: 0.22 },
      bulb: { hp: 1, speed: 118, radius: 9, nectar: 1, score: 5, chew: 0.18 }
    },
    waves: [
      { drifter: 6 }, { drifter: 8, darter: 2 },
      { drifter: 8, darter: 4, splitter: 1 }, { drifter: 10, darter: 5, splitter: 2 },
      { drifter: 12, darter: 6, splitter: 3 }, { drifter: 14, darter: 8, splitter: 4 },
      { drifter: 16, darter: 10, splitter: 5 }, { drifter: 20, darter: 12, splitter: 7 }
    ],
    wave: { initialDelay: 1, intermission: 3, spawnInterval: 0.85, intervalScale: 0.06, minInterval: 0.3 },
    orb: { radius: 6, pickupRadius: 25, magnetRadius: 105, speed: 210 },
    orbsPerBloom: 6, startingHearts: 3, startingBlooms: 4,
    bloom: { hp: 3, radius: 22, growthTime: 1.2, score: 100 },
    // Explicit coordinates make the ring available to rendering without simulation logic.
    beds: [
      { x: 640, y: 180 }, { x: 795, y: 244 }, { x: 860, y: 400 },
      { x: 795, y: 556 }, { x: 640, y: 620 }, { x: 485, y: 556 },
      { x: 420, y: 400 }, { x: 485, y: 244 }
    ]
  };
})(globalThis.BK = globalThis.BK || {});
