// Reproductor Lofi conectado a las pistas MP3 reales ubicadas en public/music/

export interface LofiTrack {
  id: string;
  title: string;
  file: string;
}

export interface LofiState {
  playing: boolean;
  paused: boolean;
  trackTitle: string;
  trackIndex: number;
  totalTracks: number;
}

const LOFI_TRACKS: LofiTrack[] = [
  { id: 'dusty-focus', title: 'Dusty Focus', file: 'Dusty Focus.mp3' },
  { id: 'dusty-groove', title: 'Dusty Groove Study Session', file: 'Dusty Groove Study Session.mp3' },
  { id: 'half-time-focus', title: 'Half-Time Focus', file: 'Half-Time Focus.mp3' },
  { id: 'study-groove', title: 'Study Groove', file: 'Study Groove.mp3' },
  { id: 'warm-rhodes-groove', title: 'Warm Rhodes Groove', file: 'Warm Rhodes Groove.mp3' },
];

type LofiListener = (state: LofiState) => void;

class LofiPlayer {
  private audio: HTMLAudioElement | null = null;
  private loadedTrackIndex = -1;
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

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = 0.78;
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => {
        if (this.playing) this.next();
      });
    }
    return this.audio;
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
    const el = this.ensureAudio();
    if (!el) return;

    this.trackIndex =
      chosenIndex !== undefined
        ? ((chosenIndex % LOFI_TRACKS.length) + LOFI_TRACKS.length) % LOFI_TRACKS.length
        : this.pickRandomTrack();

    const track = LOFI_TRACKS[this.trackIndex];
    const url = `./music/${encodeURIComponent(track.file)}`;
    if (this.loadedTrackIndex !== this.trackIndex) {
      el.src = url;
      this.loadedTrackIndex = this.trackIndex;
    }
    el.currentTime = 0;

    this.playing = true;
    this.paused = false;
    el.play().catch(() => {
      this.playing = false;
      this.emit();
    });
    this.emit();
  }

  public pause(): void {
    if (!this.playing) return;
    this.audio?.pause();
    this.playing = false;
    this.paused = true;
    this.emit();
  }

  public resume(): void {
    if (this.playing) return;
    if (!this.paused || !this.audio || this.loadedTrackIndex < 0) {
      this.start();
      return;
    }
    this.playing = true;
    this.paused = false;
    this.audio.play().catch(() => {
      this.playing = false;
      this.emit();
    });
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
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch {}
    }
    this.playing = false;
    this.paused = false;
    this.emit();
  }
}

export const lofi = new LofiPlayer();
