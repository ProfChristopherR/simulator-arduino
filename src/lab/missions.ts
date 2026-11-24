import type { MissionDef } from '../types';

export const MISSIONS: MissionDef[] = [
  {
    id: 'baliza-led',
    title: '1. Baliza de Señalización ("Hola, LED")',
    difficulty: 'Inicial',
    duration: '5 min',
    boardId: 'uno',
    description:
      'Arma tu primer circuito sobre la protoboard: encaja una resistencia de 220 Ω y un LED rojo, y luego lleva la señal digital D13 y el retorno a tierra por el riel negativo (-).',
    useBreadboard: true,
    components: [
      {
        uid: 'r1',
        type: 'resistor',
        position: [1.5, 0.28, -0.87],
        props: { ohms: 220 },
        snapHole: 'c8',
        label: 'Resistencia 220 Ω',
        placementHint: 'Protoboard c8–c12 (limita la corriente del LED)',
      },
      {
        uid: 'led1',
        type: 'led',
        position: [2.5, 0.28, -0.63],
        props: { color: 'red' },
        snapHole: 'b12',
        label: 'LED 5 mm Rojo',
        placementHint: 'Protoboard b12–b13 (ánodo en col. 12 junto a R1)',
      },
    ],
    steps: [
      {
        from: 'board:D13',
        to: 'bb:e8',
        label: 'Arduino D13 → Protoboard e8',
        explanation: 'Lleva 5 V al orificio libre e8 (misma columna 8 que la entrada de la resistencia en c8).',
        color: '#2563eb',
      },
      {
        from: 'bb:e13',
        to: 'bb:top-13',
        label: 'Protoboard e13 → Riel negativo (-) top-13',
        explanation: 'Conecta la columna 13 del cátodo del LED (b13) al riel azul negativo (-) de la protoboard.',
        color: '#22201c',
      },
      {
        from: 'bb:top-2',
        to: 'board:GND_TOP',
        label: 'Riel negativo (-) top-2 → Arduino GND',
        explanation: 'Cierra la tierra común de toda la fila azul (-) con el pin GND del Arduino.',
        color: '#22201c',
      },
    ],
    learnPoints: [
      'Un pin digital alterna entre 0 V (LOW) y 5 V (HIGH).',
      'Toda protoboard une verticalmente los 5 puntos de una misma columna (a–e).',
      'La resistencia de 220 Ω limita la corriente para proteger el LED en el circuito real.',
    ],
    code: `// Misión 1: Baliza de señalización — Liceo San Nicolás
const int PIN_BALIZA = 13;

void setup() {
  pinMode(PIN_BALIZA, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(PIN_BALIZA, HIGH);
  Serial.println("Baliza: ENCENDIDA");
  delay(500);

  digitalWrite(PIN_BALIZA, LOW);
  Serial.println("Baliza: APAGADA");
  delay(500);
}`,
  },
  {
    id: 'semaforo-peatonal',
    title: '2. Semáforo Vial de 3 Luces',
    difficulty: 'Inicial',
    duration: '8 min',
    boardId: 'uno',
    description:
      'Controla tres LEDs independientes (rojo, amarillo y verde) protegidos por resistencias de 220 Ω y compartiendo el riel negativo común (-) de la protoboard.',
    useBreadboard: true,
    components: [
      { uid: 'r1', type: 'resistor', position: [0.4, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c2', label: 'Resistencia 220 Ω (Rojo)', placementHint: 'Protoboard c2–c6' },
      { uid: 'led1', type: 'led', position: [1.1, 0.28, -0.63], props: { color: 'red' }, snapHole: 'b6', label: 'LED Rojo', placementHint: 'Protoboard b6–b7' },
      { uid: 'r2', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω (Amarillo)', placementHint: 'Protoboard c10–c14' },
      { uid: 'led2', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'yellow' }, snapHole: 'b14', label: 'LED Amarillo', placementHint: 'Protoboard b14–b15' },
      { uid: 'r3', type: 'resistor', position: [4.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c18', label: 'Resistencia 220 Ω (Verde)', placementHint: 'Protoboard c18–c22' },
      { uid: 'led3', type: 'led', position: [4.9, 0.28, -0.63], props: { color: 'green' }, snapHole: 'b22', label: 'LED Verde', placementHint: 'Protoboard b22–b23' },
    ],
    steps: [
      { from: 'board:D13', to: 'bb:e2', label: 'Arduino D13 → Protoboard e2', explanation: 'Señal para luz roja.', color: '#c8402f' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Señal para luz amarilla.', color: '#d4a007' },
      { from: 'board:D11', to: 'bb:e18', label: 'Arduino D11 → Protoboard e18', explanation: 'Señal para luz verde.', color: '#2c7a4b' },
      { from: 'bb:e7', to: 'bb:top-7', label: 'Protoboard e7 → Riel (-) top-7', explanation: 'Cátodo rojo a tierra común.', color: '#22201c' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo amarillo a tierra común.', color: '#22201c' },
      { from: 'bb:e23', to: 'bb:top-23', label: 'Protoboard e23 → Riel (-) top-23', explanation: 'Cátodo verde a tierra común.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_TOP', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Un solo cable lleva toda la fila negativa a GND.', color: '#22201c' },
    ],
    learnPoints: [
      'El riel negativo (-) permite compartir una sola conexión de tierra entre múltiples LEDs.',
      'Cada LED debe llevar su propia resistencia limitadora en serie.',
    ],
    code: `// Misión 2: Semáforo Vial — Liceo San Nicolás
const int ROJO = 13;
const int AMARILLO = 12;
const int VERDE = 11;

void setup() {
  pinMode(ROJO, OUTPUT);
  pinMode(AMARILLO, OUTPUT);
  pinMode(VERDE, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(VERDE, HIGH);
  digitalWrite(AMARILLO, LOW);
  digitalWrite(ROJO, LOW);
  Serial.println("Semáforo: VERDE");
  delay(1200);

  digitalWrite(VERDE, LOW);
  digitalWrite(AMARILLO, HIGH);
  Serial.println("Semáforo: AMARILLO");
  delay(600);

  digitalWrite(AMARILLO, LOW);
  digitalWrite(ROJO, HIGH);
  Serial.println("Semáforo: ROJO");
  delay(1200);
}`,
  },
  {
    id: 'pulsador-led',
    title: '3. Control con Pulsador Táctil (Entrada Digital)',
    difficulty: 'Inicial',
    duration: '7 min',
    boardId: 'uno',
    description:
      'Lee un pulsador encajado en la protoboard con resistencia pull-up interna (INPUT_PULLUP) para encender un LED verde sin usar buzzer.',
    useBreadboard: true,
    components: [
      { uid: 'btn1', type: 'button', position: [0.6, 0.28, -0.87], snapHole: 'c3', label: 'Pulsador táctil', placementHint: 'Protoboard c3–c5 (2 columnas de separación)' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'green' }, snapHole: 'b14', label: 'LED 5 mm Verde', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:D2', to: 'bb:e3', label: 'Arduino D2 → Protoboard e3', explanation: 'Conecta el terminal A del pulsador a D2 con INPUT_PULLUP.', color: '#2563eb' },
      { from: 'bb:e5', to: 'bb:top-5', label: 'Protoboard e5 → Riel (-) top-5', explanation: 'El terminal B del pulsador cierra hacia tierra al presionarlo.', color: '#22201c' },
      { from: 'board:D8', to: 'bb:e10', label: 'Arduino D8 → Protoboard e10', explanation: 'Envía señal desde D8 hacia la resistencia de 220 Ω.', color: '#2c7a4b' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo del LED verde hacia tierra común.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_TOP', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Cierra la tierra común de la protoboard con Arduino GND.', color: '#22201c' },
    ],
    learnPoints: [
      'Con INPUT_PULLUP el pin lee HIGH en reposo y LOW al presionar el pulsador.',
      'Al hacer clic en el botón 3D solo se escucha su clic plástico mecánico, pues no hay buzzer conectado.',
    ],
    code: `// Misión 3: Control con Pulsador — Tecnología Geogo
const int PIN_BOTON = 2;
const int PIN_LED = 8;

void setup() {
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(PIN_BOTON) == LOW) {
    digitalWrite(PIN_LED, HIGH);
    Serial.println("Botón PRESIONADO -> LED encendido");
  } else {
    digitalWrite(PIN_LED, LOW);
  }
  delay(80);
}`,
  },
  {
    id: 'acceso-pulsador',
    title: '4. Control de Acceso (Pulsador + LED + Buzzer)',
    difficulty: 'Inicial',
    duration: '9 min',
    boardId: 'uno',
    description:
      'Añade un buzzer piezoeléctrico sobre la protoboard para confirmar con luz verde y tono audible de 880 Hz cuando se presiona el botón de acceso.',
    useBreadboard: true,
    components: [
      { uid: 'btn1', type: 'button', position: [0.6, 0.28, -0.87], snapHole: 'c3', label: 'Pulsador táctil', placementHint: 'Protoboard c3–c5' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'green' }, snapHole: 'b14', label: 'LED Verde', placementHint: 'Protoboard b14–b15' },
      { uid: 'buz1', type: 'buzzer', position: [4.6, 0.28, -0.87], snapHole: 'c20', label: 'Buzzer piezoeléctrico', placementHint: 'Protoboard c20–c22 (+ en col. 20, - en col. 22)' },
    ],
    steps: [
      { from: 'board:D2', to: 'bb:e3', label: 'Arduino D2 → Protoboard e3', explanation: 'Lectura del pulsador en D2 (INPUT_PULLUP).', color: '#2563eb' },
      { from: 'bb:e5', to: 'bb:top-5', label: 'Protoboard e5 → Riel (-) top-5', explanation: 'Terminal B del pulsador a tierra.', color: '#22201c' },
      { from: 'board:D8', to: 'bb:e10', label: 'Arduino D8 → Protoboard e10', explanation: 'Salida digital D8 hacia resistencia de 220 Ω.', color: '#2c7a4b' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo del LED verde al riel negativo.', color: '#22201c' },
      { from: 'board:D9', to: 'bb:e20', label: 'Arduino D9 → Protoboard e20', explanation: 'Señal tone() hacia el terminal (+) del buzzer en col. 20.', color: '#d4a007' },
      { from: 'bb:e22', to: 'bb:top-22', label: 'Protoboard e22 → Riel (-) top-22', explanation: 'Terminal (-) del buzzer al riel negativo.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_TOP', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Retorno común de todo el circuito hacia GND.', color: '#22201c' },
    ],
    learnPoints: [
      'tone(pin, 880) genera una onda cuadrada de 880 Hz solo si el buzzer está cableado al pin y a GND.',
      'Mantén pulsado el botón en el panel "Pruébalo" o haz clic sobre él en el 3D.',
    ],
    code: `// Misión 4: Control de Acceso — Tecnología Geogo
const int PIN_BOTON = 2;
const int PIN_LED = 8;
const int PIN_BUZZER = 9;

void setup() {
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(PIN_BOTON) == LOW) {
    digitalWrite(PIN_LED, HIGH);
    tone(PIN_BUZZER, 880);
    Serial.println("ACCESO AUTORIZADO");
  } else {
    digitalWrite(PIN_LED, LOW);
    noTone(PIN_BUZZER);
  }
  delay(80);
}`,
  },
  {
    id: 'brillo-pwm',
    title: '5. Regulador de Brillo PWM con Potenciómetro',
    difficulty: 'Inicial',
    duration: '8 min',
    boardId: 'uno',
    description:
      'Mide el giro de un potenciómetro en A0 (0–1023) y usa analogWrite() en el pin PWM ~D9 para regular gradualmente la intensidad de un LED azul.',
    useBreadboard: true,
    components: [
      { uid: 'pot1', type: 'potentiometer', position: [1.0, 0.0, -3.5], label: 'Potenciómetro 10 kΩ', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'blue' }, snapHole: 'b14', label: 'LED Azul', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energiza el riel positivo superior a 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Energiza el riel negativo común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:pot1:VCC', label: 'Riel (+) top+4 → Potenciómetro VCC', explanation: 'Extremo positivo del divisor resistivo.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:pot1:GND', label: 'Riel (-) top-4 → Potenciómetro GND', explanation: 'Extremo negativo.', color: '#22201c' },
      { from: 'board:A0', to: 'comp:pot1:SIG', label: 'Arduino A0 → Potenciómetro SIG', explanation: 'Voltaje variable 0–5 V leído por el ADC.', color: '#2c7a4b' },
      { from: 'board:D9', to: 'bb:e10', label: 'Arduino ~D9 → Protoboard e10', explanation: 'Salida PWM (~D9) hacia la resistencia.', color: '#d4a007' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo del LED azul al riel negativo.', color: '#22201c' },
    ],
    learnPoints: [
      'El ADC lee de 0 a 1023, mientras analogWrite() acepta valores PWM de 0 a 255.',
      'Solo los pines marcados con ~ (3, 5, 6, 9, 10, 11) soportan PWM por hardware en Uno.',
    ],
    code: `// Misión 5: Regulador de brillo PWM — Liceo San Nicolás
const int PIN_POT = A0;
const int PIN_LED = 9;

void setup() {
  pinMode(PIN_LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(PIN_POT);
  int pwm = map(lectura, 0, 1023, 0, 255);
  analogWrite(PIN_LED, pwm);

  Serial.print("ADC: ");
  Serial.print(lectura);
  Serial.print(" -> PWM: ");
  Serial.println(pwm);
  delay(120);
}`,
  },
  {
    id: 'mezcla-rgb',
    title: '6. Baliza RGB Multicolor (PWM 3 Canales)',
    difficulty: 'Inicial',
    duration: '10 min',
    boardId: 'uno',
    description:
      'Conecta un LED RGB de cátodo común con 3 resistencias de 220 Ω dispuestas en paralelo por columna y mezcla colores primarios con ~D9, ~D10 y ~D11.',
    useBreadboard: true,
    components: [
      { uid: 'rgb1', type: 'rgb-led', position: [2.8, 0.28, -0.63], snapHole: 'b14', label: 'LED RGB 5 mm', placementHint: 'Protoboard b14–b17 (R=14, K=15, G=16, B=17)' },
      { uid: 'r1', type: 'resistor', position: [1.8, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω (Canal R)', placementHint: 'Protoboard c10–c14' },
      { uid: 'r2', type: 'resistor', position: [3.2, 0.28, -1.1], props: { ohms: 220 }, snapHole: 'd16', label: 'Resistencia 220 Ω (Canal G)', placementHint: 'Protoboard d16–d20' },
      { uid: 'r3', type: 'resistor', position: [3.6, 0.28, -0.39], props: { ohms: 220 }, snapHole: 'a17', label: 'Resistencia 220 Ω (Canal B)', placementHint: 'Protoboard a17–a21' },
    ],
    steps: [
      { from: 'board:D9', to: 'bb:e10', label: 'Arduino ~D9 → Protoboard e10', explanation: 'Canal Rojo del LED RGB a través de R1.', color: '#c8402f' },
      { from: 'board:D10', to: 'bb:e20', label: 'Arduino ~D10 → Protoboard e20', explanation: 'Canal Verde del LED RGB a través de R2.', color: '#2c7a4b' },
      { from: 'board:D11', to: 'bb:e21', label: 'Arduino ~D11 → Protoboard e21', explanation: 'Canal Azul del LED RGB a través de R3.', color: '#2563eb' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo común (K) del LED RGB a tierra.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_TOP', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Retorno común hacia Arduino GND.', color: '#22201c' },
    ],
    learnPoints: [
      'Un LED RGB combina tres diodos internos (Rojo, Verde, Azul) en un mismo encapsulado difuso.',
      'Combinando PWM en R+G obtenemos amarillo; G+B cian; R+B magenta.',
    ],
    code: `// Misión 6: Mezcla RGB — Liceo San Nicolás
const int R_PIN = 9;
const int G_PIN = 10;
const int B_PIN = 11;

void setColor(int r, int g, int b) {
  analogWrite(R_PIN, r);
  analogWrite(G_PIN, g);
  analogWrite(B_PIN, b);
}

void setup() {
  pinMode(R_PIN, OUTPUT);
  pinMode(G_PIN, OUTPUT);
  pinMode(B_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  setColor(255, 40, 0);
  Serial.println("Color: Rojo / Ambar");
  delay(700);
  setColor(0, 220, 120);
  Serial.println("Color: Cian Geogo");
  delay(700);
  setColor(180, 0, 255);
  Serial.println("Color: Violeta");
  delay(700);
}`,
  },
  {
    id: 'alarma-melodia',
    title: '7. Sirena y Melodía Táctica (Pulsador + Buzzer)',
    difficulty: 'Intermedio',
    duration: '10 min',
    boardId: 'uno',
    description:
      'Construye una sirena táctil activada por botón que ejecuta una secuencia de tonos musicales con tone(pin, frecuencia, duración) y luz amarilla sincronizada.',
    useBreadboard: true,
    components: [
      { uid: 'btn1', type: 'button', position: [0.6, 0.28, -0.87], snapHole: 'c3', label: 'Pulsador táctil', placementHint: 'Protoboard c3–c5' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'yellow' }, snapHole: 'b14', label: 'LED Amarillo', placementHint: 'Protoboard b14–b15' },
      { uid: 'buz1', type: 'buzzer', position: [4.6, 0.28, -0.87], snapHole: 'c20', label: 'Buzzer piezoeléctrico', placementHint: 'Protoboard c20–c22' },
    ],
    steps: [
      { from: 'board:D2', to: 'bb:e3', label: 'Arduino D2 → Protoboard e3', explanation: 'Entrada de disparo con pulsador.', color: '#2563eb' },
      { from: 'bb:e5', to: 'bb:top-5', label: 'Protoboard e5 → Riel (-) top-5', explanation: 'Retorno del botón al riel negativo.', color: '#22201c' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Señal luminosa hacia el LED amarillo.', color: '#d4a007' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
      { from: 'board:D9', to: 'bb:e20', label: 'Arduino D9 → Protoboard e20', explanation: 'Salida de audio para el buzzer.', color: '#7a4fb3' },
      { from: 'bb:e22', to: 'bb:top-22', label: 'Protoboard e22 → Riel (-) top-22', explanation: 'Terminal negativo del buzzer.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_TOP', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Tierra general.', color: '#22201c' },
    ],
    learnPoints: [
      'tone(pin, freq, duracion) permite definir la duración exacta de cada nota musical.',
      'Los ciclos for() simplifican reproducir arreglos completos de frecuencias.',
    ],
    code: `// Misión 7: Sirena Táctica — Área Premilitar
const int BTN = 2;
const int LED = 12;
const int BUZ = 9;
int notas[] = { 523, 659, 784, 1046 };

void setup() {
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (digitalRead(BTN) == LOW) {
    Serial.println("Activando secuencia sonora...");
    for (int i = 0; i < 4; i++) {
      digitalWrite(LED, HIGH);
      tone(BUZ, notas[i], 140);
      delay(160);
      digitalWrite(LED, LOW);
      delay(40);
    }
    noTone(BUZ);
  }
  delay(60);
}`,
  },
  {
    id: 'luz-nocturna-ldr',
    title: '8. Alumbrado Automático Nocturno (Sensor LDR)',
    difficulty: 'Intermedio',
    duration: '10 min',
    boardId: 'uno',
    description:
      'Usa una fotorresistencia (LDR) en A0 para medir la luz ambiental y encender automáticamente un LED blanco cuando oscurece bajo el umbral configurado.',
    useBreadboard: true,
    components: [
      { uid: 'ldr1', type: 'ldr', position: [1.2, 0.0, -3.5], label: 'Sensor de Luz (LDR)', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'white' }, snapHole: 'b14', label: 'LED Blanco', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Alimenta la barra positiva de 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Conecta la barra negativa común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:ldr1:VCC', label: 'Riel (+) top+4 → LDR VCC', explanation: 'Alimenta el módulo LDR.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:ldr1:GND', label: 'Riel (-) top-4 → LDR GND', explanation: 'Masa del módulo LDR.', color: '#22201c' },
      { from: 'board:A0', to: 'comp:ldr1:AO', label: 'Arduino A0 → LDR AO', explanation: 'Señal analógica proporcional a la luz.', color: '#2c7a4b' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Control de encendido del foco blanco.', color: '#2563eb' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo del LED a tierra.', color: '#22201c' },
    ],
    learnPoints: [
      'Un umbral con histéresis o comparación directa permite automatizar luminarias sin intervención manual.',
      'Prueba bajar la luminosidad por debajo de 40 % en el control flotante "Pruébalo".',
    ],
    code: `// Misión 8: Alumbrado Nocturno con LDR — Liceo San Nicolás
const int PIN_LDR = A0;
const int PIN_FOCO = 12;

void setup() {
  pinMode(PIN_FOCO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int luz = analogRead(PIN_LDR);
  Serial.print("Nivel luz (0-1023): ");
  Serial.println(luz);

  if (luz < 420) {
    digitalWrite(PIN_FOCO, HIGH);
  } else {
    digitalWrite(PIN_FOCO, LOW);
  }
  delay(200);
}`,
  },
  {
    id: 'perimetro-ultrasonico',
    title: '9. Perímetro Ultrasónico de Seguridad (HC-SR04)',
    difficulty: 'Intermedio',
    duration: '12 min',
    boardId: 'uno',
    description:
      'Detecta intrusiones a menos de 30 cm mediante pulsos ultrasónicos HC-SR04 y dispara una alarma visual (LED rojo) y acústica (buzzer) sobre la protoboard.',
    useBreadboard: true,
    components: [
      { uid: 'us1', type: 'ultrasonic', position: [1.5, 0.0, -3.5], label: 'Sensor Ultrasónico HC-SR04', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'red' }, snapHole: 'b14', label: 'LED Rojo', placementHint: 'Protoboard b14–b15' },
      { uid: 'buz1', type: 'buzzer', position: [4.6, 0.28, -0.87], snapHole: 'c20', label: 'Buzzer piezoeléctrico', placementHint: 'Protoboard c20–c22' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energiza el riel positivo de la protoboard.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Tierra común del sistema.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:us1:VCC', label: 'Riel (+) top+4 → HC-SR04 VCC', explanation: 'Alimenta el módulo ultrasónico a 5 V.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:us1:GND', label: 'Riel (-) top-4 → HC-SR04 GND', explanation: 'Masa del HC-SR04.', color: '#22201c' },
      { from: 'board:D6', to: 'comp:us1:TRIG', label: 'Arduino D6 → TRIG', explanation: 'Dispara el pulso de 10 µs.', color: '#2563eb' },
      { from: 'board:D7', to: 'comp:us1:ECHO', label: 'Arduino D7 → ECHO', explanation: 'Mide el tiempo de retorno del eco.', color: '#2c7a4b' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Activa LED rojo de alerta.', color: '#d4a007' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
      { from: 'board:D9', to: 'bb:e20', label: 'Arduino D9 → Protoboard e20', explanation: 'Alarma sonora en el buzzer.', color: '#7a4fb3' },
      { from: 'bb:e22', to: 'bb:top-22', label: 'Protoboard e22 → Riel (-) top-22', explanation: 'Retorno del buzzer a tierra.', color: '#22201c' },
    ],
    learnPoints: [
      'La fórmula distancia = duracion * 0.034 / 2 convierte el tiempo ida/vuelta del sonido a centímetros.',
      'Acerca el deslizador de distancia bajo 30 cm en el widget "Pruébalo" para activar la alarma.',
    ],
    code: `// Misión 9: Perímetro Ultrasónico — Área Premilitar
const int TRIG = 6;
const int ECHO = 7;
const int LED_ALERTA = 12;
const int BUZZER = 9;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_ALERTA, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracion = pulseIn(ECHO, HIGH);
  int distancia = duracion * 0.034 / 2;

  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.println(" cm");

  if (distancia > 0 && distancia < 30) {
    digitalWrite(LED_ALERTA, HIGH);
    tone(BUZZER, 1000);
  } else {
    digitalWrite(LED_ALERTA, LOW);
    noTone(BUZZER);
  }
  delay(150);
}`,
  },
  {
    id: 'barrera-servo',
    title: '10. Barrera de Control con Micro Servo SG90',
    difficulty: 'Intermedio',
    duration: '10 min',
    boardId: 'uno',
    description:
      'Controla con precisión el ángulo de una barrera (0° a 180°) mediante un potenciómetro en A0 usando los rieles de alimentación de la protoboard.',
    useBreadboard: true,
    components: [
      { uid: 'pot1', type: 'potentiometer', position: [1.2, 0.0, 3.6], label: 'Potenciómetro 10 kΩ', placementHint: 'Mesa inferior frente a la protoboard' },
      { uid: 'srv1', type: 'servo', position: [4.6, 0.0, 3.6], label: 'Micro Servo SG90', placementHint: 'Mesa inferior derecha' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Alimenta la barra positiva a 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Cierra la masa común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:pot1:VCC', label: 'Riel (+) top+4 → Potenciómetro VCC', explanation: 'Extremo positivo del potenciómetro.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:pot1:GND', label: 'Riel (-) top-4 → Potenciómetro GND', explanation: 'Extremo negativo.', color: '#22201c' },
      { from: 'board:A0', to: 'comp:pot1:SIG', label: 'Arduino A0 → Potenciómetro SIG', explanation: 'Lectura analógica 0–1023.', color: '#2c7a4b' },
      { from: 'bb:top+8', to: 'comp:srv1:VCC', label: 'Riel (+) top+8 → Servo VCC', explanation: 'Alimentación del motor servo.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:srv1:GND', label: 'Riel (-) top-8 → Servo GND', explanation: 'Masa común del servo.', color: '#22201c' },
      { from: 'board:D9', to: 'comp:srv1:SIG', label: 'Arduino ~D9 → Servo SIG', explanation: 'Señal PWM de ángulo.', color: '#d4a007' },
    ],
    learnPoints: [
      'map(lectura, 0, 1023, 0, 180) escala el ADC al rango mecánico del servo SG90.',
      'En montajes con varios servos de alta carga, recuerda usar una fuente externa compartiendo GND.',
    ],
    code: `// Misión 10: Barrera con Micro Servo SG90
#include <Servo.h>

Servo barrera;

void setup() {
  barrera.attach(9);
  Serial.begin(9600);
}

void loop() {
  int lectura = analogRead(A0);
  int angulo = map(lectura, 0, 1023, 0, 180);
  barrera.write(angulo);

  Serial.print("Angulo barrera: ");
  Serial.println(angulo);
  delay(100);
}`,
  },
  {
    id: 'peaje-automatico',
    title: '11. Peaje Automático (HC-SR04 + Servo + LED)',
    difficulty: 'Intermedio',
    duration: '14 min',
    boardId: 'uno',
    description:
      'Cuando un vehículo se acerca a menos de 25 cm del sensor ultrasónico, el servo levanta la barrera a 90° y enciende el LED verde de paso.',
    useBreadboard: true,
    components: [
      { uid: 'us1', type: 'ultrasonic', position: [1.5, 0.0, -3.5], label: 'Sensor HC-SR04', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'srv1', type: 'servo', position: [4.6, 0.0, 3.6], label: 'Micro Servo SG90', placementHint: 'Mesa inferior derecha' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'green' }, snapHole: 'b14', label: 'LED Verde', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energía principal 5 V en protoboard.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Tierra común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:us1:VCC', label: 'Riel (+) top+4 → HC-SR04 VCC', explanation: 'Alimentación sensor.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:us1:GND', label: 'Riel (-) top-4 → HC-SR04 GND', explanation: 'Tierra sensor.', color: '#22201c' },
      { from: 'board:D6', to: 'comp:us1:TRIG', label: 'Arduino D6 → TRIG', explanation: 'Pulso de disparo.', color: '#2563eb' },
      { from: 'board:D7', to: 'comp:us1:ECHO', label: 'Arduino D7 → ECHO', explanation: 'Lectura de eco.', color: '#2c7a4b' },
      { from: 'bb:top+8', to: 'comp:srv1:VCC', label: 'Riel (+) top+8 → Servo VCC', explanation: 'Alimentación barrera.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:srv1:GND', label: 'Riel (-) top-8 → Servo GND', explanation: 'Tierra barrera.', color: '#22201c' },
      { from: 'board:D9', to: 'comp:srv1:SIG', label: 'Arduino ~D9 → Servo SIG', explanation: 'Control de apertura.', color: '#d4a007' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Indicador LED verde.', color: '#2c7a4b' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Retorno LED a GND.', color: '#22201c' },
    ],
    learnPoints: [
      'Integra percepción ultrasónica con actuación mecánica automatizada.',
      'Observa las ondas verdes sobre el HC-SR04 y el giro de la barrera al bajar de 25 cm.',
    ],
    code: `// Misión 11: Peaje Automático — Liceo San Nicolás
#include <Servo.h>
Servo barrera;

const int TRIG = 6;
const int ECHO = 7;
const int LED_PASO = 12;

void setup() {
  barrera.attach(9);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  pinMode(LED_PASO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  int dist = pulseIn(ECHO, HIGH) * 0.034 / 2;

  if (dist > 0 && dist < 25) {
    barrera.write(95);
    digitalWrite(LED_PASO, HIGH);
    Serial.println("Peaje ABIERTO");
  } else {
    barrera.write(5);
    digitalWrite(LED_PASO, LOW);
  }
  delay(150);
}`,
  },
  {
    id: 'monitor-dht11',
    title: '12. Monitor de Clima con Sensor DHT11',
    difficulty: 'Intermedio',
    duration: '10 min',
    boardId: 'uno',
    description:
      'Mide temperatura y humedad relativa del aula usando el sensor digital DHT11 del Kit XL y enciende un LED naranja si supera 28 °C.',
    useBreadboard: true,
    components: [
      { uid: 'dht1', type: 'dht11', position: [1.5, 0.0, -3.5], label: 'Sensor Clima DHT11', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'orange' }, snapHole: 'b14', label: 'LED Naranja', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energiza el riel positivo.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Energiza el riel negativo.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:dht1:VCC', label: 'Riel (+) top+4 → DHT11 VCC', explanation: 'Alimentación 5 V al DHT11.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:dht1:GND', label: 'Riel (-) top-4 → DHT11 GND', explanation: 'Masa del DHT11.', color: '#22201c' },
      { from: 'board:D4', to: 'comp:dht1:DATA', label: 'Arduino D4 → DHT11 DATA', explanation: 'Bus digital de temperatura y humedad.', color: '#2563eb' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'Salida hacia el LED de alerta térmica.', color: '#d4a007' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
    ],
    learnPoints: [
      'DHT11 transmite temperatura y humedad calibradas de fábrica por un único cable DATA.',
      'Ajusta la temperatura sobre 28 °C en "Pruébalo" para disparar el aviso térmico.',
    ],
    code: `// Misión 12: Monitor de Clima DHT11 — Kit XL
#include <DHT.h>

DHT dht(4, DHT11);
const int LED_CALOR = 12;

void setup() {
  dht.begin();
  pinMode(LED_CALOR, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  Serial.print("Temp: ");
  Serial.print(t);
  Serial.print(" C | Humedad: ");
  Serial.print(h);
  Serial.println(" %");

  digitalWrite(LED_CALOR, t >= 28.0 ? HIGH : LOW);
  delay(400);
}`,
  },
  {
    id: 'tablero-lcd-voltaje',
    title: '13. Voltímetro Digital en Pantalla LCD 16×2 (I²C)',
    difficulty: 'Intermedio',
    duration: '12 min',
    boardId: 'uno',
    description:
      'Convierte la lectura ADC (0–1023) de un potenciómetro a voltios reales (0.00–5.00 V) y muéstralos en vivo sobre la pantalla LCD 16×2 por bus I²C.',
    useBreadboard: true,
    components: [
      { uid: 'pot1', type: 'potentiometer', position: [1.2, 0.0, -3.5], label: 'Potenciómetro 10 kΩ', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'lcd1', type: 'lcd-i2c', position: [4.0, 0.0, 3.8], label: 'Pantalla LCD 16×2 I²C', placementHint: 'Mesa inferior derecha' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Barra de 5 V compartida.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Barra de tierra compartida.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:pot1:VCC', label: 'Riel (+) top+4 → Potenciómetro VCC', explanation: 'Referencia 5 V.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:pot1:GND', label: 'Riel (-) top-4 → Potenciómetro GND', explanation: 'Referencia 0 V.', color: '#22201c' },
      { from: 'board:A0', to: 'comp:pot1:SIG', label: 'Arduino A0 → Potenciómetro SIG', explanation: 'Entrada analógica.', color: '#2c7a4b' },
      { from: 'bb:top+8', to: 'comp:lcd1:VCC', label: 'Riel (+) top+8 → LCD VCC', explanation: 'Alimentación 5 V del display.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:lcd1:GND', label: 'Riel (-) top-8 → LCD GND', explanation: 'Masa del display.', color: '#22201c' },
      { from: 'board:SDA', to: 'comp:lcd1:SDA', label: 'Arduino SDA → LCD SDA', explanation: 'Datos del bus I²C.', color: '#2563eb' },
      { from: 'board:SCL', to: 'comp:lcd1:SCL', label: 'Arduino SCL → LCD SCL', explanation: 'Reloj del bus I²C.', color: '#7a4fb3' },
    ],
    learnPoints: [
      'El bus I²C controla una pantalla de 16×2 caracteres usando solo dos pines de datos (SDA y SCL).',
      'voltaje = lectura * (5.0 / 1023.0) transforma la escala entera de 10 bits a voltios.',
    ],
    code: `// Misión 13: Voltímetro Digital LCD I2C
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  float volt = raw * (5.0 / 1023.0);

  lcd.setCursor(0, 0);
  lcd.print("Voltimetro Geogo");
  lcd.setCursor(0, 1);
  lcd.print("V:" + String(volt, 2) + "V ADC:" + String(raw));
  Serial.println("Voltaje: " + String(volt, 2) + " V");
  delay(200);
}`,
  },
  {
    id: 'alerta-co2-lcd',
    title: '14. Monitor de CO₂ con Alarma y Pantalla LCD',
    difficulty: 'Avanzado',
    duration: '15 min',
    boardId: 'uno',
    description:
      'Mide la concentración ambiental de CO₂ (ppm), muestra el estado de ventilación en el LCD 16×2 y dispara alerta visual y sonora sobre 1200 ppm.',
    useBreadboard: true,
    components: [
      { uid: 'co2_1', type: 'co2-sensor', position: [1.2, 0.0, -3.5], label: 'Sensor CO₂ (ppm)', placementHint: 'Mesa superior izquierda' },
      { uid: 'lcd1', type: 'lcd-i2c', position: [4.2, 0.0, 3.8], label: 'Pantalla LCD 16×2 I²C', placementHint: 'Mesa inferior derecha' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'red' }, snapHole: 'b14', label: 'LED Alarma Rojo', placementHint: 'Protoboard b14–b15' },
      { uid: 'buz1', type: 'buzzer', position: [4.6, 0.28, -0.87], snapHole: 'c20', label: 'Buzzer piezoeléctrico', placementHint: 'Protoboard c20–c22' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energía general de 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Masa común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:co2_1:VCC', label: 'Riel (+) top+4 → CO₂ VCC', explanation: 'Calefactor/sensor CO₂ a 5 V.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:co2_1:GND', label: 'Riel (-) top-4 → CO₂ GND', explanation: 'Tierra sensor CO₂.', color: '#22201c' },
      { from: 'board:A1', to: 'comp:co2_1:AO', label: 'Arduino A1 → CO₂ AO', explanation: 'Lectura analógica proporcional a ppm.', color: '#2c7a4b' },
      { from: 'bb:top+8', to: 'comp:lcd1:VCC', label: 'Riel (+) top+8 → LCD VCC', explanation: 'Alimentación LCD.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:lcd1:GND', label: 'Riel (-) top-8 → LCD GND', explanation: 'Masa LCD.', color: '#22201c' },
      { from: 'board:SDA', to: 'comp:lcd1:SDA', label: 'Arduino SDA → LCD SDA', explanation: 'Bus I²C datos.', color: '#2563eb' },
      { from: 'board:SCL', to: 'comp:lcd1:SCL', label: 'Arduino SCL → LCD SCL', explanation: 'Bus I²C reloj.', color: '#7a4fb3' },
      { from: 'board:D12', to: 'bb:e10', label: 'Arduino D12 → Protoboard e10', explanation: 'LED rojo de ventilación.', color: '#c8402f' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
      { from: 'board:D9', to: 'bb:e20', label: 'Arduino D9 → Protoboard e20', explanation: 'Alerta acústica en el buzzer.', color: '#d4a007' },
      { from: 'bb:e22', to: 'bb:top-22', label: 'Protoboard e22 → Riel (-) top-22', explanation: 'Tierra buzzer.', color: '#22201c' },
    ],
    learnPoints: [
      'Por encima de 1200 ppm en una sala cerrada conviene activar ventilación.',
      'Revisa en la tabla del LCD cómo cambia de "AIRE OPTIMO" a "VENTILAR SALA".',
    ],
    code: `// Misión 14: Monitor Ambiental de CO2 — Tecnología Geogo
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
const int PIN_CO2 = A1;
const int LED_ROJO = 12;
const int BUZ = 9;

void setup() {
  lcd.init();
  lcd.backlight();
  pinMode(LED_ROJO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(PIN_CO2);
  int ppm = map(raw, 0, 1023, 400, 3000);

  lcd.setCursor(0, 0);
  lcd.print("CO2: " + String(ppm) + " ppm");
  lcd.setCursor(0, 1);
  if (ppm >= 1200) {
    lcd.print("VENTILAR SALA!  ");
    digitalWrite(LED_ROJO, HIGH);
    tone(BUZ, 920);
  } else {
    lcd.print("AIRE OPTIMO     ");
    digitalWrite(LED_ROJO, LOW);
    noTone(BUZ);
  }
  Serial.println("CO2: " + String(ppm) + " ppm");
  delay(250);
}`,
  },
  {
    id: 'tacometro-optico',
    title: '15. Tacómetro Óptico Rotativo (Interrupción INT0)',
    difficulty: 'Avanzado',
    duration: '14 min',
    boardId: 'uno',
    description:
      'Cuenta los pulsos del encoder óptico rotativo usando attachInterrupt() en el pin D2 (INT0) y visualiza las RPM estimadas en el display LCD I²C.',
    useBreadboard: true,
    components: [
      { uid: 'opt1', type: 'optical-encoder', position: [1.2, 0.0, -3.5], label: 'Sensor Óptico Rotativo', placementHint: 'Mesa superior sobre la protoboard' },
      { uid: 'lcd1', type: 'lcd-i2c', position: [4.2, 0.0, 3.8], label: 'Pantalla LCD 16×2 I²C', placementHint: 'Mesa inferior derecha' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energía principal 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Masa común.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:opt1:VCC', label: 'Riel (+) top+4 → Encoder VCC', explanation: 'Alimenta el emisor infrarrojo.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:opt1:GND', label: 'Riel (-) top-4 → Encoder GND', explanation: 'Tierra del encoder.', color: '#22201c' },
      { from: 'board:D2', to: 'comp:opt1:DO', label: 'Arduino D2 (INT0) → Encoder DO', explanation: 'Pin de interrupción rápida.', color: '#2563eb' },
      { from: 'bb:top+8', to: 'comp:lcd1:VCC', label: 'Riel (+) top+8 → LCD VCC', explanation: 'Alimenta la pantalla.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:lcd1:GND', label: 'Riel (-) top-8 → LCD GND', explanation: 'Tierra pantalla.', color: '#22201c' },
      { from: 'board:SDA', to: 'comp:lcd1:SDA', label: 'Arduino SDA → LCD SDA', explanation: 'Datos I²C.', color: '#2c7a4b' },
      { from: 'board:SCL', to: 'comp:lcd1:SCL', label: 'Arduino SCL → LCD SCL', explanation: 'Reloj I²C.', color: '#7a4fb3' },
    ],
    learnPoints: [
      'Las interrupciones por hardware (D2/D3 en Uno) capturan pulsos rápidos sin perder cuentas durante delay().',
      'Ajusta las RPM del disco ranurado en "Pruébalo" y observa girar el disco 3D.',
    ],
    code: `// Misión 15: Tacómetro Óptico — Tecnología Geogo
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
int pulsos = 0;

void contarPulso() {
  pulsos++;
}

void setup() {
  lcd.init();
  lcd.backlight();
  pinMode(2, INPUT);
  attachInterrupt(digitalPinToInterrupt(2), contarPulso, RISING);
  Serial.begin(9600);
}

void loop() {
  pulsos = 0;
  delay(400);
  int rpm = pulsos * 45;
  lcd.setCursor(0, 0);
  lcd.print("Tacometro Geogo ");
  lcd.setCursor(0, 1);
  lcd.print("Pulsos:" + String(pulsos) + " ~" + String(rpm) + "RPM");
  Serial.println("Pulsos ventana: " + String(pulsos));
}`,
  },
  {
    id: 'estacion-bme280',
    title: '16. Estación Geogo BME280 (Level Shifter + LCD)',
    difficulty: 'Avanzado',
    duration: '18 min',
    boardId: 'uno',
    description:
      'Protege el barómetro BME280 (3.3 V) conectándolo al Arduino Uno (5 V) mediante el Level Shifter bidireccional 4 ch y muestra presión y altitud en el LCD 16×2.',
    useBreadboard: true,
    components: [
      { uid: 'lvl1', type: 'level-shifter', position: [1.4, 0.0, -3.5], label: 'Level Shifter 4 ch', placementHint: 'Mesa superior izquierda (puente 5V ↔ 3.3V)' },
      { uid: 'bme1', type: 'bme280', position: [4.2, 0.0, -3.5], props: { model: 'BME280' }, label: 'Barómetro BME280 (3.3 V)', placementHint: 'Mesa superior derecha' },
      { uid: 'lcd1', type: 'lcd-i2c', position: [3.4, 0.0, 3.8], label: 'Pantalla LCD 16×2 I²C', placementHint: 'Mesa inferior derecha' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Uno 5V → Riel (+) top+2', explanation: 'Barra de 5 V para el lado alto (HV) y LCD.', color: '#c8402f' },
      { from: 'board:GND_1', to: 'bb:top-2', label: 'Uno GND → Riel (-) top-2', explanation: 'Tierra común de todo el sistema.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:lvl1:HV', label: 'Riel (+) top+4 → Level Shifter HV', explanation: 'Referencia de 5 V.', color: '#c8402f' },
      { from: 'board:3V3', to: 'comp:lvl1:LV', label: 'Uno 3.3V → Level Shifter LV', explanation: 'Referencia de 3.3 V.', color: '#d4a007' },
      { from: 'bb:top-4', to: 'comp:lvl1:GND_H', label: 'Riel (-) top-4 → Level Shifter GND', explanation: 'Masa del conversor.', color: '#22201c' },
      { from: 'board:A4', to: 'comp:lvl1:HV1', label: 'Uno A4 (SDA 5V) → HV1', explanation: 'Línea SDA lado 5 V.', color: '#2563eb' },
      { from: 'board:A5', to: 'comp:lvl1:HV2', label: 'Uno A5 (SCL 5V) → HV2', explanation: 'Línea SCL lado 5 V.', color: '#7a4fb3' },
      { from: 'comp:lvl1:LV', to: 'comp:bme1:VCC', label: 'Level Shifter LV (3.3V) → BME280 VCC', explanation: 'Alimenta el BME280 a 3.3 V seguros.', color: '#d4a007' },
      { from: 'comp:lvl1:GND_L', to: 'comp:bme1:GND', label: 'Level Shifter GND → BME280 GND', explanation: 'Masa común del sensor.', color: '#22201c' },
      { from: 'comp:lvl1:LV1', to: 'comp:bme1:SDA', label: 'LV1 (3.3V) → BME280 SDA', explanation: 'SDA ya convertido a 3.3 V.', color: '#2563eb' },
      { from: 'comp:lvl1:LV2', to: 'comp:bme1:SCL', label: 'LV2 (3.3V) → BME280 SCL', explanation: 'SCL ya convertido a 3.3 V.', color: '#7a4fb3' },
      { from: 'bb:top+8', to: 'comp:lcd1:VCC', label: 'Riel (+) top+8 → LCD VCC', explanation: 'Alimenta el LCD (trabaja a 5 V).', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:lcd1:GND', label: 'Riel (-) top-8 → LCD GND', explanation: 'Masa del LCD.', color: '#22201c' },
      { from: 'board:SDA', to: 'comp:lcd1:SDA', label: 'Uno SDA → LCD SDA', explanation: 'Bus I²C 5 V directo al LCD.', color: '#2563eb' },
      { from: 'board:SCL', to: 'comp:lcd1:SCL', label: 'Uno SCL → LCD SCL', explanation: 'Reloj I²C 5 V directo al LCD.', color: '#7a4fb3' },
    ],
    learnPoints: [
      'El Level Shifter protege los pines SDA/SCL del BME280 bajando las señales de 5 V a 3.3 V.',
      'Cambia la presión atmosférica en "Pruébalo" para calcular la altitud barométrica en vivo.',
    ],
    code: `// Misión 16: Estación Geogo BME280 + Level Shifter + LCD
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_BME280.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_BME280 bme;

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  bme.begin(0x76);
}

void loop() {
  float temp = bme.readTemperature();
  float presion = bme.readPressure() / 100.0;
  float altitud = bme.readAltitude(1013.25);

  lcd.setCursor(0, 0);
  lcd.print("T:" + String(temp, 1) + "C P:" + String(int(presion)));
  lcd.setCursor(0, 1);
  lcd.print("Alt:" + String(int(altitud)) + "m Geogo");

  Serial.println("T:" + String(temp, 1) + " C | P:" + String(int(presion)) + " hPa | Alt:" + String(int(altitud)) + " m");
  delay(400);
}`,
  },
  {
    id: 'telemetria-rf433',
    title: '17. Enlace de Telemetría RF 433 MHz + DHT11',
    difficulty: 'Avanzado',
    duration: '14 min',
    boardId: 'uno',
    description:
      'Captura temperatura y humedad con el sensor DHT11 y transmite paquetes de telemetría por el módulo RF 433 MHz señalizando cada envío con un LED azul.',
    useBreadboard: true,
    components: [
      { uid: 'dht1', type: 'dht11', position: [1.2, 0.0, -3.5], label: 'Sensor Clima DHT11', placementHint: 'Mesa superior izquierda' },
      { uid: 'rf1', type: 'rf-pair', position: [4.2, 0.0, -3.5], label: 'Transmisor RF 433 MHz', placementHint: 'Mesa superior derecha' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'blue' }, snapHole: 'b14', label: 'LED Azul TX', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:5V', to: 'bb:top+2', label: 'Arduino 5V → Riel (+) top+2', explanation: 'Energía general 5 V.', color: '#c8402f' },
      { from: 'bb:top-2', to: 'board:GND_1', label: 'Riel (-) top-2 → Arduino GND', explanation: 'Masa general.', color: '#22201c' },
      { from: 'bb:top+4', to: 'comp:dht1:VCC', label: 'Riel (+) top+4 → DHT11 VCC', explanation: 'Alimenta el DHT11.', color: '#c8402f' },
      { from: 'bb:top-4', to: 'comp:dht1:GND', label: 'Riel (-) top-4 → DHT11 GND', explanation: 'Tierra DHT11.', color: '#22201c' },
      { from: 'board:D4', to: 'comp:dht1:DATA', label: 'Arduino D4 → DHT11 DATA', explanation: 'Lectura climática.', color: '#2563eb' },
      { from: 'bb:top+8', to: 'comp:rf1:VCC', label: 'Riel (+) top+8 → RF 433 VCC', explanation: 'Alimentación del transmisor.', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:rf1:GND', label: 'Riel (-) top-8 → RF 433 GND', explanation: 'Tierra del transmisor.', color: '#22201c' },
      { from: 'board:D11', to: 'comp:rf1:DATA', label: 'Arduino D11 → RF 433 DATA', explanation: 'Modulación de trama RF.', color: '#7a4fb3' },
      { from: 'board:D13', to: 'bb:e10', label: 'Arduino D13 → Protoboard e10', explanation: 'Destello indicador de transmisión.', color: '#2c7a4b' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Retorno del LED a tierra.', color: '#22201c' },
    ],
    learnPoints: [
      'Un enlace ASK/OOK de 433 MHz modula pulsos digitales en el pin DATA para enviar telemetría a distancia.',
    ],
    code: `// Misión 17: Telemetría RF 433 MHz — Tecnología Geogo
#include <DHT.h>
DHT dht(4, DHT11);

const int RF_TX = 11;
const int LED_TX = 13;

void setup() {
  dht.begin();
  pinMode(RF_TX, OUTPUT);
  pinMode(LED_TX, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  digitalWrite(LED_TX, HIGH);
  digitalWrite(RF_TX, HIGH);
  delay(80);
  digitalWrite(RF_TX, LOW);
  digitalWrite(LED_TX, LOW);

  Serial.println("RF 433 TX -> T=" + String(t, 1) + "C H=" + String(int(h)) + "%");
  delay(450);
}`,
  },
  {
    id: 'esp32-baliza',
    title: '18. ESP32 DevKit V1 — Baliza con Pulsador a 3.3 V',
    difficulty: 'ESP32 · 3.3 V',
    duration: '8 min',
    boardId: 'esp32',
    description:
      'Primer proyecto con ESP32 DevKit V1: lee un pulsador en GPIO4 y controla un LED azul en GPIO15 trabajando íntegramente a 3.3 V.',
    useBreadboard: true,
    components: [
      { uid: 'btn1', type: 'button', position: [0.6, 0.28, -0.87], snapHole: 'c3', label: 'Pulsador táctil', placementHint: 'Protoboard c3–c5' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'blue' }, snapHole: 'b14', label: 'LED Azul', placementHint: 'Protoboard b14–b15' },
    ],
    steps: [
      { from: 'board:G4', to: 'bb:e3', label: 'ESP32 GPIO4 → Protoboard e3', explanation: 'Lectura del botón con INPUT_PULLUP.', color: '#2563eb' },
      { from: 'bb:e5', to: 'bb:top-5', label: 'Protoboard e5 → Riel (-) top-5', explanation: 'Cierre a tierra.', color: '#22201c' },
      { from: 'board:G15', to: 'bb:e10', label: 'ESP32 GPIO15 → Protoboard e10', explanation: 'Salida hacia la resistencia limitadora.', color: '#2c7a4b' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
      { from: 'bb:top-2', to: 'board:GND_2', label: 'Riel (-) top-2 → ESP32 GND', explanation: 'Tierra común del ESP32.', color: '#22201c' },
    ],
    learnPoints: [
      'Los GPIO del ESP32 trabajan a 3.3 V nativos; utiliza siempre resistencias para proteger tus LEDs.',
    ],
    code: `// Misión 18: ESP32 — Baliza con Pulsador
const int BTN_PIN = 4;
const int LED_PIN = 15;

void setup() {
  pinMode(BTN_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  if (digitalRead(BTN_PIN) == LOW) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("ESP32: Baliza ACTIVA");
  } else {
    digitalWrite(LED_PIN, LOW);
  }
  delay(80);
}`,
  },
  {
    id: 'esp32-bme280-nativo',
    title: '19. ESP32 — Barómetro BME280 Directo a 3.3 V',
    difficulty: 'ESP32 · 3.3 V',
    duration: '10 min',
    boardId: 'esp32',
    description:
      'Comprueba la gran ventaja del ESP32 en Tecnología Geogo: su bus I²C (GPIO21 SDA / GPIO22 SCL) ya opera a 3.3 V, por lo que conecta directo al BME280 sin Level Shifter.',
    useBreadboard: true,
    components: [
      { uid: 'bme1', type: 'bme280', position: [2.8, 0.0, -3.5], props: { model: 'BME280' }, label: 'Barómetro BME280 (3.3 V)', placementHint: 'Mesa superior sobre la protoboard' },
    ],
    steps: [
      { from: 'board:3V3', to: 'comp:bme1:VCC', label: 'ESP32 3V3 → BME280 VCC', explanation: 'Alimentación directa a 3.3 V.', color: '#d4a007' },
      { from: 'board:GND_2', to: 'comp:bme1:GND', label: 'ESP32 GND → BME280 GND', explanation: 'Masa común.', color: '#22201c' },
      { from: 'board:G21', to: 'comp:bme1:SDA', label: 'ESP32 GPIO21 (SDA) → BME280 SDA', explanation: 'Línea SDA nativa 3.3 V.', color: '#2563eb' },
      { from: 'board:G22', to: 'comp:bme1:SCL', label: 'ESP32 GPIO22 (SCL) → BME280 SCL', explanation: 'Línea SCL nativa 3.3 V.', color: '#7a4fb3' },
    ],
    learnPoints: [
      'A diferencia del Arduino Uno (5 V), el ESP32 se comunica directamente a 3.3 V con módulos modernos.',
      'Solo 4 cables bastan para telemetría completa de presión, temperatura, humedad y altitud.',
    ],
    code: `// Misión 19: ESP32 + BME280 Directo (3.3 V nativo)
#include <Wire.h>
#include <Adafruit_BME280.h>

Adafruit_BME280 bme;

void setup() {
  Serial.begin(115200);
  bme.begin(0x76);
}

void loop() {
  float t = bme.readTemperature();
  float p = bme.readPressure() / 100.0;
  float alt = bme.readAltitude(1013.25);

  Serial.println("ESP32 BME280 -> T=" + String(t, 1) + "C | P=" + String(int(p)) + " hPa | Alt=" + String(int(alt)) + "m");
  delay(400);
}`,
  },
  {
    id: 'esp32-estacion-geogo',
    title: '20. ESP32 — Estación Geogo Multifunción (CO₂ + Luz)',
    difficulty: 'ESP32 · 3.3 V',
    duration: '15 min',
    boardId: 'esp32',
    description:
      'Integra lectura ADC de 12 bits (0–4095) en GPIO34 (CO₂) y GPIO35 (Luz) con alarma sonora y luminosa en el ESP32 DevKit V1.',
    useBreadboard: true,
    components: [
      { uid: 'ldr1', type: 'ldr', position: [1.0, 0.0, -3.5], label: 'Sensor de Luz (LDR)', placementHint: 'Mesa superior izquierda' },
      { uid: 'co2_1', type: 'co2-sensor', position: [3.8, 0.0, -3.5], label: 'Sensor CO₂ (ppm)', placementHint: 'Mesa superior derecha' },
      { uid: 'r1', type: 'resistor', position: [2.2, 0.28, -0.87], props: { ohms: 220 }, snapHole: 'c10', label: 'Resistencia 220 Ω', placementHint: 'Protoboard c10–c14' },
      { uid: 'led1', type: 'led', position: [2.9, 0.28, -0.63], props: { color: 'red' }, snapHole: 'b14', label: 'LED Alarma Rojo', placementHint: 'Protoboard b14–b15' },
      { uid: 'buz1', type: 'buzzer', position: [4.6, 0.28, -0.87], snapHole: 'c20', label: 'Buzzer piezoeléctrico', placementHint: 'Protoboard c20–c22' },
    ],
    steps: [
      { from: 'bb:top-2', to: 'board:GND_2', label: 'Riel (-) top-2 → ESP32 GND', explanation: 'Tierra común en el riel azul.', color: '#22201c' },
      { from: 'board:3V3', to: 'comp:ldr1:VCC', label: 'ESP32 3V3 → LDR VCC', explanation: 'Alimenta el LDR a 3.3 V seguros.', color: '#d4a007' },
      { from: 'bb:top-4', to: 'comp:ldr1:GND', label: 'Riel (-) top-4 → LDR GND', explanation: 'Masa del LDR.', color: '#22201c' },
      { from: 'board:G35', to: 'comp:ldr1:AO', label: 'ESP32 GPIO35 → LDR AO', explanation: 'ADC1_7 de 12 bits para luz.', color: '#2c7a4b' },
      { from: 'board:VIN', to: 'comp:co2_1:VCC', label: 'ESP32 VIN (5V) → CO₂ VCC', explanation: 'Energiza el módulo CO₂ desde VIN (5 V).', color: '#c8402f' },
      { from: 'bb:top-8', to: 'comp:co2_1:GND', label: 'Riel (-) top-8 → CO₂ GND', explanation: 'Masa del sensor CO₂.', color: '#22201c' },
      { from: 'board:G34', to: 'comp:co2_1:AO', label: 'ESP32 GPIO34 → CO₂ AO', explanation: 'ADC1_6 de 12 bits para concentración CO₂.', color: '#2563eb' },
      { from: 'board:G14', to: 'bb:e10', label: 'ESP32 GPIO14 → Protoboard e10', explanation: 'LED de alerta por aire viciado.', color: '#c8402f' },
      { from: 'bb:e15', to: 'bb:top-15', label: 'Protoboard e15 → Riel (-) top-15', explanation: 'Cátodo LED a tierra.', color: '#22201c' },
      { from: 'board:G13', to: 'bb:e20', label: 'ESP32 GPIO13 → Protoboard e20', explanation: 'Señal al buzzer.', color: '#7a4fb3' },
      { from: 'bb:e22', to: 'bb:top-22', label: 'Protoboard e22 → Riel (-) top-22', explanation: 'Tierra del buzzer.', color: '#22201c' },
    ],
    learnPoints: [
      'El ESP32 posee ADC de 12 bits (0–4095), 4 veces más resolución que Arduino Uno (0–1023).',
      'GPIO34 y GPIO35 son pines excelentes solo-entrada para sensores analógicos incluso usando Wi-Fi.',
    ],
    code: `// Misión 20: Estación Geogo ESP32 (ADC 12 bits)
const int PIN_CO2 = 34;
const int PIN_LUZ = 35;
const int LED_ALERTA = 14;
const int BUZ = 13;

void setup() {
  pinMode(LED_ALERTA, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  int ppm = map(analogRead(PIN_CO2), 0, 4095, 400, 3000);
  int luzPct = map(analogRead(PIN_LUZ), 0, 4095, 0, 100);

  Serial.println("CO2: " + String(ppm) + " ppm | Luz: " + String(luzPct) + "%");
  if (ppm >= 1400) {
    digitalWrite(LED_ALERTA, HIGH);
    tone(BUZ, 950, 150);
  } else {
    digitalWrite(LED_ALERTA, LOW);
    noTone(BUZ);
  }
  delay(350);
}`,
  },
  {
    id: 'libre',
    title: 'Modo Laboratorio Libre (Kit XL + Geogo)',
    difficulty: 'Libre',
    duration: 'Ilimitado',
    boardId: 'uno',
    description:
      'Mesa de trabajo abierta. Añade cualquier sensor (DHT11, BME280, CO₂, Óptico Rotativo, RF, Ultrasónico, LED RGB) o cambia entre Arduino Uno R3 y ESP32 para experimentar libremente.',
    useBreadboard: true,
    components: [],
    steps: [],
    learnPoints: [
      'Agrega componentes desde el catálogo de la izquierda.',
      'Haz clic en cualquier pin para trazar cables jumper con el color que elijas.',
      'Guarda tu circuito en .json o descarga tu sketch .ino para llevarlo al taller.',
    ],
    code: `// Laboratorio Libre — Liceo Bicentenario San Nicolás
// Área Premilitar · Tecnología Geogo

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Laboratorio Geogo listo.");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(350);
  digitalWrite(LED_BUILTIN, LOW);
  delay(350);
}`,
  },
];
