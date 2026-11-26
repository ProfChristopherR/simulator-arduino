import type { BoardSpec, ComponentType, DiagnosticMessage, PlacedComponent, WireDef } from '../types';
import { getCatalogItem } from './components/catalog';

export interface NetlistAnalysis {
  diagnostics: DiagnosticMessage[];
  hasShortCircuit: boolean;
  hasVoltageDanger: boolean;
  /** Maps any endpoint key to its electrical net id */
  netOf: (endpoint: string) => string;
  /** Checks if two endpoints are electrically connected (directly or through breadboard/wire) */
  areConnected: (a: string, b: string) => boolean;
  /** Returns board pin id connected to a component pin (traversing wires, breadboard, resistors, and level shifter) */
  findBoardSignalPin: (compUid: string, pinId: string) => {
    boardPinId: string | null;
    viaResistorOhms: number;
    viaLevelShifter: boolean;
  };
  /** Checks if a component power/gnd pin reaches board 5V/3.3V or GND */
  checkPowerSupply: (compUid: string, vccPinId?: string, gndPinId?: string) => {
    vccVoltage: number | null;
    hasGnd: boolean;
  };
  /** Checks if an I2C peripheral reaches the active board SDA and SCL pins */
  checkI2CConnection: (compUid: string, sdaPinId?: string, sclPinId?: string) => {
    connected: boolean;
    viaLevelShifter: boolean;
  };
}

export const THROUGH_HOLE_TYPES: ReadonlySet<ComponentType> = new Set([
  'resistor',
  'ldr',
  'capacitor',
  'diode',
  'transistor-npn',
  'led',
  'button',
  'slide-switch',
  'buzzer',
  'rgb-led',
  'ir-receiver',
]);

/** Calcula el mapa exacto pin -> orificio de protoboard para componentes through-hole encajados */
export function computeSnappedPinsForHole(type: ComponentType, snapHole: string): Record<string, string> {
  const m = /^([a-j])(\d+)$/.exec(snapHole);
  if (!m) return {};
  const row = m[1];
  const col = Number(m[2]);

  const offsets: Record<string, Array<[string, number]>> = {
    resistor: [['P1', 0], ['P2', 4]],
    ldr: [['P1', 0], ['P2', 2]],
    capacitor: [['POS', 0], ['NEG', 1]],
    diode: [['A', 0], ['K', 3]],
    'transistor-npn': [['E', 0], ['B', 1], ['C', 2]],
    led: [['A', 0], ['K', 1]],
    button: [['A', 0], ['B', 2]],
    'slide-switch': [['C1', 0], ['COM', 1], ['C2', 2]],
    buzzer: [['SIG', 0], ['GND', 2]],
    'rgb-led': [['R', 0], ['K', 1], ['G', 2], ['B', 3]],
    'ir-receiver': [['OUT', 0], ['GND', 1], ['VCC', 2]],
  };
  const spec = offsets[type];
  if (!spec) return {};

  const out: Record<string, string> = {};
  for (const [pinId, delta] of spec) {
    const targetCol = col + delta;
    if (targetCol >= 1 && targetCol <= 30) {
      out[pinId] = `${row}${targetCol}`;
    }
  }
  return out;
}

function breadboardTrackOf(endpoint: string): string | null {
  if (!endpoint.startsWith('bb:')) return null;
  const hole = endpoint.slice(3);
  if (hole.startsWith('top+')) return 'bb:track:rail_top_plus';
  if (hole.startsWith('top-')) return 'bb:track:rail_top_minus';
  if (hole.startsWith('bot+')) return 'bb:track:rail_bot_plus';
  if (hole.startsWith('bot-')) return 'bb:track:rail_bot_minus';
  const m = /^([a-j])(\d+)$/.exec(hole);
  if (!m) return null;
  const row = m[1];
  const col = m[2];
  const half = ['a', 'b', 'c', 'd', 'e'].includes(row) ? 'top' : 'bot';
  return `bb:track:${half}_${col}`;
}

function shieldTrackOf(endpoint: string): string | null {
  if (!endpoint.startsWith('shield:')) return null;
  const parts = endpoint.split(':');
  if (parts.length < 3) return null;
  const [, kind, key] = parts;
  if (kind === 'S') return `board:${key}`;
  if (kind === 'V3') return 'board:3V3';
  if (kind === 'V5') return 'board:VIN';
  if (kind === 'G') return 'board:GND_1';
  return null;
}

export function analyzeNetlist(
  board: BoardSpec,
  components: PlacedComponent[],
  wires: WireDef[]
): NetlistAnalysis {
  const parent = new Map<string, string>();

  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let cur = x;
    while (cur !== root) {
      const nxt = parent.get(cur)!;
      parent.set(cur, root);
      cur = nxt;
    }
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const registerEndpoint = (ep: string) => {
    find(ep);
    const tr = breadboardTrackOf(ep);
    if (tr) union(ep, tr);
    const sh = shieldTrackOf(ep);
    if (sh) union(ep, sh);
  };

  // Board pins
  for (const p of board.pins) {
    registerEndpoint(`board:${p.id}`);
  }
  // Unify all GND pins on the board as common ground reference
  const gndBoardPins = board.pins.filter((p) => p.category === 'gnd').map((p) => `board:${p.id}`);
  for (let i = 1; i < gndBoardPins.length; i++) {
    union(gndBoardPins[0], gndBoardPins[i]);
  }

  // Component pins & breadboard mounts
  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    for (const p of item.pins) {
      const ep = `comp:${comp.uid}:${p.id}`;
      registerEndpoint(ep);
      const bbHole = comp.breadboardMount?.pins[p.id];
      if (bbHole) {
        const bbEp = `bb:${bbHole}`;
        registerEndpoint(bbEp);
        union(ep, bbEp);
      }
    }
    // Pressed button closes A <-> B
    if (comp.type === 'button' && comp.state.pressed) {
      union(`comp:${comp.uid}:A`, `comp:${comp.uid}:B`);
    }
    // Slide switch connects COM to C1 (pos 0) or C2 (pos 1)
    if (comp.type === 'slide-switch') {
      const pos = Number(comp.state.position ?? 0);
      union(`comp:${comp.uid}:COM`, `comp:${comp.uid}:${pos === 1 ? 'C2' : 'C1'}`);
    }
    // Relay active closes COM <-> NO, idle closes COM <-> NC
    if (comp.type === 'relay-5v') {
      const active = Boolean(comp.state.active);
      union(`comp:${comp.uid}:COM`, `comp:${comp.uid}:${active ? 'NO' : 'NC'}`);
    }
    // Level Shifter common GND
    if (comp.type === 'level-shifter') {
      union(`comp:${comp.uid}:GND_H`, `comp:${comp.uid}:GND_L`);
    }
  }

  // Wires
  for (const w of wires) {
    registerEndpoint(w.from);
    registerEndpoint(w.to);
    union(w.from, w.to);
  }

  const netOf = (ep: string) => find(ep);
  const areConnected = (a: string, b: string) => find(a) === find(b);

  // Build adjacency graph for passive series elements (resistors & level-shifter channels)
  const netAdj = new Map<
    string,
    Array<{ toNet: string; kind: 'resistor' | 'shifter'; ohms?: number }>
  >();

  const addBridge = (epA: string, epB: string, kind: 'resistor' | 'shifter', ohms?: number) => {
    const nA = find(epA);
    const nB = find(epB);
    if (!netAdj.has(nA)) netAdj.set(nA, []);
    if (!netAdj.has(nB)) netAdj.set(nB, []);
    netAdj.get(nA)!.push({ toNet: nB, kind, ohms });
    netAdj.get(nB)!.push({ toNet: nA, kind, ohms });
  };

  for (const comp of components) {
    if (comp.type === 'resistor') {
      const ohms = Math.max(1, Number(comp.props?.ohms ?? 220));
      addBridge(`comp:${comp.uid}:P1`, `comp:${comp.uid}:P2`, 'resistor', ohms);
    } else if (comp.type === 'ldr') {
      const light = Math.max(0, Math.min(100, Number(comp.state?.lightPct ?? 60)));
      const ldrOhms = Math.round(500 + ((100 - light) / 100) * 45_000);
      addBridge(`comp:${comp.uid}:P1`, `comp:${comp.uid}:P2`, 'resistor', ldrOhms);
    } else if (comp.type === 'diode') {
      addBridge(`comp:${comp.uid}:A`, `comp:${comp.uid}:K`, 'resistor', 1);
    } else if (comp.type === 'level-shifter') {
      addBridge(`comp:${comp.uid}:HV1`, `comp:${comp.uid}:LV1`, 'shifter');
      addBridge(`comp:${comp.uid}:HV2`, `comp:${comp.uid}:LV2`, 'shifter');
    }
  }

  // Detect short circuits (5V or 3.3V connected to GND)
  const diagnostics: DiagnosticMessage[] = [];
  let hasShortCircuit = false;
  let hasVoltageDanger = false;

  const gndNet = gndBoardPins.length > 0 ? find(gndBoardPins[0]) : null;
  const pwr5Pins = board.pins.filter((p) => p.category === 'pwr' && p.voltage >= 4.5);
  const pwr33Pins = board.pins.filter((p) => p.category === 'pwr' && p.voltage > 2.5 && p.voltage < 4);

  if (gndNet) {
    for (const p of [...pwr5Pins, ...pwr33Pins]) {
      if (find(`board:${p.id}`) === gndNet) {
        hasShortCircuit = true;
        diagnostics.push({
          level: 'error',
          title: `Cortocircuito detectado (${p.label} conectado a GND)`,
          detail: `El pin de alimentación ${p.label} está unido directamente a tierra (GND). Retira el cable en conflicto antes de ejecutar.`,
        });
        break;
      }
    }
  }

  // Check 5V -> 3.3V direct incompatibility (without Level Shifter)
  const highVoltageNets = new Set<string>();
  for (const p of pwr5Pins) highVoltageNets.add(find(`board:${p.id}`));
  if (board.logicVoltage === 5) {
    for (const p of board.pins) {
      if (p.category === 'dig' || p.category === 'ana' || p.category === 'com') {
        highVoltageNets.add(find(`board:${p.id}`));
      }
    }
  }

  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    for (const pin of item.pins) {
      if (pin.maxVoltage && pin.maxVoltage < 4) {
        const net = find(`comp:${comp.uid}:${pin.id}`);
        if (highVoltageNets.has(net)) {
          hasVoltageDanger = true;
          diagnostics.push({
            level: 'warn',
            title: `Sobrevoltaje 5 V en ${item.name} (${pin.label})`,
            detail: `Este módulo trabaja a 3.3 V. Conéctalo al pin 3.3V y pasa las señales SDA/SCL o datos a través del módulo Level Shifter (HV ↔ LV).`,
          });
        }
      }
    }
  }

  const findBoardSignalPin: NetlistAnalysis['findBoardSignalPin'] = (compUid, pinId) => {
    const startNet = find(`comp:${compUid}:${pinId}`);
    const queue: Array<{ net: string; ohms: number; shifted: boolean }> = [
      { net: startNet, ohms: 0, shifted: false },
    ];
    const visited = new Set<string>([startNet]);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const bp of board.pins) {
        if (
          (bp.category === 'dig' || bp.category === 'ana' || bp.category === 'com') &&
          find(`board:${bp.id}`) === cur.net
        ) {
          return {
            boardPinId: bp.id,
            viaResistorOhms: cur.ohms,
            viaLevelShifter: cur.shifted,
          };
        }
      }
      for (const edge of netAdj.get(cur.net) ?? []) {
        if (!visited.has(edge.toNet)) {
          visited.add(edge.toNet);
          queue.push({
            net: edge.toNet,
            ohms: cur.ohms + (edge.ohms ?? 0),
            shifted: cur.shifted || edge.kind === 'shifter',
          });
        }
      }
    }
    return { boardPinId: null, viaResistorOhms: 0, viaLevelShifter: false };
  };

  const findPowerVoltage = (startNet: string): number | null => {
    const queue = [startNet];
    const visited = new Set([startNet]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const p of pwr5Pins) {
        if (find(`board:${p.id}`) === cur) return 5;
      }
      for (const p of pwr33Pins) {
        if (find(`board:${p.id}`) === cur) return 3.3;
      }
      for (const edge of netAdj.get(cur) ?? []) {
        if (!visited.has(edge.toNet)) {
          visited.add(edge.toNet);
          queue.push(edge.toNet);
        }
      }
    }
    return null;
  };

  const checkPowerSupply: NetlistAnalysis['checkPowerSupply'] = (
    compUid,
    vccPinId = 'VCC',
    gndPinId = 'GND'
  ) => {
    const vccVoltage = findPowerVoltage(find(`comp:${compUid}:${vccPinId}`));
    const gndCheckNet = find(`comp:${compUid}:${gndPinId}`);
    let hasGnd = gndNet !== null && gndCheckNet === gndNet;
    if (!hasGnd && gndNet) {
      for (const edge of netAdj.get(gndCheckNet) ?? []) {
        if (edge.toNet === gndNet) hasGnd = true;
      }
    }
    return { vccVoltage, hasGnd };
  };

  const checkI2CConnection: NetlistAnalysis['checkI2CConnection'] = (
    compUid,
    sdaPinId = 'SDA',
    sclPinId = 'SCL'
  ) => {
    const sdaSig = findBoardSignalPin(compUid, sdaPinId);
    const sclSig = findBoardSignalPin(compUid, sclPinId);
    const sdaPin = board.pins.find((p) => p.id === sdaSig.boardPinId);
    const sclPin = board.pins.find((p) => p.id === sclSig.boardPinId);
    return {
      connected: sdaPin?.i2c === 'SDA' && sclPin?.i2c === 'SCL',
      viaLevelShifter: sdaSig.viaLevelShifter && sclSig.viaLevelShifter,
    };
  };

  // LED & RGB LED resistor checks
  const checkLedChannel = (compUid: string, itemName: string, anodePinId: string, cathodePinId: string) => {
    const sig = findBoardSignalPin(compUid, anodePinId);
    const pwr = checkPowerSupply(compUid, anodePinId, cathodePinId);
    const anodeDirect5V = pwr5Pins.some((p) => find(`board:${p.id}`) === find(`comp:${compUid}:${anodePinId}`));
    const hasPathToGnd = pwr.hasGnd || findBoardSignalPin(compUid, cathodePinId).boardPinId !== null;

    if ((sig.boardPinId || anodeDirect5V) && hasPathToGnd) {
      let totalOhms = sig.viaResistorOhms;
      const kNet = find(`comp:${compUid}:${cathodePinId}`);
      for (const edge of netAdj.get(kNet) ?? []) {
        if (edge.kind === 'resistor') totalOhms += edge.ohms ?? 0;
      }
      if (totalOhms === 0) {
        diagnostics.push({
          level: 'warn',
          title: `${itemName} sin resistencia limitadora`,
          detail: `Conecta una resistencia de 220 Ω en serie con el LED para evitar sobrecorriente al pasarlo al circuito real.`,
        });
      }
    }
  };

  for (const comp of components) {
    const item = getCatalogItem(comp.type);
    if (comp.type === 'led') {
      checkLedChannel(comp.uid, item.name, 'A', 'K');
    } else if (comp.type === 'rgb-led') {
      for (const ch of ['R', 'G', 'B']) {
        checkLedChannel(comp.uid, `${item.name} (${ch})`, ch, 'K');
      }
    }
  }

  return {
    diagnostics,
    hasShortCircuit,
    hasVoltageDanger,
    netOf,
    areConnected,
    findBoardSignalPin,
    checkPowerSupply,
    checkI2CConnection,
  };
}
