// Sintetizador procedural Lofi con 6 pistas aleatorias, compresor dinámico y controles de reproducción

export interface LofiTrack {
  id: string;
  title: string;
  bpm: number;
  chords: number[][];
  bassPattern: number[];
  melodyScale: number[];
  drumPattern: 'boom-bap' | 'chill-swing' | 'rain-beat' | 'night-groove';
  filterFreq: number;
  timbre: 'rhodes' | 'pad' | 'kalimba';
}

export interface LofiState {
  playing: boolean;
  paused: boolean;
  trackTitle: string;
  trackIndex: number;
  totalTracks: number;
}

const LOFI_TRACKS: LofiTrack[] = [
  {
    id: 'lluvia-taller',
    title: 'Lluvia en el Taller',
    bpm: 74,
    chords: [
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [164.81, 196.0, 246.94, 293.66, 392.0], // Em7
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
    ],
    bassPattern: [0, -1, 0, -1, 2, -1, 0, 1],
    melodyScale: [523.25, 587.33, 659.25, 783.99, 880.0],
    drumPattern: 'boom-bap',
    filterFreq: 1850,
    timbre: 'rhodes',
  },
  {
    id: 'cafe-protoboard',
    title: 'Café y Protoboard',
    bpm: 78,
    chords: [
      [196.0, 246.94, 293.66, 369.99, 440.0], // Gmaj9
      [164.81, 196.0, 246.94, 293.66, 369.99], // Em9
      [130.81, 164.81, 196.0, 246.94, 329.63], // Cmaj7
      [146.83, 220.0, 261.63, 329.63, 392.0], // D9sus4
    ],
    bassPattern: [0, -1, -1, 0, 1, -1, 2, -1],
    melodyScale: [587.33, 659.25, 739.99, 783.99, 880.0],
    drumPattern: 'chill-swing',
    filterFreq: 2100,
    timbre: 'kalimba',
  },
  {
    id: 'noche-soldadura',
    title: 'Noche de Soldadura',
    bpm: 70,
    chords: [
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [196.0, 246.94, 293.66, 349.23, 440.0], // G13
      [130.81, 164.81, 196.0, 246.94, 293.66], // Cmaj9
      [110.0, 164.81, 196.0, 246.94, 329.63], // Am9
    ],
    bassPattern: [0, -1, 1, -1, 0, -1, 2, -1],
    melodyScale: [440.0, 523.25, 587.33, 659.25, 783.99],
    drumPattern: 'rain-beat',
    filterFreq: 1650,
    timbre: 'pad',
  },
  {
    id: 'atardecer-geogo',
    title: 'Atardecer Geogo',
    bpm: 82,
    chords: [
      [155.56, 196.0, 233.08, 293.66, 349.23], // Ebmaj9
      [130.81, 155.56, 196.0, 233.08, 293.66], // Cm9
      [174.61, 207.65, 261.63, 311.13, 392.0], // Fm9
      [116.54, 174.61, 207.65, 261.63, 349.23], // Bb13
    ],
    bassPattern: [0, -1, 0, 2, -1, 1, 0, -1],
    melodyScale: [466.16, 523.25, 587.33, 698.46, 783.99],
    drumPattern: 'night-groove',
    filterFreq: 2050,
    timbre: 'rhodes',
  },
  {
    id: 'pulso-pwm',
    title: 'Pulso PWM 76',
    bpm: 76,
    chords: [
      [110.0, 164.81, 196.0, 246.94, 329.63], // Am9
      [146.83, 174.61, 220.0, 261.63, 329.63], // Dm9
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [164.81, 196.0, 246.94, 329.63, 392.0], // Em7
    ],
    bassPattern: [0, 0, -1, 1, 0, -1, 2, -1],
    melodyScale: [440.0, 493.88, 523.25, 659.25, 783.99],
    drumPattern: 'boom-bap',
    filterFreq: 1950,
    timbre: 'kalimba',
  },
  {
    id: 'codigo-sereno',
    title: 'Código Sereno',
    bpm: 72,
    chords: [
      [130.81, 164.81, 196.0, 246.94, 329.63], // Cmaj7
      [110.0, 146.83, 174.61, 220.0, 261.63], // Am11
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9
      [196.0, 246.94, 293.66, 349.23, 440.0], // G13
    ],
    bassPattern: [0, -1, -1, 2, 0, -1, 1, -1],
    melodyScale: [523.25, 659.25, 783.99, 880.0, 987.77],
    drumPattern: 'chill-swing',
    filterFreq: 1780,
    timbre: 'pad',
  },
];

type LofiListener = (state: LofiState) => void;

class LofiPlayer {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private timerId: number | null = null;
  private step = 0;
  private trackIndex = 0;
  private lastRandomIndex = -1;
  private listeners = new Set<LofiListener>();

  public playing = false;
  public paused = false;

  public getState(): LofiState {
    const track = LOFI_TRACKS[this.trackIndex] ?? LOFI_TRACKS[0];
    return {
      playing: this.playing,
      paused: this.paused,
      trackTitle: track.title,
      trackIndex: this.trackIndex,
      totalTracks: LOFI_TRACKS.length,
    };
  }

  public subscribe(listener: LofiListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  private ensureAudioGraph(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 1850;
      this.filter.Q.value = 0.7;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.15;

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.001;

      this.filter.connect(this.compressor);
      this.compressor.connect(this.master);
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private pickRandomTrack(): number {
    if (LOFI_TRACKS.length <= 1) return 0;
    let idx = Math.floor(Math.random() * LOFI_TRACKS.length);
    if (idx === this.lastRandomIndex) {
      idx = (idx + 1 + Math.floor(Math.random() * (LOFI_TRACKS.length - 1))) % LOFI_TRACKS.length;
    }
    this.lastRandomIndex = idx;
    return idx;
  }

  public toggle(): boolean {
    if (this.playing) {
      this.stop();
    } else if (this.paused) {
      this.resume();
    } else {
      this.start();
    }
    return this.playing;
  }

  public start(chosenIndex?: number): void {
    if (!this.ensureAudioGraph() || !this.ctx || !this.master || !this.filter) return;

    this.trackIndex = chosenIndex !== undefined ? ((chosenIndex % LOFI_TRACKS.length) + LOFI_TRACKS.length) % LOFI_TRACKS.length : this.pickRandomTrack();
    const track = LOFI_TRACKS[this.trackIndex];
    this.filter.frequency.setTargetAtTime(track.filterFreq, this.ctx.currentTime, 0.15);

    this.clearTimersAndNoise();

    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(0.62, now + 0.45);

    this.startVinylCrackle();
    this.playing = true;
    this.paused = false;
    this.step = 0;

    const eighthMs = Math.round((60 / track.bpm / 2) * 1000);
    this.tick();
    this.timerId = window.setInterval(() => this.tick(), eighthMs);
    this.emit();
  }

  public pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.paused = true;
    this.clearTimersAndNoise();
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.12);
    }
    this.emit();
  }

  public resume(): void {
    if (this.playing) return;
    if (!this.paused) {
      this.start();
      return;
    }
    if (!this.ensureAudioGraph() || !this.ctx || !this.master || !this.filter) return;
    const track = LOFI_TRACKS[this.trackIndex];
    this.filter.frequency.setTargetAtTime(track.filterFreq, this.ctx.currentTime, 0.15);

    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(Math.max(0.001, this.master.gain.value), now);
    this.master.gain.exponentialRampToValueAtTime(0.62, now + 0.35);

    this.startVinylCrackle();
    this.playing = true;
    this.paused = false;

    const eighthMs = Math.round((60 / track.bpm / 2) * 1000);
    this.tick();
    this.timerId = window.setInterval(() => this.tick(), eighthMs);
    this.emit();
  }

  public next(): void {
    this.start(this.trackIndex + 1);
  }

  public prev(): void {
    this.start(this.trackIndex - 1);
  }

  public stop(): void {
    if (!this.playing && !this.paused) return;
    this.playing = false;
    this.paused = false;
    this.clearTimersAndNoise();
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.15);
    }
    this.emit();
  }

  private clearTimersAndNoise(): void {
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
  }

  private startVinylCrackle(): void {
    if (!this.ctx || !this.master) return;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * 3, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const hiss = (Math.random() * 2 - 1) * 0.01;
      const pop = Math.random() > 0.9995 ? (Math.random() * 2 - 1) * 0.16 : 0;
      data[i] = hiss + pop;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 1800;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.18;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.master);
    src.start();
    this.noiseNode = src;
  }

  private tick(): void {
    if (!this.ctx || !this.filter || !this.playing) return;
    const now = this.ctx.currentTime;
    const track = LOFI_TRACKS[this.trackIndex];
    const barStep = this.step % 8;
    const chordIdx = Math.floor(this.step / 8) % track.chords.length;
    const chord = track.chords[chordIdx];

    if (barStep === 0) {
      chord.forEach((freq, i) => {
        this.playChordVoice(freq, now + i * 0.032, 3.1, 0.15, track.timbre);
      });
    }

    // Bajo cálido
    const bassDegree = track.bassPattern[barStep];
    if (bassDegree !== undefined && bassDegree >= 0) {
      const bassFreq = (chord[bassDegree % chord.length] ?? chord[0]) * 0.5;
      this.playBass(bassFreq, now, 0.45, 0.24);
    }

    // Notas melódicas de ambiente
    if (barStep === 3 || barStep === 6 || (track.timbre === 'kalimba' && barStep === 4)) {
      const note = track.melodyScale[(this.step + chordIdx) % track.melodyScale.length];
      this.playChordVoice(note, now + 0.02, 0.85, 0.075, track.timbre);
    }

    // Batería según estilo de pista
    if (track.drumPattern === 'boom-bap') {
      if (barStep === 0 || barStep === 5) this.playKick(now);
      if (barStep === 2 || barStep === 6) this.playSnare(now);
      if (barStep % 2 === 1) this.playHat(now);
    } else if (track.drumPattern === 'chill-swing') {
      if (barStep === 0 || barStep === 3) this.playKick(now);
      if (barStep === 2 || barStep === 6) this.playSnare(now);
      if (barStep % 2 === 1) this.playHat(now + 0.025);
    } else if (track.drumPattern === 'rain-beat') {
      if (barStep === 0 || barStep === 4) this.playKick(now);
      if (barStep === 2 || barStep === 7) this.playSnare(now);
      if (barStep % 2 === 0 || barStep === 5) this.playHat(now);
    } else {
      if (barStep === 0 || barStep === 3 || barStep === 5) this.playKick(now);
      if (barStep === 2 || barStep === 6) this.playSnare(now);
      this.playHat(now);
    }

    this.step++;
  }

  private playChordVoice(
    freq: number,
    start: number,
    dur: number,
    amp: number,
    timbre: LofiTrack['timbre']
  ): void {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = timbre === 'pad' ? 'triangle' : 'sine';
    osc2.type = timbre === 'kalimba' ? 'sine' : 'triangle';

    const detune = (Math.random() - 0.5) * 6;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.setValueAtTime(detune, start);
    osc2.frequency.setValueAtTime(timbre === 'kalimba' ? freq * 3 : freq * 2, start);

    const g2 = this.ctx.createGain();
    g2.gain.value = timbre === 'kalimba' ? 0.1 : 0.16;

    const attack = timbre === 'pad' ? 0.12 : timbre === 'kalimba' ? 0.012 : 0.035;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(amp, start + attack);
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

  private playBass(freq: number, start: number, dur: number, amp: number): void {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(amp, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(this.filter);
    osc.start(start);
    osc.stop(start + dur + 0.04);
  }

  private playKick(start: number): void {
    if (!this.ctx || !this.filter) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(112, start);
    osc.frequency.exponentialRampToValueAtTime(40, start + 0.14);
    gain.gain.setValueAtTime(0.52, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    osc.connect(gain);
    gain.connect(this.filter);
    osc.start(start);
    osc.stop(start + 0.27);
  }

  private playSnare(start: number): void {
    if (!this.ctx || !this.filter) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.13);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1150;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.24;
    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.filter);
    src.start(start);
  }

  private playHat(start: number): void {
    if (!this.ctx || !this.filter) return;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.045);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4200;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.1;
    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.filter);
    src.start(start);
  }
}

export const lofi = new LofiPlayer();
