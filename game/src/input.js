(function (BK) {
  'use strict';
  const keys = {}, edges = {}, pointer = { x: 840, y: 400, down: false };
  let attached = false;
  function clear() { for (const k of Object.keys(keys)) delete keys[k]; pointer.down = false; }
  BK.input = {
    attach(canvas) {
      if (attached) return;
      attached = true;
      window.addEventListener('keydown', e => {
        BK.audio.unlock();
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
        if (!keys[e.code] && !e.repeat) edges[e.code] = true;
        keys[e.code] = true;
      });
      window.addEventListener('keyup', e => { keys[e.code] = false; });
      window.addEventListener('blur', clear);
      canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        pointer.x = (e.clientX - r.left) * BK.config.arena.width / r.width;
        pointer.y = (e.clientY - r.top) * BK.config.arena.height / r.height;
      });
      canvas.addEventListener('mousedown', e => { if (e.button === 0) { BK.audio.unlock(); pointer.down = true; edges.Click = true; } });
      window.addEventListener('mouseup', () => { pointer.down = false; });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
    },
    read() { return { moveX: +(!!keys.KeyD || !!keys.ArrowRight) - +(!!keys.KeyA || !!keys.ArrowLeft),
      moveY: +(!!keys.KeyS || !!keys.ArrowDown) - +(!!keys.KeyW || !!keys.ArrowUp),
      aimX: pointer.x, aimY: pointer.y, firing: pointer.down || !!keys.Space,
      dash: !!keys.ShiftLeft || !!keys.ShiftRight }; },
    consume() {
      const result = { pause: !!edges.KeyP, mute: !!edges.KeyM,
        restart: !!(edges.Enter || edges.KeyR || edges.Click), click: !!edges.Click };
      for (const k of Object.keys(edges)) delete edges[k];
      return result;
    }, clear
  };
})(globalThis.BK = globalThis.BK || {});
