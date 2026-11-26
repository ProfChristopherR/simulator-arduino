// Reproductor Lofi conectado a las pistas MP3 reales ubicadas en public/music/ con persistencia entre páginas

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

interface PersistedLofiSession {
  trackIndex: number;
  currentTime: number;
  playing: boolean;
  paused: boolean;
  updatedAt: number;
}

const LOFI_STORAGE_KEY = 'geogo_lofi_session_v1';

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
  private lastSaveAt = 0;
  private lifecycleBound = false;
  private pendingSeek: number | null = null;
  private unlockBound = false;

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
    this.saveSession();
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }

  private saveSession(): void {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const payload: PersistedLofiSession = {
        trackIndex: this.trackIndex,
        currentTime: this.audio ? this.audio.currentTime || 0 : 0,
        playing: this.playing,
        paused: this.paused,
        updatedAt: Date.now(),
      };
      sessionStorage.setItem(LOFI_STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }

  private bindLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;
    const flush = () => this.saveSession();
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  }

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    this.bindLifecycle();
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = 0.78;
      this.audio.preload = 'auto';
      this.audio.addEventListener('ended', () => {
        if (this.playing) this.next();
      });
      this.audio.addEventListener('loadedmetadata', () => {
        if (this.pendingSeek !== null && this.audio) {
          const dur = this.audio.duration;
          const pos = Number.isFinite(dur) && dur > 1 ? this.pendingSeek % dur : this.pendingSeek;
          try {
            this.audio.currentTime = Math.max(0, pos);
          } catch {}
          this.pendingSeek = null;
        }
      });
      this.audio.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - this.lastSaveAt > 400) {
          this.lastSaveAt = now;
          this.saveSession();
        }
      });
    }
    return this.audio;
  }

  private scheduleAutoplayUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      this.unlockBound = false;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      if (this.paused) {
        this.resume();
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  public restoreFromSession(): void {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const raw = sessionStorage.getItem(LOFI_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PersistedLofiSession>;
      if (!saved.playing && !saved.paused) return;
      const ageMs = Date.now() - (saved.updatedAt ?? 0);
      if (ageMs > 5 * 60 * 1000) return;

      const el = this.ensureAudio();
      if (!el) return;

      const safeIdx = ((Number(saved.trackIndex) || 0) % LOFI_TRACKS.length + LOFI_TRACKS.length) % LOFI_TRACKS.length;
      this.trackIndex = safeIdx;
      const track = LOFI_TRACKS[safeIdx];
      el.src = `./music/${encodeURIComponent(track.file)}`;
      this.loadedTrackIndex = safeIdx;

      const elapsedSec = saved.playing ? Math.max(0, ageMs / 1000) : 0;
      const seekSec = (Number(saved.currentTime) || 0) + elapsedSec;
      this.pendingSeek = seekSec;
      try {
        el.currentTime = seekSec;
      } catch {}

      if (saved.playing) {
        this.playing = true;
        this.paused = false;
        this.emit();
        el.play().catch(() => {
          this.playing = false;
          this.paused = true;
          this.emit();
          this.scheduleAutoplayUnlock();
        });
      } else {
        this.playing = false;
        this.paused = true;
        this.emit();
      }
    } catch {}
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
    this.pendingSeek = null;
    el.currentTime = 0;

    this.playing = true;
    this.paused = false;
    el.play().catch(() => {
      this.playing = false;
      this.paused = true;
      this.emit();
      this.scheduleAutoplayUnlock();
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
      this.paused = true;
      this.emit();
      this.scheduleAutoplayUnlock();
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
