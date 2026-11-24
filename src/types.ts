import type * as THREE from 'three';

export type BoardId = 'uno' | 'esp32';

export type PinCategory = 'pwr' | 'gnd' | 'dig' | 'ana' | 'com' | 'ctl';

export interface PinDef {
  id: string;
  label: string;
  category: PinCategory;
  voltage: number;
  localPos: [number, number, number];
  pwm?: boolean;
  analogChannel?: number;
  i2c?: 'SDA' | 'SCL';
  spi?: 'MOSI' | 'MISO' | 'SCK' | 'SS';
  uart?: 'RX' | 'TX';
  interrupt?: boolean;
  description: string;
}

export interface BoardPartDef {
  id: string;
  num: number;
  name: string;
  category: string;
  summary: string;
  localPos: [number, number, number];
  size: [number, number, number];
  quizHint: string;
}

export interface BoardSpec {
  id: BoardId;
  indexLabel: string;
  eyebrow: string;
  name: string;
  tagline: string;
  levelLabel: string;
  logicVoltage: 5 | 3.3;
  summary: string;
  clock: string;
  flash: string;
  ram: string;
  gpioSummary: string;
  priceRef: string;
  specs: Array<{ label: string; value: string }>;
  strengths: string[];
  pitfalls: string[];
  pinGroups: Array<{ title: string; body: string }>;
  firstCodeTitle: string;
  firstCode: string;
  highlights: string[];
  facts: string[];
  pins: PinDef[];
  parts: BoardPartDef[];
  build3D: (options?: { forWorkbench?: boolean }) => BuiltBoard3D;
}

export interface BuiltBoard3D {
  group: THREE.Group;
  partMeshes: Map<string, THREE.Object3D>;
  pinAnchors: Map<string, THREE.Object3D>;
  leds: {
    power?: THREE.Mesh;
    builtin?: THREE.Mesh;
    tx?: THREE.Mesh;
    rx?: THREE.Mesh;
  };
  buttons?: {
    reset?: THREE.Object3D;
  };
  setPartAssembled?: (partId: string, assembled: boolean) => void;
  highlightPart?: (partId: string | null) => void;
  tickAnimation?: (dt: number) => void;
}

// Componentes genéricos estilo Tinkercad (el valor/color se configura en el inspector)
export type ComponentType =
  | 'led'
  | 'rgb-led'
  | 'resistor'
  | 'button'
  | 'potentiometer'
  | 'buzzer'
  | 'ldr'
  | 'dht11'
  | 'ultrasonic'
  | 'servo'
  | 'lcd-i2c'
  | 'level-shifter'
  | 'bme280'
  | 'co2-sensor'
  | 'optical-encoder'
  | 'rf-pair';

export interface ComponentPinDef {
  id: string;
  label: string;
  category: PinCategory;
  localPos: [number, number, number];
  maxVoltage?: number;
  minVoltage?: number;
}

export interface PlacedComponent {
  uid: string;
  type: ComponentType;
  name: string;
  position: [number, number, number];
  rotationY: number;
  breadboardMount?: {
    pins: Record<string, string>;
  };
  /** Propiedades configurables estilo Tinkercad (ohms, color, model, maxOhms, etc.) */
  props: Record<string, number | string | boolean>;
  /** Estado dinámico en simulación (brightness, angle, pressed, tempC, etc.) */
  state: Record<string, number | boolean | string>;
}

export interface WireDef {
  id: string;
  from: string;
  to: string;
  color: string;
}

export interface DiagnosticMessage {
  level: 'error' | 'warn' | 'ok';
  title: string;
  detail: string;
}

export interface MissionStep {
  from: string;
  to: string;
  label: string;
  explanation: string;
  color: string;
}

export interface MissionDef {
  id: string;
  title: string;
  difficulty: string;
  duration: string;
  boardId: BoardId;
  description: string;
  useBreadboard: boolean;
  components: Array<{
    uid: string;
    type: ComponentType;
    position: [number, number, number];
    rotationY?: number;
    props?: Record<string, number | string | boolean>;
    /** Orificio de protoboard objetivo para encajar el primer pin (ej. "c8") */
    snapHole?: string;
    /** Nombre descriptivo para la lista de colocación paso a paso */
    label?: string;
    /** Indicación de dónde colocar la pieza en Fase 1 */
    placementHint?: string;
  }>;
  steps: MissionStep[];
  learnPoints: string[];
  code: string;
}
