# Auditoría Comparativa y Plan Maestro de Mejora Integral
**Proyecto:** Simulador 3D Geogo — Liceo Bicentenario de Excelencia Polivalente San Nicolás (*Área Premilitar · Tecnología Geogo*)  
**Referencia auditada en vivo:** `https://robotics-lab-app.vercel.app/`  
**Versión objetivo:** `v0.1.0`

---

## 1. Hallazgos de la auditoría interactiva en vivo (`https://robotics-lab-app.vercel.app/`)

Se inspeccionó la web de referencia navegando e interactuando en Chrome con todas sus secciones y 5 misiones reales (`01 Hello, LED`, `02 Push to light`, `04 Servo follows the knob`, `05 Parking sensor` y `11 Robot: brain and muscle`):

### 1.1 Arquitectura y modelos 3D
- **100 % procedural en el navegador:** El pie de página de la propia web confirma explícitamente: *"Every model is built procedurally in your browser: geometry, traces, silkscreen and markings are drawn by code — no ready-made 3D files, no photos."* Utiliza Three.js (`OrbitControls`, `RoundedBoxGeometry`, `BufferGeometryUtils`) sin descargar archivos `.glb`, fotos ni `.mp3`.
- **Carga diferida:** El entorno 3D de la mesa de trabajo se inicializa cuando el usuario hace scroll hasta esa sección, y el modo de ensamblaje se carga bajo demanda.

### 1.2 Visor 3D de Placas (`Boards`)
- **8 placas:** Arduino Uno R3, Arduino Nano, Arduino Mega 2560 R3, ESP32 DevKit V1, NodeMCU (ESP8266), Raspberry Pi Pico, STM32 Blue Pill y Raspberry Pi 4 Model B.
- **Vistas de cámara:** `3/4`, `Top`, `Bottom` (reverso del PCB con pistas de cobre, pads soldados y serigrafía), `Front` y `Rotate` continuo.
- **Etiquetas (`Labels`):** Colapsa la tarjeta introductoria para dar espacio a una lista lateral deslizable con los componentes numerados; al seleccionar uno, la cámara vuela hacia esa pieza, se ilumina en tono ámbar y muestra su ficha explicativa con navegación `← / →`. En ESP32 advierte cuándo un componente está en el reverso.
- **Quiz (`Find the part`):** 6 preguntas funcionales, desactiva `Labels` automáticamente para evitar trampa, ofrece `Hint` (sin puntaje) y `Skip` (ilumina la respuesta).
- **Ensamblaje (`Assemble it`):** Desarma 18 piezas en una bandeja 3D siguiendo orden técnico real (*"Low parts first"*: chips y reguladores antes que headers altos y USB-B), incluye temporizador, barra de progreso y modo `Challenge` sin ayudas.
- **Botón `Lofi`:** Síntesis procedural en tiempo real mediante Web Audio API con 3 barras ecualizadoras animadas cuando reproduce y sincronizado entre header y mesa de trabajo.

### 1.3 Mesa de trabajo (`Workbench`)
- **11 misiones guiadas + `Free build`:** Cubre las 8 placas usando módulos breakout (LED, RGB, Buzzer, OLED, Pulsador, Potenciómetro, HC-SR04, DHT11, LDR, Servo SG90, Motor TT + L298N, 4×AA y Level Shifter) y mini-protoboard automática para placas macho como Arduino Nano.
- **Guía de cableado:** Badges naranjas sobre el par de pines activo (`D13 → SIG`), enlace `Show me` que traza ese paso individual, `Wire it for me` (que se oculta al completar todo el cableado), tarjeta verde *"Wiring complete. Press Run to power it up"* y botón `Run` verde al estar listo.
- **Tarjeta flotante `TRY IT`:** Controles en tiempo real sobre el lienzo 3D (botón momentáneo `Hold to press`, slider de potenciómetro con inercia angular realista del servo SG90, slider de distancia HC-SR04 con ondas ultrasónicas animadas).
- **Pestaña `Code`:** Solo lectura en la referencia (no permite editar el sketch ni descargarlo como `.ino`).
- **Edge cases detectados en la propia web de referencia (a evitar en la nuestra):**
  - El banner naranja de advertencia tras presionar `Run` sin cablear quedaba pegado aunque se completaran los cables después.
  - El monitor `Serial` re-renderizaba el DOM completo en cada línea, dificultando cambiar de pestaña mientras corre un bucle rápido.
  - Error 404 menor de `/favicon.ico`.

### 1.4 Lección Técnica (`02`) y Comparador (`04 — Compare`)
- **Lección:** Resumen editorial, 6 tarjetas KPI (`CLOCK`, `FLASH`, `RAM`, `GPIO PINS`, `LOGIC LEVEL`, `PRICE`), hoja técnica de 12 filas, tarjetas de partes clicables vinculadas al visor 3D, fortalezas/precauciones eléctricas, mapa de pines, primer código con botón `Copy`, aplicaciones y curiosidades.
- **Comparador:** Matriz comparativa de todas las placas con miniatura 3D, badge `ON THE BENCH` en la activa y clic en cualquier fila para cambiar la placa en visor y lección.

---

## 2. Matriz comparativa: Referencia vs. Simulador Geogo (Liceo San Nicolás)

| Dimensión | `robotics-lab-app.vercel.app` | Simulador Geogo (Antes) | Simulador Geogo (`v0.1.0`) |
|---|---|---|---|
| **Idioma y contexto** | Inglés genérico | Español · Liceo San Nicolás (Geogo) | Español · Liceo San Nicolás (Premilitar / Geogo) |
| **Protoboard 830 pts real** | Solo mini-BB para placas macho | Protoboard central, sin encaje en todas las misiones | **Protoboard real con pistas `a–e`/`f–j`, rieles `+`/`-` y encaje grilla 2.54 mm** |
| **Flujo al abrir misión** | Piezas pre-colocadas | Piezas pre-colocadas y cables atravesados | **Mesa limpia + Fase 1 (Colocar con animación) → Fase 2 (Cablear) → Ejecutar** |
| **Botones de asistencia** | `Show me` + `Wire it for me` | Solo `Cablear por mí` | **`Colocar piezas` + `Cablear por mí` + `Muéstrame` / `Colocar` / `Conectar` por paso** |
| **Cantidad de misiones** | 11 guiadas + Free build | 5 guiadas + Libre | **20 misiones guiadas (Uno + Kit XL + Geogo + ESP32) + Modo Libre** |
| **Sensores Geogo / Kit XL** | HC-SR04, DHT11, LDR, Servo, OLED, L298N | BME280/BMP280, CO₂, Encoder, RF, LCD, HC-SR04, LDR, Servo | **Todos los anteriores + `LED RGB` + `DHT11` (16 piezas configurables)** |
| **Editor y descarga `.ino`** | Código solo lectura | Editable + descarga `.ino` | **CodeMirror C++ editable + Restablecer + Copiar + Descarga `.ino`** |
| **Control en vivo `Pruébalo`** | Tarjeta `TRY IT` flotante en 3D | Solo dentro de pestaña Sensores | **Tarjeta flotante `Pruébalo` sobre el 3D + pestaña Sensores sincronizada** |
| **Audio realista** | Clics UI + buzzer | Pitido al presionar cualquier botón | **Clic mecánico filtrado en pulsadores + pitido exclusivo de Buzzer cableado** |
| **Sección `04 · Comparar`** | Matriz clicable | Ausente | **Sección `04 · Comparar Placas` interactiva (Uno R3 vs. ESP32 DevKit V1)** |
| **Persistencia de trabajo** | Ninguna (pierde al recargar) | Ninguna | **Progreso `X / 20` en `localStorage` + Guardar/Abrir proyectos `.json`** |

---

## 3. Falencias y bugs críticos detectados en nuestro código y su corrección

1. **Pitido incorrecto al presionar un pulsador sin buzzer (`workbench.ts`)**:
   - *Causa:* Al hacer clic en un `button` sobre el canvas 3D se ejecutaba `audio.playClick(900, 30)`, que generaba un tono de 900 Hz audible como pitido.
   - *Solución:* Implementar `audio.playSwitchClick()` basado en ruido blanco breve filtrado (`bandpass` 2400 Hz, 10 ms) para simular el clic plástico mecánico, reservando `audio.playTone()` exclusivamente para un `buzzer` conectado a su pin de señal y a `GND`.
2. **Cableado desordenado y pines desalineados en Misiones 2–5**:
   - *Causa:* Solo Misión 1 usaba `snapHole`. En las demás, `button` (`±0.28`) y `buzzer` (`±0.22`) no calzaban con el paso `0.254` de la protoboard y se cableaban directamente sobre los cuerpos de las piezas (`comp:*`). Además, en `breadboard.ts`, los rieles omiten las columnas `6, 12, 18, 24, 30` para crear los saltos visuales.
   - *Solución:* Alinear `button`, `buzzer`, `rgb-led`, `resistor` y `led` al múltiplo exacto `0.254`, implementar `computeSnappedPinsForHole()`, encajar todos los componentes through-hole en perforaciones reales y cablear exclusivamente hacia orificios libres y rieles válidos (`1–5, 7–11, 13–17, 19–23, 25–29`).
3. **Las misiones aparecían armadas desde el primer segundo**:
   - *Causa:* `loadMission()` instanciaba inmediatamente todos los componentes en la mesa.
   - *Solución:* Iniciar cada misión guiada con mesa limpia (`placa + protoboard`) y un flujo en 2 fases animadas (**Fase 1: Colocar componentes** → **Fase 2: Cablear**), con botón superior **`Colocar piezas`** y **`Cablear por mí`**, además de permitir que el alumno arme pieza por pieza desde el catálogo izquierdo o con clic en cada paso.
4. **Validación eléctrica parcial en sensores, I²C y circuitos sin código**:
   - *Causa:* Al presionar un botón no se recalculaba `netlist`, y módulos como `lcd-i2c`, `bme280`, `potentiometer`, `ldr` y `co2-sensor` respondían sin comprobar si tenían alimentación (`VCC`/`GND`) o líneas `SDA`/`SCL` válidas.
   - *Solución:* Exigir validación eléctrica real (`checkPowerSupply` y `checkI2CConnection`) en `workbench.ts` y recalcular `netlist` al instante al accionar pulsadores.

---

## 4. Evaluación técnica: ¿Backend o arquitectura Local-First?

Para un entorno escolar como el **Liceo Bicentenario San Nicolás**:
1. **Motor de simulación y compilador C++ 100 % en el navegador (Local-First):**
   - Mover la simulación eléctrica o el ciclo `loop()` a un servidor remoto añadiría latencia de red en cada `digitalWrite()` o lectura de sensor y dejaría el simulador inoperativo si falla Internet en el laboratorio. Por tanto, **el análisis nodal (`netlist.ts`), el intérprete (`runtime.ts`), el WebGL 3D y la descarga `.ino` deben permanecer 100 % del lado del cliente**.
2. **Persistencia inmediata implementada en `v0.1.0`:**
   - Guardado automático de misiones completadas (`X / 20`) en `localStorage`.
   - Exportación e importación de circuitos completos en archivo `.json` (placa, ubicación exacta de piezas, cables y sketch modificado) para que los estudiantes guarden su avance en un pendrive o Classroom y lo reabran en otra clase.
3. **Backend ligero opcional (Fase futura para gestión docente):**
   - Si más adelante se requiere seguimiento centralizado por curso, bastaría agregar una API REST liviana (Node.js + PostgreSQL/SQLite o Supabase) con dos tablas (`estudiantes`, `entregas`) que reciba exactamente el mismo payload `.json` + `.ino` ya estructurado en `workbench.ts`.
