/* Synthesised presentation audio; its RNG never touches the simulation. */
(function (BK) {
  'use strict';
  let context, master, muted = false, ambient, timer, birdRng;
  function unlock() {
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context = new Audio();
      master = context.createGain(); master.gain.value = muted ? 0 : 0.65;
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 18; limiter.ratio.value = 6;
      master.connect(limiter); limiter.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  function setMuted(value) {
    muted = !!value;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.65, context.currentTime, 0.025);
  }
  function tone(frequency, end, duration, gain = 0.035, delay = 0, type = 'sine') {
    if (!context) return;
    const t = context.currentTime + delay, osc = context.createOscillator(), envelope = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(end, t + duration);
    envelope.gain.setValueAtTime(0, t); envelope.gain.linearRampToValueAtTime(gain, t + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(envelope); envelope.connect(master);
    osc.onended = () => { osc.disconnect(); envelope.disconnect(); };
    osc.start(t); osc.stop(t + duration + 0.01);
  }
  function noise(duration, frequency, gain) {
    if (!context) return;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0), rng = BK.random.create('bloomkeeper-noise');
    for (let i = 0; i < data.length; i++) data[i] = BK.random.range(rng, -1, 1);
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    const t = context.currentTime;
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(frequency, t);
    filter.frequency.exponentialRampToValueAtTime(frequency * 0.4, t + duration);
    envelope.gain.setValueAtTime(0, t); envelope.gain.linearRampToValueAtTime(gain, t + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(t); source.stop(t + duration);
  }
  function phrase(notes, spacing, duration, gain = 0.03) {
    notes.forEach((f, i) => tone(f, f, duration, gain, i * spacing));
  }
  function stopAmbient() {
    if (timer !== undefined) { window.clearTimeout(timer); timer = undefined; }
    if (!ambient) return;
    const old = ambient; ambient = null;
    const t = context.currentTime;
    old.gain.gain.cancelScheduledValues(t); old.gain.gain.setTargetAtTime(0, t, 0.1);
    old.oscs.forEach(osc => { osc.onended = () => { osc.disconnect(); old.filter.disconnect(); old.gain.disconnect(); }; osc.stop(t + 0.6); });
  }
  function startAmbient(wave = 0, seed = 2026) {
    if (!context) return;
    // Two voices outline a minor chord; wave changes glide to its next inversion.
    const chords = [[130.81,155.56],[103.83,155.56],[116.54,138.59],[98,146.83]];
    const chord = chords[Math.max(0, wave - 1) % chords.length], t = context.currentTime;
    if (ambient) {
      ambient.oscs.forEach((osc, i) => osc.frequency.setTargetAtTime(chord[i], t, 1.5));
      return;
    }
    const filter = context.createBiquadFilter(), gain = context.createGain();
    filter.type = 'lowpass'; filter.frequency.value = 420;
    gain.gain.setValueAtTime(0, t); gain.gain.setTargetAtTime(0.016, t, 1);
    filter.connect(gain); gain.connect(master);
    const oscs = chord.map((f, i) => {
      const osc = context.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f;
      osc.detune.value = i ? 5 : -5; osc.connect(filter); osc.start(); return osc;
    });
    ambient = { oscs, filter, gain }; birdRng = BK.random.create(String(seed) + ':night-birds');
    function bird() {
      if (!ambient) return;
      const f = BK.random.range(birdRng, 1500, 2100);
      tone(f, f * 1.22, 0.14, 0.008); tone(f * 1.1, f * 0.85, 0.23, 0.006, 0.2);
      timer = window.setTimeout(bird, BK.random.range(birdRng, 8000, 16000));
    }
    timer = window.setTimeout(bird, BK.random.range(birdRng, 6000, 12000));
  }
  BK.audio = {
    unlock, setMuted, isMuted: () => muted, startAmbient, stopAmbient,
    dewBoltThrow: () => tone(620, 220, 0.12, 0.025),
    boltHit: () => tone(1800, 700, 0.035, 0.018),
    mothDeath: () => noise(0.18, 2200, 0.045),
    nectarPickup: (fill = 0) => { const f = 740 * (1 + Math.max(0, Math.min(1, fill)) * 0.12); phrase([f, f * 1.25], 0.085, 0.25); },
    bloomGrown: () => phrase([523.25, 659.25, 783.99, 1046.5], 0.09, 0.4),
    keeperHurt: () => tone(110, 42, 0.25, 0.065),
    dash: () => noise(0.25, 1100, 0.055),
    waveClear: () => phrase([392, 493.88, 587.33], 0.12, 0.4),
    win: () => phrase([523.25, 659.25, 783.99, 659.25, 1046.5], 0.18, 0.65),
    lose: () => phrase([392, 311.13, 261.63, 196], 0.32, 0.65, 0.035)
  };
})(globalThis.BK = globalThis.BK || {});
