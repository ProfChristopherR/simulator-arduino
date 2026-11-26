import {
  Cpu,
  RotateCw,
  RotateCcw,
  Tag,
  Crosshair,
  Wrench,
  Compass,
  ShieldCheck,
  Download,
  Play,
  Square,
  Sparkles,
  Scissors,
  Eye,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  CheckCircle2,
  Music,
  Move,
  Trash2,
  SlidersHorizontal,
  PackagePlus,
  Save,
  Upload,
  SkipBack,
  SkipForward,
  Pause,
  Search,
  BookOpen,
  Lock,
  Unlock,
  Library,
  Plus,
  RefreshCw,
  Zap,
  Home,
  X,
  Menu,
  Layers,
  createElement,
  type IconNode,
} from 'lucide';

const ICONS: Record<string, IconNode> = {
  cpu: Cpu,
  'rotate-cw': RotateCw,
  'rotate-ccw': RotateCcw,
  tag: Tag,
  crosshair: Crosshair,
  wrench: Wrench,
  compass: Compass,
  'shield-check': ShieldCheck,
  download: Download,
  play: Play,
  square: Square,
  sparkles: Sparkles,
  scissors: Scissors,
  eye: Eye,
  'volume-2': Volume2,
  'volume-x': VolumeX,
  'maximize-2': Maximize2,
  'minimize-2': Minimize2,
  copy: Copy,
  check: Check,
  'check-circle': CheckCircle2,
  music: Music,
  move: Move,
  'trash-2': Trash2,
  sliders: SlidersHorizontal,
  'package-plus': PackagePlus,
  save: Save,
  upload: Upload,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  pause: Pause,
  search: Search,
  'book-open': BookOpen,
  lock: Lock,
  unlock: Unlock,
  library: Library,
  plus: Plus,
  'refresh-cw': RefreshCw,
  zap: Zap,
  home: Home,
  x: X,
  menu: Menu,
  layers: Layers,
};

export function setSlotIcon(slot: Element, name: string): void {
  const def = ICONS[name];
  if (!def) return;
  slot.innerHTML = '';
  const svg = createElement(def);
  svg.setAttribute('aria-hidden', 'true');
  slot.appendChild(svg);
}

export function hydrateIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const name = el.dataset.icon;
    if (name) setSlotIcon(el, name);
  });
}
