import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root = path.resolve(import.meta.dirname, '../game');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link\b[^>]*href=["']([^"']+)["']/g)].map(m => m[1]);
assert.ok(scripts.length >= 7); assert.ok(styles.length);
for (const ref of [...scripts, ...styles]) {
  const file = path.resolve(root, ref);
  assert.ok(file.startsWith(root + path.sep), `Outside game: ${ref}`);
  assert.ok(fs.statSync(file).isFile(), `Missing: ${ref}`);
}
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
for (const file of files(root)) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(!/https?:\/\//i.test(source), `Network reference: ${file}`);
  assert.ok(!/Math\.random\s*\(/.test(source), `Unseeded randomness: ${file}`);
}
function load(search) {
  const listeners = {}, windowListeners = {}, canvasListeners = {}, frames = [];
  const audioContexts = [], timers = new Map();
  let timerId = 0;
  class Param {
    constructor() { this.value = 0; }
    setValueAtTime(v) { this.value = v; }
    linearRampToValueAtTime(v) { this.value = v; }
    exponentialRampToValueAtTime(v) { assert.ok(v > 0); this.value = v; }
    setTargetAtTime(v) { this.value = v; }
    cancelScheduledValues() {}
  }
  class AudioNode {
    constructor() {
      for (const key of ['gain','frequency','detune','threshold','knee','ratio']) this[key] = new Param();
    }
    connect() {}
    disconnect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; if (this.onended) this.onended(); }
  }
  class FakeAudioContext {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = 'suspended'; this.destination = {}; this.nodes = []; audioContexts.push(this); }
    node() { const n = new AudioNode(); this.nodes.push(n); return n; }
    createGain() { return this.node(); }
    createOscillator() { return this.node(); }
    createBiquadFilter() { return this.node(); }
    createDynamicsCompressor() { return this.node(); }
    createBufferSource() { return this.node(); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
  }
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get(o,k) { if (!(k in o)) o[k] = k === 'createLinearGradient' || k === 'createRadialGradient' ? () => gradient : () => {}; return o[k]; } });
  const canvas = { getContext: () => ctx, addEventListener(k,f) { canvasListeners[k] = f; }, getBoundingClientRect: () => ({left:0,top:0,width:1280,height:800}) };
  const context = vm.createContext({ console, URLSearchParams, document: { getElementById: () => canvas, addEventListener: (k,f) => { listeners[k]=f; } },
    window: { AudioContext: FakeAudioContext, setTimeout(f) { timers.set(++timerId, f); return timerId; }, clearTimeout(id) { timers.delete(id); }, location: { search }, addEventListener: (k,f) => { windowListeners[k]=f; }, requestAnimationFrame: f => frames.push(f) } });
  for (const src of scripts) vm.runInContext(fs.readFileSync(path.join(root,src),'utf8'), context, {filename:src});
  for (const api of ['world','render','input','main','audio']) assert.ok(context.BK[api], `Missing BK.${api}`);
  for (const method of ['unlock','setMuted','isMuted','startAmbient','stopAmbient','dewBoltThrow','boltHit',
    'mothDeath','nectarPickup','bloomGrown','keeperHurt','dash','waveClear','win','lose'])
    assert.equal(typeof context.BK.audio[method], 'function', `Missing audio.${method}`);
  assert.equal(audioContexts.length, 0, 'Audio must remain lazy at script load');
  listeners.DOMContentLoaded();
  assert.equal(audioContexts.length, 0, 'Boot must remain silent');
  return {context, frames, windowListeners, canvasListeners, audioContexts, timers};
}
for (const shot of ['start','play','win','over']) {
  const {context,frames} = load(`?shot=${shot}&seed=42`);
  assert.equal(context.window.__shotReady,true); assert.equal(frames.length,0);
  assert.equal(context.BK.main.screen, {start:'title',play:'playing',win:'won',over:'lost'}[shot]);
  if (shot==='play') assert.ok(context.BK.main.state.wave.number>0);
  const again=load(`?shot=${shot}&seed=42`).context;
  assert.equal(context.BK.world.fingerprint(context.BK.main.state),again.BK.world.fingerprint(again.BK.main.state));
}
const {context,frames,windowListeners,canvasListeners,audioContexts,timers}=load('');
frames.shift()(0);
canvasListeners.mousedown({button:0});
assert.equal(audioContexts.length,1);
assert.equal(audioContexts[0].state,'running');
frames.shift()(17);
assert.equal(context.BK.main.screen,'playing');
windowListeners.keydown({code:'KeyP',preventDefault(){}}); frames.shift()(34);
assert.equal(context.BK.main.screen,'paused');
console.log('Page smoke tests passed (assets, offline sources, APIs, scenes, loop, pause).');

assert.equal(timers.size, 0, 'Pause stops bird scheduling');
const audio = context.BK.audio;
const fingerprint = context.BK.world.fingerprint(context.BK.main.state);
audio.unlock(); assert.equal(audioContexts.length, 1, 'Reuse context');
for (const method of ['dewBoltThrow','boltHit','mothDeath','nectarPickup','bloomGrown','keeperHurt','dash','waveClear','win','lose']) audio[method](0.75);
audio.startAmbient(1,42); assert.equal(timers.size,1);
audio.startAmbient(2,42); assert.equal(timers.size,1, 'Wave change reuses ambient bed');
const bird = [...timers.values()][0]; timers.clear(); bird(); assert.equal(timers.size,1);
audio.stopAmbient(); assert.equal(timers.size,0);
windowListeners.keydown({code:'KeyM',preventDefault(){}}); frames.shift()(51);
assert.equal(audio.isMuted(),true);
audio.setMuted(false); assert.equal(audio.isMuted(),false);
assert.equal(context.BK.world.fingerprint(context.BK.main.state), fingerprint, 'Audio leaves simulation untouched');
console.log('Audio smoke tests passed (lazy unlock, voices, ambient, seeded birds, mute, isolation).');
