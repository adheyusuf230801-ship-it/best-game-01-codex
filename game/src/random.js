/* All entropy lives in the serializable world state, never in a hidden closure. */
(function (BK) {
  'use strict';
  BK.hash = function (text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  };
  BK.random = {
    create: function (seed) {
      return { value: typeof seed === 'number' ? seed >>> 0 : parseInt(BK.hash(String(seed)), 16) };
    },
    next: function (rng) {
      rng.value = (rng.value + 0x6D2B79F5) >>> 0;
      let t = rng.value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range: function (rng, min, max) { return min + (max - min) * this.next(rng); },
    // Inclusive integer endpoints.
    int: function (rng, min, max) { return Math.floor(this.range(rng, min, max + 1)); },
    pick: function (rng, items) { return items[this.int(rng, 0, items.length - 1)]; }
  };
})(globalThis.BK = globalThis.BK || {});
