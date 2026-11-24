// Sintetizador procedural Lofi (Rhodes cálido + ritmo suave + textura vinilo) 100% Web Audio API
class LofiPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private timerId: number | null = null;
  private step = 0;
  public playing = false;

  // Progresión cálida de jazz-lofi: Fmaj7 -> Em7 -> Dm7 -> Cmaj7
  private chords = [
    [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
    [164.81, 196.0, 246.94, 293.66, 392.0], // Em7
    [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
    [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
  ];

  public toggle(): boolean {
    if (this.playing) this.stop();
    else this.start();
    return this.playing;
  }

  public start(): void {
    if (this.playing || typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1450;
      this.filter.Q.value = 0.7;

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.001;
      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    this.master!.gain.cancelScheduledValues(now);
    this.master!.gain.setValueAtTime(Math.max(0.001, this.master!.gain.value), now);
    this.master!.gain.exponentialRampToValueAtTime(0.24, now + 0.6);

    this.startVinylCrackle();
    this.playing = true;
    this.step = 0;

    // 75 BPM -> semicorchea = 200ms, corchea = 400ms
    this.tick();
    this.timerId = window.setInterval(() => this.tick(), 400);
  }

  public stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.noiseNode) {
      try {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
      } catch {}
      this.noiseNode = null;
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.15);
    }
  }

  private startVinylCrackle(): void {
    if (!this.ctx || !this.master) return;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * 3, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const hiss = (Math.random() * 2 - 1) * 0.012;
      const pop = Math.random() > 0.9996 ? (Math.random() * 2 - 1) * 0.18 : 0;
      data[i] = hiss + pop;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.22;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.master);
    src.start();
    this.noiseNode = src;
  }

  private tick(): void {
    if (!this.ctx || !this.filter || !this.playing) return;
    const now = this.ctx.currentTime;
    const barStep = this.step % 8; // 8 corcheas por compás
    const chordIdx = Math.floor(this.step / 8) % this.chords.length;

    // Acorde Rhodes cálido al inicio de cada compás (con ligero rasgueo humano)
    if (barStep === 0) {
      const chord = this.chords[chordIdx];
      chord.forEach((freq, i) => {
        this.playRhodesNote(freq, now + i * 0.032, 3.0, 0.085);
      });
    }

    // Nota melódica suave ocasional
    if (barStep === 3 || barStep === 6) {
      const chord = this.chords[chordIdx];
      const note = chord[(barStep + chordIdx) % chord.length] * 2;
      this.playRhodesNote(note, now + 0.02, 0.9, 0.035);
    }

    // Bombo suave lofi (tiempos 0 y 5)
    if (barStep === 0 || barStep === 5) {
      this.playKick(now);
    }
    // Caja apagada (tiempos 2 y 6)
    if (barStep === 2 || barStep === 6) {
      this.playSnare(now);
    }
    // Hi-hat sutil
    if (barStep % 2 === 1) {
      this.playHat(now);
    }

    this.step++;
  }

  private playRhodesNote(freq: number, start: number, dur: number, amp: number): void {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';
    // Leve desafinación analógica "tape wobble"
    const detune = (Math.random() - 0.5) * 6;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    osc2.frequency.setValueAtTime(freq * 2, start);

    const g2 = this.ctx.createGain();
    g2.gain.value = 0.14;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(amp, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + dur);

    osc.connect(gain);
    osc2.connect(g2);
    g2.connect(gain);
    gain.connect(this.filter);

    osc.start(start);
    osc2.start(start);
    osc.stop(start + dur + 0.05);
    osc2.stop(start + dur + 0.05);
  }

  private playKick(start: number): void {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(105, start);
    osc.frequency.exponentialRampToValueAtTime(38, start + 0.14);
    gain.gain.setValueAtTime(0.28, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
    osc.connect(gain);
    gain.connect(this.filter);
    osc.start(start);
    osc.stop(start + 0.25);
  }

  private playSnare(start: number): void {
    if (!this.ctx || !this.filter) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.11;
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.filter);
    src.start(start);
  }

  private playHat(start: number): void {
    if (!this.ctx || !this.filter) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4500;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.045;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.filter);
    src.start(start);
  }
}

export const lofi = new LofiPlayer();
