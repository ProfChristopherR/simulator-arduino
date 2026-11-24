class AudioEngine {
  private ctx: AudioContext | null = null;
  private toneOsc: OscillatorNode | null = null;
  private toneGain: GainNode | null = null;
  private toneTimer: ReturnType<typeof setTimeout> | null = null;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (!val) this.stopTone();
  }

  /** Clic mecánico seco de microinterruptor (ruido filtrado sin pitido tonal) */
  public playSwitchClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const len = Math.max(128, Math.floor(ctx.sampleRate * 0.012));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 1.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  /** Sonido breve y grave de encaje físico en protoboard o inserción de cable */
  public playSnapClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(82, ctx.currentTime + 0.024);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.026);
  }

  public playClick(freq = 620, durationMs = 45): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.055, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  public playSuccess(): void {
    this.playClick(523.25, 90);
    setTimeout(() => this.playClick(659.25, 110), 80);
  }

  public playError(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 180;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  public playTone(freq: number, durationMs?: number): void {
    const ctx = this.ensureContext();
    if (!ctx || freq <= 0) {
      this.stopTone();
      return;
    }
    if (this.toneTimer) {
      clearTimeout(this.toneTimer);
      this.toneTimer = null;
    }
    if (!this.toneOsc) {
      this.toneOsc = ctx.createOscillator();
      this.toneGain = ctx.createGain();
      this.toneOsc.type = 'square';
      this.toneGain.gain.value = 0.038;
      this.toneOsc.connect(this.toneGain);
      this.toneGain.connect(ctx.destination);
      this.toneOsc.start();
    }
    this.toneOsc.frequency.setValueAtTime(Math.max(40, Math.min(8000, freq)), ctx.currentTime);
    if (durationMs && durationMs > 0) {
      this.toneTimer = setTimeout(() => this.stopTone(), durationMs);
    }
  }

  public stopTone(): void {
    if (this.toneTimer) {
      clearTimeout(this.toneTimer);
      this.toneTimer = null;
    }
    if (this.toneOsc) {
      try {
        this.toneOsc.stop();
        this.toneOsc.disconnect();
      } catch {}
      this.toneOsc = null;
    }
    if (this.toneGain) {
      try {
        this.toneGain.disconnect();
      } catch {}
      this.toneGain = null;
    }
  }
}

export const audio = new AudioEngine();
