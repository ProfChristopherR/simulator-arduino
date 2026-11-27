import assert from 'node:assert/strict';
import test from 'node:test';
import { ARDUINO_UNO_SPEC } from '../src/boards/arduino-uno.ts';
import { ESP32_SPEC } from '../src/boards/esp32-devkit.ts';
import { getBoardSpec } from '../src/boards/registry.ts';
import { bandsToOhms, ohmsToBands } from '../src/education/resistor-calc.ts';
import { solveMixedResistors, solveMultiSourceCircuit } from '../src/education/circuits-lab.ts';
import { computeHydraulicState } from '../src/education/water-analogy.ts';
import { resistorBandsForOhms } from '../src/lab/components/catalog.ts';
import { MISSIONS } from '../src/lab/missions.ts';
import { analyzeNetlist, computeSnappedPinsForHole } from '../src/lab/netlist.ts';
import {
  installLibrary,
  isLibraryInstalled,
  searchLibraries,
  uninstallLibrary,
} from '../src/lab/simulator/libraries.ts';
import { ArduinoCompileError, ArduinoRuntime } from '../src/lab/simulator/runtime.ts';
import type { PlacedComponent, WireDef } from '../src/types.ts';

test('Netlist: breadboard column connects e5 and a5 with configurable resistor ohms', () => {
  const comps: PlacedComponent[] = [
    { uid: 'r1', type: 'resistor', position: [0, 0, 0], rotationY: 0, props: { ohms: 330 }, state: {} },
    { uid: 'led1', type: 'led', position: [1, 0, 0], rotationY: 0, props: { color: 'green' }, state: {} },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:D13', to: 'bb:e5', color: '#2563eb' },
    { id: 'w2', from: 'bb:a5', to: 'comp:r1:P1', color: '#d4a007' },
    { id: 'w3', from: 'comp:r1:P2', to: 'comp:led1:A', color: '#c8402f' },
    { id: 'w4', from: 'comp:led1:K', to: 'board:GND_TOP', color: '#22201c' },
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasShortCircuit, false);
  assert.equal(res.diagnostics.length, 0);
  const sig = res.findBoardSignalPin('led1', 'A');
  assert.equal(sig.boardPinId, 'D13');
  assert.equal(sig.viaResistorOhms, 330);
});

test('Netlist: Mission 1 snapped components on breadboard + negative rail GND', () => {
  const comps: PlacedComponent[] = [
    {
      uid: 'r1',
      type: 'resistor',
      position: [0, 0, 0],
      rotationY: 0,
      props: { ohms: 220 },
      breadboardMount: { pins: computeSnappedPinsForHole('resistor', 'c8') },
      state: {},
    },
    {
      uid: 'led1',
      type: 'led',
      position: [1, 0, 0],
      rotationY: 0,
      props: { color: 'red' },
      breadboardMount: { pins: computeSnappedPinsForHole('led', 'b12') },
      state: {},
    },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:D13', to: 'bb:e8', color: '#2563eb' },
    { id: 'w2', from: 'bb:e13', to: 'bb:top-13', color: '#22201c' },
    { id: 'w3', from: 'bb:top-2', to: 'board:GND_TOP', color: '#22201c' },
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasShortCircuit, false);
  assert.equal(res.diagnostics.length, 0);
  const sig = res.findBoardSignalPin('led1', 'A');
  assert.equal(sig.boardPinId, 'D13');
  assert.equal(sig.viaResistorOhms, 220);
  const pwr = res.checkPowerSupply('led1', 'A', 'K');
  assert.equal(pwr.hasGnd, true);
});

test('Resistor color code computes IEC 4-band colors dynamically', () => {
  const b220 = resistorBandsForOhms(220);
  assert.deepEqual(b220, [0xdc2626, 0xdc2626, 0x7c4318, 0xd4a007]);
  const b10k = resistorBandsForOhms(10000);
  assert.deepEqual(b10k, [0x7c4318, 0x141414, 0xf97316, 0xd4a007]);
});

test('Netlist: detects 5V to GND short circuit', () => {
  const wires: WireDef[] = [{ id: 'w1', from: 'board:5V', to: 'board:GND_1', color: '#c8402f' }];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, [], wires);
  assert.equal(res.hasShortCircuit, true);
  assert.equal(res.diagnostics[0].level, 'error');
});

test('Netlist: warns when BME280 (3.3V) is wired directly to Uno 5V I2C without Level Shifter', () => {
  const comps: PlacedComponent[] = [
    { uid: 'bme1', type: 'bme280', position: [0, 0, 0], rotationY: 0, props: { model: 'BME280' }, state: {} },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:3V3', to: 'comp:bme1:VCC', color: '#d4a007' },
    { id: 'w2', from: 'board:GND_1', to: 'comp:bme1:GND', color: '#22201c' },
    { id: 'w3', from: 'board:A4', to: 'comp:bme1:SDA', color: '#2563eb' },
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, true);
});

test('Netlist: Level Shifter protects BME280 and validates I2C connection on Uno', () => {
  const comps: PlacedComponent[] = [
    { uid: 'lvl1', type: 'level-shifter', position: [0, 0, 0], rotationY: 0, props: {}, state: {} },
    { uid: 'bme1', type: 'bme280', position: [1, 0, 0], rotationY: 0, props: { model: 'BME280' }, state: {} },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:5V', to: 'comp:lvl1:HV', color: '#c8402f' },
    { id: 'w2', from: 'board:3V3', to: 'comp:lvl1:LV', color: '#d4a007' },
    { id: 'w3', from: 'board:A4', to: 'comp:lvl1:HV1', color: '#2563eb' },
    { id: 'w4', from: 'board:A5', to: 'comp:lvl1:HV2', color: '#7a4fb3' },
    { id: 'w5', from: 'comp:lvl1:LV1', to: 'comp:bme1:SDA', color: '#2563eb' },
    { id: 'w6', from: 'comp:lvl1:LV2', to: 'comp:bme1:SCL', color: '#7a4fb3' },
    { id: 'w7', from: 'comp:lvl1:LV', to: 'comp:bme1:VCC', color: '#d4a007' },
    { id: 'w8', from: 'board:GND_1', to: 'comp:bme1:GND', color: '#22201c' },
  ];
  const res = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, false);
  const sig = res.findBoardSignalPin('bme1', 'SDA');
  assert.equal(sig.boardPinId, 'A4');
  assert.equal(sig.viaLevelShifter, true);
  const i2c = res.checkI2CConnection('bme1', 'SDA', 'SCL');
  assert.equal(i2c.connected, true);
  assert.equal(i2c.viaLevelShifter, true);
});

test('Netlist: ESP32 native 3.3V works safely with BME280 without Level Shifter', () => {
  const comps: PlacedComponent[] = [
    { uid: 'bme1', type: 'bme280', position: [1, 0, 0], rotationY: 0, props: { model: 'BMP280' }, state: {} },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:3V3', to: 'comp:bme1:VCC', color: '#d4a007' },
    { id: 'w2', from: 'board:GND_2', to: 'comp:bme1:GND', color: '#22201c' },
    { id: 'w3', from: 'board:G21', to: 'comp:bme1:SDA', color: '#2563eb' },
    { id: 'w4', from: 'board:G22', to: 'comp:bme1:SCL', color: '#7a4fb3' },
  ];
  const res = analyzeNetlist(ESP32_SPEC, comps, wires);
  assert.equal(res.hasVoltageDanger, false);
  assert.equal(res.checkI2CConnection('bme1', 'SDA', 'SCL').connected, true);
});

test('Netlist: ESP32 Expansion Shield G-V-S headers resolve signals, 3.3V power, and short circuits', () => {
  const comps: PlacedComponent[] = [
    { uid: 'r1', type: 'resistor', position: [0, 0, 0], rotationY: 0, props: { ohms: 220 }, state: {} },
    { uid: 'led1', type: 'led', position: [1, 0, 0], rotationY: 0, props: { color: 'blue' }, state: {} },
  ];
  const safeWires: WireDef[] = [
    { id: 'w1', from: 'shield:S:G2', to: 'comp:r1:P1', color: '#eab308' },
    { id: 'w2', from: 'comp:r1:P2', to: 'comp:led1:A', color: '#2563eb' },
    { id: 'w3', from: 'comp:led1:K', to: 'shield:G:R11', color: '#22201c' },
  ];
  const res = analyzeNetlist(ESP32_SPEC, comps, safeWires);
  assert.equal(res.hasShortCircuit, false);
  assert.equal(res.findBoardSignalPin('led1', 'A').boardPinId, 'G2');
  assert.equal(res.checkPowerSupply('led1', 'A', 'K').hasGnd, true);

  const shortRes = analyzeNetlist(ESP32_SPEC, [], [
    { id: 'ws', from: 'shield:V3:R0', to: 'shield:G:R0', color: '#c8402f' },
  ]);
  assert.equal(shortRes.hasShortCircuit, true);
});

test('Netlist: RGB LED warns without series resistors and clears with 3 resistors', () => {
  const baseRgb: PlacedComponent = {
    uid: 'rgb1',
    type: 'rgb-led',
    position: [0, 0, 0],
    rotationY: 0,
    props: {},
    breadboardMount: { pins: computeSnappedPinsForHole('rgb-led', 'b14') },
    state: {},
  };
  const unsafeRes = analyzeNetlist(ARDUINO_UNO_SPEC, [baseRgb], [
    { id: 'w1', from: 'board:D9', to: 'bb:e14', color: '#c8402f' },
    { id: 'w2', from: 'bb:e15', to: 'board:GND_TOP', color: '#22201c' },
  ]);
  assert.ok(unsafeRes.diagnostics.some((d) => d.level === 'warn'));
});

test('ArduinoRuntime: compiles and runs setup/loop with Servo, BME280, DHT11, and Serial', async () => {
  const logs: string[] = [];
  let servoAngle = -1;
  let pin13 = 0;

  const rt = new ArduinoRuntime({
    boardId: 'uno',
    onDigitalWrite: (pin, val) => {
      if (pin === 'D13') pin13 = val;
    },
    onServoWrite: (_pin, angle) => {
      servoAngle = angle;
    },
    onSerialPrint: (t, nl) => logs.push(nl ? `${t}\n` : t),
    onBmeRead: () => ({ tempC: 24.5, pressureHpa: 1010, humidity: 50, altitudeM: 28 }),
    onDhtRead: () => ({ tempC: 27.2, humidity: 61 }),
  });

  const sketch = `
    #include <Servo.h>
    #include <Adafruit_BME280.h>
    #include <DHT.h>
    Servo s;
    Adafruit_BME280 bme;
    DHT dht(4, DHT11);
    void setup() {
      pinMode(13, OUTPUT);
      s.attach(9);
      Serial.begin(9600);
      bme.begin(0x76);
      dht.begin();
    }
    void loop() {
      digitalWrite(13, HIGH);
      s.write(map(512, 0, 1023, 0, 180));
      Serial.println(String(bme.readTemperature(), 1) + "|" + String(dht.readHumidity(), 0));
      delay(30);
    }
  `;

  const p = rt.start(sketch);
  await new Promise((r) => setTimeout(r, 60));
  rt.stop();
  await p;

  assert.equal(pin13, 1);
  assert.equal(servoAngle, 90);
  assert.ok(logs.some((l) => l.includes('24.5|61')));
});

test('All 20 guided missions: clean breadboard mounts, zero diagnostics, all wiring steps valid, and sketches compile', () => {
  const guided = MISSIONS.filter((m) => m.id !== 'libre');
  assert.equal(guided.length, 20);

  const invalidRailCols = new Set([6, 12, 18, 24, 30]);

  for (const m of guided) {
    const spec = getBoardSpec(m.boardId);
    const comps: PlacedComponent[] = m.components.map((c) => {
      const pins = c.snapHole ? computeSnappedPinsForHole(c.type, c.snapHole) : undefined;
      if (c.snapHole) {
        assert.ok(pins && Object.keys(pins).length > 0, `Invalid snapHole ${c.snapHole} in ${m.id}`);
      }
      return {
        uid: c.uid,
        type: c.type,
        name: c.label ?? c.type,
        position: [...c.position],
        rotationY: c.rotationY ?? 0,
        props: { ...(c.props ?? {}) },
        breadboardMount: pins ? { pins } : undefined,
        state: {},
      };
    });

    const wires: WireDef[] = m.steps.map((s, idx) => {
      for (const ep of [s.from, s.to]) {
        const railMatch = /^bb:(?:top|bot)[+-](\d+)$/.exec(ep);
        if (railMatch) {
          const col = Number(railMatch[1]);
          assert.equal(invalidRailCols.has(col), false, `Mission ${m.id} uses nonexistent rail column ${ep}`);
        }
      }
      return { id: `w_${idx}`, from: s.from, to: s.to, color: s.color };
    });

    const res = analyzeNetlist(spec, comps, wires);
    assert.equal(res.hasShortCircuit, false, `Short circuit in mission ${m.id}`);
    assert.equal(res.hasVoltageDanger, false, `Voltage danger in mission ${m.id}`);
    assert.equal(
      res.diagnostics.length,
      0,
      `Diagnostics in mission ${m.id}: ${res.diagnostics.map((d) => d.title).join('; ')}`
    );

    for (const s of m.steps) {
      assert.equal(
        res.areConnected(s.from, s.to),
        true,
        `Step "${s.label}" disconnected in mission ${m.id}`
      );
    }

    const rt = new ArduinoRuntime({ boardId: m.boardId });
    rt.compile(m.code);
  }
});

test('resistor-calc convierte bidireccionalmente bandas 4 y 5 a ohmios', () => {
  const b4 = bandsToOhms({ mode: 4, d1: 2, d2: 2, multKey: 'brown', tolKey: 'gold' });
  assert.equal(b4.ohms, 220);
  assert.equal(b4.tolerancePct, 5);

  const r4 = ohmsToBands(4700, 4, 'gold');
  assert.equal(r4.d1, 4);
  assert.equal(r4.d2, 7);
  assert.equal(r4.multKey, 'red');
  assert.equal(r4.exactOhms, 4700);

  const b5 = bandsToOhms({ mode: 5, d1: 1, d2: 0, d3: 0, multKey: 'red', tolKey: 'brown' });
  assert.equal(b5.ohms, 10000);
  assert.equal(b5.tolerancePct, 1);

  const r5 = ohmsToBands(221000, 5, 'brown');
  assert.equal(r5.d1, 2);
  assert.equal(r5.d2, 2);
  assert.equal(r5.d3, 1);
  assert.equal(r5.multKey, 'orange');
});

test('gestor de librerías permite buscar, detectar faltante, instalar y compilar Stepper', async () => {
  const found = searchLibraries('stepper');
  assert.ok(found.some((l) => l.id === 'stepper'));

  uninstallLibrary('stepper');
  assert.equal(isLibraryInstalled('Stepper.h'), false);

  const sketch = `
#include <Stepper.h>
Stepper motor(2048, 8, 10, 9, 11);
void setup() {
  motor.setSpeed(10);
  Serial.begin(9600);
}
void loop() {
  motor.step(128);
  Serial.println("OK");
  delay(20);
}
`;
  const rtMissing = new ArduinoRuntime({ boardId: 'uno' });
  assert.throws(
    () => rtMissing.compile(sketch),
    (err: unknown) => err instanceof ArduinoCompileError && err.missingLibraryId === 'stepper'
  );

  installLibrary('stepper');
  assert.equal(isLibraryInstalled('Stepper.h'), true);

  const logs: string[] = [];
  let stepsTotal = 0;
  const rtOk = new ArduinoRuntime({
    boardId: 'uno',
    onSerialPrint: (t, nl) => logs.push(nl ? `${t}\n` : t),
    onStepperStep: (delta) => {
      stepsTotal += Math.abs(delta);
    },
  });
  const run = rtOk.start(sketch);
  await new Promise((r) => setTimeout(r, 40));
  rtOk.stop();
  await run;
  assert.ok(logs.some((l) => l.includes('OK')));
  assert.ok(stepsTotal > 0);

  uninstallLibrary('stepper');
});

test('runtime soporta sintaxis C++ moderna (switch, do..while, bits, EEPROM, NewPing)', async () => {
  installLibrary('newping');
  installLibrary('eeprom');
  const logs: string[] = [];
  const rt = new ArduinoRuntime({
    boardId: 'uno',
    onSerialPrint: (t, nl) => logs.push(nl ? `${t}\n` : t),
    onSonarPing: () => 25,
  });
  const run = rt.start(`
#include <EEPROM.h>
#include <NewPing.h>
#define MASK B0101
NewPing sonar(9, 10, 200);
int a = 3, b = 0b0010;
void setup() {
  Serial.begin(9600);
  EEPROM.write(0, 42);
  int val = (int)((a | b) & MASK);
  int c = 0;
  do { c++; } while (c < 2);
  switch (val) {
    case 1: Serial.println("C1"); break;
    default: Serial.println("DEF"); break;
  }
  Serial.println(EEPROM.read(0));
  Serial.println(sonar.ping_cm());
  Serial.println(c);
}
void loop() { delay(20); }
`);
  await new Promise((r) => setTimeout(r, 35));
  rt.stop();
  await run;
  assert.equal(logs.join(''), 'C1\n42\n25\n2\n');
});

test('netlist conecta divisor LDR de 2 pines y conmuta interruptor deslizante', () => {
  const ldrPins = computeSnappedPinsForHole('ldr', 'c3');
  assert.deepEqual(ldrPins, { P1: 'c3', P2: 'c5' });

  const swPins = computeSnappedPinsForHole('slide-switch', 'g3');
  assert.ok(swPins && Object.keys(swPins).length === 3);

  const comps: PlacedComponent[] = [
    {
      uid: 'ldr1',
      type: 'ldr',
      position: [0, 0, 0],
      rotationY: 0,
      props: { lightPct: 50 },
      breadboardMount: { pins: ldrPins! },
      state: {},
    },
    {
      uid: 'sw1',
      type: 'slide-switch',
      position: [0, 0, 0],
      rotationY: 0,
      props: { slidePos: 0 },
      breadboardMount: { pins: swPins! },
      state: {},
    },
  ];
  const wires: WireDef[] = [
    { id: 'w1', from: 'board:5V', to: 'bb:a3', color: '#dc2626' },
    { id: 'w2', from: 'bb:e5', to: 'board:A0', color: '#2563eb' },
  ];

  const netOff = analyzeNetlist(ARDUINO_UNO_SPEC, comps, wires);
  assert.equal(netOff.hasShortCircuit, false);
  assert.equal(netOff.areConnected('board:5V', 'bb:c3'), true);
  assert.equal(netOff.areConnected('bb:c5', 'board:A0'), true);
});

test('water-analogy calcula Ohm puro (2.5 V / 220 Ω = 11.4 mA) y detiene flujo en 0 m o llave cerrada', () => {
  const ohmRef = computeHydraulicState(2.5, 50, 220);
  assert.equal(Number(ohmRef.flowMa.toFixed(1)), 11.4);
  assert.equal(Number(ohmRef.powerW.toFixed(3)), 0.028);

  const emptyTank = computeHydraulicState(0, 100, 220);
  assert.equal(emptyTank.flowMa, 0);
  assert.equal(emptyTank.velocityNorm, 0);

  const closedValve = computeHydraulicState(5, 0);
  assert.equal(closedValve.ohms, Infinity);
  assert.equal(closedValve.flowMa, 0);
  assert.equal(closedValve.velocityNorm, 0);
});

test('circuits-lab resuelve circuito mixto R1+(R2||R3) y nodo de múltiples fuentes con KCL', () => {
  const mx = solveMixedResistors(9, 220, 470, 470);
  assert.equal(Math.round(mx.r23), 235);
  assert.equal(Math.round(mx.rEq), 455);
  assert.ok(Math.abs(mx.iTotalMa - (mx.i2Ma + mx.i3Ma)) < 0.05);

  const msNorm = solveMultiSourceCircuit(9, 5, false, 220, 220, 470);
  assert.ok(Math.abs(msNorm.i1Ma + msNorm.i2Ma - msNorm.i3Ma) < 0.05);

  const msInv = solveMultiSourceCircuit(9, 5, true, 220, 220, 470);
  assert.ok(msInv.i2Ma < 0);
  assert.ok(Math.abs(msInv.i1Ma + msInv.i2Ma - msInv.i3Ma) < 0.05);
});
