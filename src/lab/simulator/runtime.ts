import type { BoardId } from '../../types';

export interface SimHardwareBridge {
  boardId: BoardId;
  onPinMode?: (pin: string, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP') => void;
  onDigitalWrite?: (pin: string, value: 0 | 1) => void;
  onAnalogWrite?: (pin: string, value: number) => void;
  onDigitalRead?: (pin: string) => 0 | 1;
  onAnalogRead?: (pin: string) => number;
  onPulseIn?: (pin: string, state: 0 | 1) => number;
  onTone?: (pin: string, freq: number, duration?: number) => void;
  onNoTone?: (pin: string) => void;
  onSerialBegin?: (baud: number) => void;
  onSerialPrint?: (text: string, newline: boolean) => void;
  onSerialAvailable?: () => number;
  onSerialRead?: () => number;
  onSerialReadString?: () => string;
  onServoWrite?: (pin: string, angle: number) => void;
  onLcdUpdate?: (line0: string, line1: string, backlight: boolean) => void;
  onBmeRead?: () => { tempC: number; pressureHpa: number; humidity: number; altitudeM: number };
  onDhtRead?: (pin: string) => { tempC: number; humidity: number };
}

export class ArduinoCompileError extends Error {
  public line: number;
  constructor(message: string, line = 1) {
    super(message);
    this.line = line;
  }
}

interface Token {
  type: 'num' | 'str' | 'char' | 'id' | 'op' | 'punc' | 'eof';
  value: string;
  line: number;
}

function stripPreprocessorAndComments(src: string): { code: string; defines: Map<string, string>; includes: string[] } {
  const defines = new Map<string, string>();
  const includes: string[] = [];
  const lines = src.split(/\r?\n/);
  const outLines: string[] = [];
  let inBlockComment = false;

  for (const rawLine of lines) {
    let line = '';
    let i = 0;
    let inString = false;
    while (i < rawLine.length) {
      if (inBlockComment) {
        if (rawLine[i] === '*' && rawLine[i + 1] === '/') {
          inBlockComment = false;
          i += 2;
        } else {
          i++;
        }
        continue;
      }
      if (!inString && rawLine[i] === '/' && rawLine[i + 1] === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
      if (!inString && rawLine[i] === '/' && rawLine[i + 1] === '/') {
        break;
      }
      if (rawLine[i] === '"' && rawLine[i - 1] !== '\\') {
        inString = !inString;
      }
      line += rawLine[i++];
    }

    const trimmed = line.trim();
    if (trimmed.startsWith('#include')) {
      includes.push(trimmed);
      outLines.push('');
      continue;
    }
    if (trimmed.startsWith('#define')) {
      const m = /^#define\s+([A-Za-z_]\w*)\s+(.+)$/.exec(trimmed);
      if (m) defines.set(m[1], m[2].trim());
      outLines.push('');
      continue;
    }
    outLines.push(line);
  }

  return { code: outLines.join('\n'), defines, includes };
}

function tokenize(src: string, defines: Map<string, string>): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;

  const twoCharOps = new Set(['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '<<', '>>']);
  const puncs = new Set(['(', ')', '{', '}', '[', ']', ';', ',', '.', ':']);

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      line++;
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '"') {
      let s = '';
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          const esc = src[i + 1];
          s += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
          i += 2;
        } else {
          if (src[i] === '\n') line++;
          s += src[i++];
        }
      }
      if (i >= src.length) throw new ArduinoCompileError('Cadena de texto sin comilla de cierre "', line);
      i++;
      tokens.push({ type: 'str', value: s, line });
      continue;
    }

    if (ch === "'") {
      i++;
      const c = src[i] ?? '';
      i++;
      if (src[i] === "'") i++;
      tokens.push({ type: 'char', value: c, line });
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) {
      let num = '';
      if (ch === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        num = '0x';
        i += 2;
        while (i < src.length && /[0-9a-fA-F]/.test(src[i])) num += src[i++];
      } else {
        while (i < src.length && /[\d.]/.test(src[i])) num += src[i++];
      }
      tokens.push({ type: 'num', value: num, line });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let id = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) id += src[i++];
      if (defines.has(id)) {
        const sub = tokenize(defines.get(id)!, new Map());
        for (const t of sub) {
          if (t.type !== 'eof') tokens.push({ ...t, line });
        }
      } else {
        tokens.push({ type: 'id', value: id, line });
      }
      continue;
    }

    const two = src.slice(i, i + 2);
    if (twoCharOps.has(two)) {
      tokens.push({ type: 'op', value: two, line });
      i += 2;
      continue;
    }

    if (puncs.has(ch)) {
      tokens.push({ type: 'punc', value: ch, line });
      i++;
      continue;
    }

    if ('+-*/%<>=!&|^~?'.includes(ch)) {
      tokens.push({ type: 'op', value: ch, line });
      i++;
      continue;
    }

    throw new ArduinoCompileError(`Carácter inesperado "${ch}"`, line);
  }

  tokens.push({ type: 'eof', value: '', line });
  return tokens;
}

type Stmt =
  | { kind: 'block'; body: Stmt[] }
  | { kind: 'var'; name: string; init?: Expr; isArray?: boolean; line: number }
  | { kind: 'expr'; expr: Expr; line: number }
  | { kind: 'if'; cond: Expr; then: Stmt; elseStmt?: Stmt; line: number }
  | { kind: 'while'; cond: Expr; body: Stmt; line: number }
  | { kind: 'for'; init?: Stmt; cond?: Expr; step?: Expr; body: Stmt; line: number }
  | { kind: 'return'; expr?: Expr; line: number }
  | { kind: 'break'; line: number }
  | { kind: 'continue'; line: number }
  | { kind: 'empty' };

type Expr =
  | { kind: 'lit'; value: any }
  | { kind: 'var'; name: string }
  | { kind: 'array'; items: Expr[] }
  | { kind: 'index'; obj: Expr; index: Expr }
  | { kind: 'member'; obj: Expr; prop: string }
  | { kind: 'call'; callee: Expr; args: Expr[]; line: number }
  | { kind: 'unary'; op: string; arg: Expr; prefix: boolean }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'assign'; op: string; left: Expr; right: Expr }
  | { kind: 'ternary'; cond: Expr; a: Expr; b: Expr };

interface FuncDecl {
  name: string;
  params: string[];
  body: Stmt;
}

const TYPE_KEYWORDS = new Set([
  'void', 'int', 'long', 'unsigned', 'short', 'byte', 'float', 'double',
  'bool', 'boolean', 'char', 'String', 'uint8_t', 'uint16_t', 'uint32_t',
  'Servo', 'LiquidCrystal_I2C', 'Adafruit_BME280', 'Adafruit_BMP280', 'DHT',
]);

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private match(type: Token['type'], val?: string): boolean {
    const t = this.peek();
    if (t.type !== type) return false;
    if (val !== undefined && t.value !== val) return false;
    this.pos++;
    return true;
  }

  private expect(type: Token['type'], val: string, msg?: string): Token {
    const t = this.peek();
    if (t.type !== type || t.value !== val) {
      throw new ArduinoCompileError(msg ?? `Se esperaba "${val}" y se encontró "${t.value || 'fin de archivo'}"`, t.line);
    }
    return this.next();
  }

  private isTypeStart(): boolean {
    const t = this.peek();
    if (t.type !== 'id') return false;
    if (t.value === 'const' || t.value === 'static') return true;
    return TYPE_KEYWORDS.has(t.value);
  }

  private consumeType(): string {
    while (this.peek().type === 'id' && (this.peek().value === 'const' || this.peek().value === 'static' || this.peek().value === 'unsigned')) {
      this.next();
    }
    const base = this.next();
    return base.value;
  }

  public parseProgram(): { globals: Stmt[]; funcs: Map<string, FuncDecl> } {
    const globals: Stmt[] = [];
    const funcs = new Map<string, FuncDecl>();

    while (this.peek().type !== 'eof') {
      if (this.isTypeStart()) {
        const typeName = this.consumeType();
        const nameTok = this.peek();
        if (nameTok.type !== 'id') {
          throw new ArduinoCompileError(`Nombre de identificador inválido "${nameTok.value}"`, nameTok.line);
        }
        const name = this.next().value;

        // Function declaration: type name(...) { ... }
        if (this.match('punc', '(')) {
          // Check if it's an object constructor like LiquidCrystal_I2C lcd(0x27, 16, 2); or DHT dht(4, DHT11);
          if (typeName === 'LiquidCrystal_I2C' || typeName === 'Servo' || typeName === 'Adafruit_BME280' || typeName === 'DHT') {
            const args: Expr[] = [];
            if (!this.match('punc', ')')) {
              do {
                args.push(this.parseExpr());
              } while (this.match('punc', ','));
              this.expect('punc', ')');
            }
            this.expect('punc', ';', 'Falta ";" al final de la declaración');
            globals.push({
              kind: 'var',
              name,
              init: { kind: 'call', callee: { kind: 'var', name: `__ctor_${typeName}` }, args, line: nameTok.line },
              line: nameTok.line,
            });
            continue;
          }

          const params: string[] = [];
          if (!this.match('punc', ')')) {
            do {
              if (this.isTypeStart()) this.consumeType();
              if (this.peek().type === 'id') params.push(this.next().value);
              if (this.match('punc', '[')) this.match('punc', ']');
            } while (this.match('punc', ','));
            this.expect('punc', ')');
          }
          const body = this.parseBlock();
          funcs.set(name, { name, params, body });
          continue;
        }

        // Global variable declaration
        globals.push(this.finishVarDecl(typeName, name, nameTok.line));
        continue;
      }

      throw new ArduinoCompileError(`Instrucción fuera de función no reconocida: "${this.peek().value}"`, this.peek().line);
    }

    return { globals, funcs };
  }

  private finishVarDecl(typeName: string, name: string, line: number): Stmt {
    let isArray = false;
    if (this.match('punc', '[')) {
      isArray = true;
      if (!this.match('punc', ']')) {
        this.parseExpr();
        this.expect('punc', ']');
      }
    }
    let init: Expr | undefined;
    if (this.match('op', '=')) {
      if (this.match('punc', '{')) {
        const items: Expr[] = [];
        if (!this.match('punc', '}')) {
          do {
            items.push(this.parseExpr());
          } while (this.match('punc', ','));
          this.expect('punc', '}');
        }
        init = { kind: 'array', items };
      } else {
        init = this.parseExpr();
      }
    } else if (typeName === 'Servo' || typeName === 'Adafruit_BME280' || typeName === 'Adafruit_BMP280') {
      init = { kind: 'call', callee: { kind: 'var', name: `__ctor_${typeName}` }, args: [], line };
    }
    this.expect('punc', ';', 'Falta ";" al final de la declaración de variable');
    return { kind: 'var', name, init, isArray, line };
  }

  private parseBlock(): Stmt {
    const start = this.expect('punc', '{');
    const body: Stmt[] = [];
    while (!this.match('punc', '}')) {
      if (this.peek().type === 'eof') {
        throw new ArduinoCompileError('Falta llave de cierre "}"', start.line);
      }
      body.push(this.parseStmt());
    }
    return { kind: 'block', body };
  }

  private parseStmt(): Stmt {
    const t = this.peek();
    if (t.type === 'punc' && t.value === '{') return this.parseBlock();
    if (this.match('punc', ';')) return { kind: 'empty' };

    if (t.type === 'id' && t.value === 'if') {
      this.next();
      this.expect('punc', '(');
      const cond = this.parseExpr();
      this.expect('punc', ')');
      const then = this.parseStmt();
      let elseStmt: Stmt | undefined;
      if (this.peek().type === 'id' && this.peek().value === 'else') {
        this.next();
        elseStmt = this.parseStmt();
      }
      return { kind: 'if', cond, then, elseStmt, line: t.line };
    }

    if (t.type === 'id' && t.value === 'while') {
      this.next();
      this.expect('punc', '(');
      const cond = this.parseExpr();
      this.expect('punc', ')');
      const body = this.parseStmt();
      return { kind: 'while', cond, body, line: t.line };
    }

    if (t.type === 'id' && t.value === 'for') {
      this.next();
      this.expect('punc', '(');
      let init: Stmt | undefined;
      if (!this.match('punc', ';')) {
        if (this.isTypeStart()) {
          const tn = this.consumeType();
          const vname = this.next();
          init = this.finishVarDecl(tn, vname.value, vname.line);
        } else {
          init = { kind: 'expr', expr: this.parseExpr(), line: t.line };
          this.expect('punc', ';');
        }
      }
      let cond: Expr | undefined;
      if (!this.match('punc', ';')) {
        cond = this.parseExpr();
        this.expect('punc', ';');
      }
      let step: Expr | undefined;
      if (!this.match('punc', ')')) {
        step = this.parseExpr();
        this.expect('punc', ')');
      }
      const body = this.parseStmt();
      return { kind: 'for', init, cond, step, body, line: t.line };
    }

    if (t.type === 'id' && t.value === 'return') {
      this.next();
      let expr: Expr | undefined;
      if (!this.match('punc', ';')) {
        expr = this.parseExpr();
        this.expect('punc', ';', 'Falta ";" después de return');
      }
      return { kind: 'return', expr, line: t.line };
    }

    if (t.type === 'id' && t.value === 'break') {
      this.next();
      this.expect('punc', ';');
      return { kind: 'break', line: t.line };
    }

    if (t.type === 'id' && t.value === 'continue') {
      this.next();
      this.expect('punc', ';');
      return { kind: 'continue', line: t.line };
    }

    if (this.isTypeStart()) {
      const tn = this.consumeType();
      const vname = this.next();
      if (this.match('punc', '(')) {
        const args: Expr[] = [];
        if (!this.match('punc', ')')) {
          do {
            args.push(this.parseExpr());
          } while (this.match('punc', ','));
          this.expect('punc', ')');
        }
        this.expect('punc', ';');
        return {
          kind: 'var',
          name: vname.value,
          init: { kind: 'call', callee: { kind: 'var', name: `__ctor_${tn}` }, args, line: vname.line },
          line: vname.line,
        };
      }
      return this.finishVarDecl(tn, vname.value, vname.line);
    }

    const expr = this.parseExpr();
    this.expect('punc', ';', 'Falta punto y coma ";" al final de la instrucción');
    return { kind: 'expr', expr, line: t.line };
  }

  private parseExpr(): Expr {
    return this.parseAssign();
  }

  private parseAssign(): Expr {
    const left = this.parseTernary();
    const t = this.peek();
    if (t.type === 'op' && ['=', '+=', '-=', '*=', '/='].includes(t.value)) {
      this.next();
      const right = this.parseAssign();
      return { kind: 'assign', op: t.value, left, right };
    }
    return left;
  }

  private parseTernary(): Expr {
    const cond = this.parseOr();
    if (this.match('op', '?')) {
      const a = this.parseExpr();
      this.expect('punc', ':');
      const b = this.parseTernary();
      return { kind: 'ternary', cond, a, b };
    }
    return cond;
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.match('op', '||')) {
      left = { kind: 'binary', op: '||', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseEq();
    while (this.match('op', '&&')) {
      left = { kind: 'binary', op: '&&', left, right: this.parseEq() };
    }
    return left;
  }

  private parseEq(): Expr {
    let left = this.parseRel();
    while (this.peek().type === 'op' && (this.peek().value === '==' || this.peek().value === '!=')) {
      const op = this.next().value;
      left = { kind: 'binary', op, left, right: this.parseRel() };
    }
    return left;
  }

  private parseRel(): Expr {
    let left = this.parseAdd();
    while (this.peek().type === 'op' && ['<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: 'binary', op, left, right: this.parseAdd() };
    }
    return left;
  }

  private parseAdd(): Expr {
    let left = this.parseMul();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      left = { kind: 'binary', op, left, right: this.parseMul() };
    }
    return left;
  }

  private parseMul(): Expr {
    let left = this.parseUnary();
    while (this.peek().type === 'op' && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: 'binary', op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t.type === 'op' && ['!', '-', '+', '++', '--'].includes(t.value)) {
      this.next();
      return { kind: 'unary', op: t.value, arg: this.parseUnary(), prefix: true };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match('punc', '(')) {
        const line = this.peek().line;
        const args: Expr[] = [];
        if (!this.match('punc', ')')) {
          do {
            args.push(this.parseExpr());
          } while (this.match('punc', ','));
          this.expect('punc', ')');
        }
        expr = { kind: 'call', callee: expr, args, line };
      } else if (this.match('punc', '.')) {
        const prop = this.next();
        expr = { kind: 'member', obj: expr, prop: prop.value };
      } else if (this.match('punc', '[')) {
        const index = this.parseExpr();
        this.expect('punc', ']');
        expr = { kind: 'index', obj: expr, index };
      } else if (this.peek().type === 'op' && (this.peek().value === '++' || this.peek().value === '--')) {
        const op = this.next().value;
        expr = { kind: 'unary', op, arg: expr, prefix: false };
      } else {
        break;
      }
    }
    return expr;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.type === 'num') {
      this.next();
      return { kind: 'lit', value: t.value.startsWith('0x') ? parseInt(t.value, 16) : Number(t.value) };
    }
    if (t.type === 'str') {
      this.next();
      return { kind: 'lit', value: t.value };
    }
    if (t.type === 'char') {
      this.next();
      return { kind: 'lit', value: t.value.charCodeAt(0) };
    }
    if (t.type === 'id') {
      this.next();
      if (t.value === 'true') return { kind: 'lit', value: true };
      if (t.value === 'false') return { kind: 'lit', value: false };
      return { kind: 'var', name: t.value };
    }
    if (this.match('punc', '(')) {
      const expr = this.parseExpr();
      this.expect('punc', ')');
      return expr;
    }
    throw new ArduinoCompileError(`Expresión inesperada "${t.value || 'fin'}"`, t.line);
  }
}

class ReturnSignal {
  public value: any;
  constructor(value: any) {
    this.value = value;
  }
}
class BreakSignal {}
class ContinueSignal {}

function normalizePinArg(raw: any, boardId: BoardId): string {
  if (typeof raw === 'string') {
    if (/^\d+$/.test(raw)) return normalizePinArg(Number(raw), boardId);
    return raw.toUpperCase();
  }
  const n = Number(raw);
  if (boardId === 'uno') {
    if (n >= 14 && n <= 19) return `A${n - 14}`;
    return `D${n}`;
  }
  return `G${n}`;
}

export class ArduinoRuntime {
  private bridge: SimHardwareBridge;
  private funcs = new Map<string, FuncDecl>();
  private globalScope = new Map<string, any>();
  private running = false;
  private abortCtrl: AbortController | null = null;
  private startMs = 0;
  private interrupts = new Map<string, { fnName: string; lastVal: 0 | 1 }>();

  constructor(bridge: SimHardwareBridge) {
    this.bridge = bridge;
  }

  public compile(source: string): void {
    const { code, defines } = stripPreprocessorAndComments(source);
    const tokens = tokenize(code, defines);
    const parser = new Parser(tokens);
    const { globals, funcs } = parser.parseProgram();
    this.funcs = funcs;

    if (!funcs.has('setup')) {
      throw new ArduinoCompileError('El código debe incluir la función void setup() { ... }', 1);
    }
    if (!funcs.has('loop')) {
      throw new ArduinoCompileError('El código debe incluir la función void loop() { ... }', 1);
    }

    this.globalScope = new Map<string, any>();
    this.initBuiltins(this.globalScope);
    for (const g of globals) {
      if (g.kind === 'var') {
        const val = g.init ? this.evalExprSync(g.init, this.globalScope) : 0;
        this.globalScope.set(g.name, val);
      }
    }
  }

  private initBuiltins(scope: Map<string, any>): void {
    const isUno = this.bridge.boardId === 'uno';
    scope.set('HIGH', 1);
    scope.set('LOW', 0);
    scope.set('INPUT', 'INPUT');
    scope.set('OUTPUT', 'OUTPUT');
    scope.set('INPUT_PULLUP', 'INPUT_PULLUP');
    scope.set('RISING', 'RISING');
    scope.set('FALLING', 'FALLING');
    scope.set('CHANGE', 'CHANGE');
    scope.set('DHT11', 11);
    scope.set('LED_BUILTIN', isUno ? 13 : 2);
    scope.set('A0', isUno ? 'A0' : 'G36');
    scope.set('A1', isUno ? 'A1' : 'G39');
    scope.set('A2', isUno ? 'A2' : 'G34');
    scope.set('A3', isUno ? 'A3' : 'G35');
    scope.set('A4', isUno ? 'A4' : 'G32');
    scope.set('A5', isUno ? 'A5' : 'G33');

    scope.set('Serial', {
      begin: (baud: number) => this.bridge.onSerialBegin?.(Number(baud) || 9600),
      print: (v: any) => this.bridge.onSerialPrint?.(String(v ?? ''), false),
      println: (v: any = '') => this.bridge.onSerialPrint?.(String(v), true),
      available: () => this.bridge.onSerialAvailable?.() ?? 0,
      read: () => this.bridge.onSerialRead?.() ?? -1,
      readString: () => this.bridge.onSerialReadString?.() ?? '',
    });

    scope.set('Wire', {
      begin: () => {},
    });

    scope.set('__ctor_Servo', () => {
      let attachedPin = 'D9';
      let currentAngle = 90;
      return {
        attach: (pin: any) => {
          attachedPin = normalizePinArg(pin, this.bridge.boardId);
        },
        write: (angle: number) => {
          currentAngle = Math.max(0, Math.min(180, Number(angle) || 0));
          this.bridge.onServoWrite?.(attachedPin, currentAngle);
        },
        read: () => currentAngle,
      };
    });

    scope.set('__ctor_LiquidCrystal_I2C', () => {
      let lines = ['', ''];
      let cursorRow = 0;
      let cursorCol = 0;
      let backlight = true;
      const push = () => this.bridge.onLcdUpdate?.(lines[0], lines[1], backlight);
      return {
        init: () => push(),
        begin: () => push(),
        backlight: () => {
          backlight = true;
          push();
        },
        noBacklight: () => {
          backlight = false;
          push();
        },
        clear: () => {
          lines = ['', ''];
          cursorCol = 0;
          cursorRow = 0;
          push();
        },
        setCursor: (col: number, row: number) => {
          cursorCol = Math.max(0, Math.min(15, Number(col) || 0));
          cursorRow = Math.max(0, Math.min(1, Number(row) || 0));
        },
        print: (val: any) => {
          const text = String(val ?? '');
          const base = lines[cursorRow].padEnd(16, ' ').split('');
          for (let i = 0; i < text.length && cursorCol + i < 16; i++) {
            base[cursorCol + i] = text[i];
          }
          lines[cursorRow] = base.join('').trimEnd();
          cursorCol = Math.min(16, cursorCol + text.length);
          push();
        },
      };
    });

    const makeBmeObj = () => ({
      begin: () => true,
      readTemperature: () => this.bridge.onBmeRead?.().tempC ?? 22.4,
      readPressure: () => (this.bridge.onBmeRead?.().pressureHpa ?? 1013.25) * 100,
      readHumidity: () => this.bridge.onBmeRead?.().humidity ?? 52.0,
      readAltitude: (seaLevel = 1013.25) => {
        const p = this.bridge.onBmeRead?.().pressureHpa ?? 1013.25;
        return 44330 * (1 - Math.pow(p / seaLevel, 0.1903));
      },
    });
    scope.set('__ctor_Adafruit_BME280', makeBmeObj);
    scope.set('__ctor_Adafruit_BMP280', makeBmeObj);

    scope.set('__ctor_DHT', (pinArg: any) => {
      const dhtPin = normalizePinArg(pinArg ?? 4, this.bridge.boardId);
      return {
        begin: () => {},
        readTemperature: () => this.bridge.onDhtRead?.(dhtPin)?.tempC ?? 22.0,
        readHumidity: () => this.bridge.onDhtRead?.(dhtPin)?.humidity ?? 52.0,
      };
    });
  }

  public async start(source: string): Promise<void> {
    this.stop();
    this.compile(source);
    this.running = true;
    this.startMs = performance.now();
    this.interrupts.clear();
    this.abortCtrl = new AbortController();
    const signal = this.abortCtrl.signal;

    try {
      await this.callUserFunc('setup', [], signal);
      while (this.running && !signal.aborted) {
        await this.checkInterrupts(signal);
        await this.callUserFunc('loop', [], signal);
        // Yield to browser event loop
        await this.sleep(16, signal);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') throw err;
    }
  }

  public stop(): void {
    this.running = false;
    this.abortCtrl?.abort();
    this.abortCtrl = null;
    this.bridge.onNoTone?.('');
  }

  private async checkInterrupts(signal: AbortSignal): Promise<void> {
    for (const [pin, info] of this.interrupts.entries()) {
      const val = this.bridge.onDigitalRead?.(pin) ?? 0;
      if (val !== info.lastVal && val === 1) {
        info.lastVal = val;
        await this.callUserFunc(info.fnName, [], signal);
      } else {
        info.lastVal = val;
      }
    }
  }

  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      const id = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, Math.max(0, ms));
      const onAbort = () => {
        clearTimeout(id);
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  private findVarScope(name: string, scopes: Map<string, any>[]): Map<string, any> {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].has(name)) return scopes[i];
    }
    return scopes[0];
  }

  private async callUserFunc(name: string, args: any[], signal: AbortSignal): Promise<any> {
    const fn = this.funcs.get(name);
    if (!fn) return undefined;
    const local = new Map<string, any>();
    fn.params.forEach((p, idx) => local.set(p, args[idx]));
    try {
      await this.execStmt(fn.body, [this.globalScope, local], signal);
    } catch (sig) {
      if (sig instanceof ReturnSignal) return sig.value;
      throw sig;
    }
    return undefined;
  }

  private evalExprSync(expr: Expr, scope: Map<string, any>): any {
    if (expr.kind === 'lit') return expr.value;
    if (expr.kind === 'var') return scope.get(expr.name);
    if (expr.kind === 'array') return expr.items.map((x) => this.evalExprSync(x, scope));
    if (expr.kind === 'call' && expr.callee.kind === 'var') {
      const fn = scope.get(expr.callee.name);
      if (typeof fn === 'function') {
        return fn(...expr.args.map((a) => this.evalExprSync(a, scope)));
      }
    }
    if (expr.kind === 'unary' && expr.op === '-') {
      return -Number(this.evalExprSync(expr.arg, scope));
    }
    return 0;
  }

  private async execStmt(stmt: Stmt, scopes: Map<string, any>[], signal: AbortSignal): Promise<void> {
    if (!this.running || signal.aborted) return;

    switch (stmt.kind) {
      case 'empty':
        return;
      case 'block': {
        const blockScope = new Map<string, any>();
        const nextScopes = [...scopes, blockScope];
        for (const s of stmt.body) {
          await this.execStmt(s, nextScopes, signal);
        }
        return;
      }
      case 'var': {
        const val = stmt.init ? await this.evalExpr(stmt.init, scopes, signal) : 0;
        scopes[scopes.length - 1].set(stmt.name, val);
        return;
      }
      case 'expr':
        await this.evalExpr(stmt.expr, scopes, signal);
        return;
      case 'if': {
        const c = await this.evalExpr(stmt.cond, scopes, signal);
        if (c) await this.execStmt(stmt.then, scopes, signal);
        else if (stmt.elseStmt) await this.execStmt(stmt.elseStmt, scopes, signal);
        return;
      }
      case 'while': {
        let guard = 0;
        while (this.running && !signal.aborted && (await this.evalExpr(stmt.cond, scopes, signal))) {
          try {
            await this.execStmt(stmt.body, scopes, signal);
          } catch (s) {
            if (s instanceof BreakSignal) break;
            if (s instanceof ContinueSignal) continue;
            throw s;
          }
          if (++guard % 200 === 0) await this.sleep(1, signal);
        }
        return;
      }
      case 'for': {
        const loopScope = new Map<string, any>();
        const nextScopes = [...scopes, loopScope];
        if (stmt.init) await this.execStmt(stmt.init, nextScopes, signal);
        let guard = 0;
        while (this.running && !signal.aborted) {
          if (stmt.cond && !(await this.evalExpr(stmt.cond, nextScopes, signal))) break;
          try {
            await this.execStmt(stmt.body, nextScopes, signal);
          } catch (s) {
            if (s instanceof BreakSignal) break;
            if (!(s instanceof ContinueSignal)) throw s;
          }
          if (stmt.step) await this.evalExpr(stmt.step, nextScopes, signal);
          if (++guard % 200 === 0) await this.sleep(1, signal);
        }
        return;
      }
      case 'return':
        throw new ReturnSignal(stmt.expr ? await this.evalExpr(stmt.expr, scopes, signal) : undefined);
      case 'break':
        throw new BreakSignal();
      case 'continue':
        throw new ContinueSignal();
    }
  }

  private async evalExpr(expr: Expr, scopes: Map<string, any>[], signal: AbortSignal): Promise<any> {
    switch (expr.kind) {
      case 'lit':
        return expr.value;
      case 'var':
        return this.findVarScope(expr.name, scopes).get(expr.name);
      case 'array': {
        const out = [];
        for (const it of expr.items) out.push(await this.evalExpr(it, scopes, signal));
        return out;
      }
      case 'index': {
        const arr = await this.evalExpr(expr.obj, scopes, signal);
        const idx = Number(await this.evalExpr(expr.index, scopes, signal));
        return Array.isArray(arr) ? arr[idx] : undefined;
      }
      case 'member': {
        const obj = await this.evalExpr(expr.obj, scopes, signal);
        if (obj && typeof obj === 'object') return obj[expr.prop];
        return undefined;
      }
      case 'unary': {
        if (expr.op === '!') return !(await this.evalExpr(expr.arg, scopes, signal));
        if (expr.op === '-') return -Number(await this.evalExpr(expr.arg, scopes, signal));
        if (expr.op === '+') return +Number(await this.evalExpr(expr.arg, scopes, signal));
        if ((expr.op === '++' || expr.op === '--') && expr.arg.kind === 'var') {
          const sc = this.findVarScope(expr.arg.name, scopes);
          const cur = Number(sc.get(expr.arg.name) ?? 0);
          const nxt = expr.op === '++' ? cur + 1 : cur - 1;
          sc.set(expr.arg.name, nxt);
          return expr.prefix ? nxt : cur;
        }
        return 0;
      }
      case 'binary': {
        if (expr.op === '&&') return Boolean(await this.evalExpr(expr.left, scopes, signal)) && Boolean(await this.evalExpr(expr.right, scopes, signal));
        if (expr.op === '||') return Boolean(await this.evalExpr(expr.left, scopes, signal)) || Boolean(await this.evalExpr(expr.right, scopes, signal));
        const l = await this.evalExpr(expr.left, scopes, signal);
        const r = await this.evalExpr(expr.right, scopes, signal);
        switch (expr.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r === 0 ? 0 : l / r;
          case '%': return l % r;
          case '==': return l == r;
          case '!=': return l != r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
        }
        return 0;
      }
      case 'assign': {
        const val = await this.evalExpr(expr.right, scopes, signal);
        if (expr.left.kind === 'var') {
          const sc = this.findVarScope(expr.left.name, scopes);
          const cur = sc.get(expr.left.name);
          const nxt =
            expr.op === '=' ? val :
            expr.op === '+=' ? cur + val :
            expr.op === '-=' ? cur - val :
            expr.op === '*=' ? cur * val :
            cur / val;
          sc.set(expr.left.name, nxt);
          return nxt;
        }
        if (expr.left.kind === 'index') {
          const arr = await this.evalExpr(expr.left.obj, scopes, signal);
          const idx = Number(await this.evalExpr(expr.left.index, scopes, signal));
          if (Array.isArray(arr)) arr[idx] = val;
          return val;
        }
        return val;
      }
      case 'ternary':
        return (await this.evalExpr(expr.cond, scopes, signal))
          ? await this.evalExpr(expr.a, scopes, signal)
          : await this.evalExpr(expr.b, scopes, signal);
      case 'call':
        return this.evalCall(expr.callee, expr.args, expr.line, scopes, signal);
    }
  }

  private async evalCall(
    callee: Expr,
    argExprs: Expr[],
    line: number,
    scopes: Map<string, any>[],
    signal: AbortSignal
  ): Promise<any> {
    if (callee.kind === 'member') {
      const obj = await this.evalExpr(callee.obj, scopes, signal);
      const args = [];
      for (const a of argExprs) args.push(await this.evalExpr(a, scopes, signal));
      const fn = obj?.[callee.prop];
      if (typeof fn === 'function') return fn(...args);
      throw new ArduinoCompileError(`Método desconocido "${callee.prop}"`, line);
    }

    if (callee.kind !== 'var') return undefined;
    const name = callee.name;

    if (name === 'attachInterrupt') {
      const pinArg = await this.evalExpr(argExprs[0], scopes, signal);
      const fnName = argExprs[1]?.kind === 'var' ? argExprs[1].name : '';
      const pinId = normalizePinArg(pinArg, this.bridge.boardId);
      if (fnName) this.interrupts.set(pinId, { fnName, lastVal: 0 });
      return;
    }

    const args: any[] = [];
    for (const a of argExprs) args.push(await this.evalExpr(a, scopes, signal));

    switch (name) {
      case 'pinMode':
        this.bridge.onPinMode?.(normalizePinArg(args[0], this.bridge.boardId), args[1]);
        return;
      case 'digitalWrite':
        this.bridge.onDigitalWrite?.(normalizePinArg(args[0], this.bridge.boardId), args[1] ? 1 : 0);
        return;
      case 'analogWrite':
        this.bridge.onAnalogWrite?.(normalizePinArg(args[0], this.bridge.boardId), Math.max(0, Math.min(255, Number(args[1]) || 0)));
        return;
      case 'digitalRead':
        return this.bridge.onDigitalRead?.(normalizePinArg(args[0], this.bridge.boardId)) ?? 0;
      case 'analogRead':
        return this.bridge.onAnalogRead?.(normalizePinArg(args[0], this.bridge.boardId)) ?? 0;
      case 'pulseIn':
        return this.bridge.onPulseIn?.(normalizePinArg(args[0], this.bridge.boardId), args[1] ? 1 : 0) ?? 0;
      case 'delay':
        await this.sleep(Math.max(0, Number(args[0]) || 0), signal);
        return;
      case 'delayMicroseconds':
        await this.sleep(Math.max(0, (Number(args[0]) || 0) / 1000), signal);
        return;
      case 'millis':
        return Math.floor(performance.now() - this.startMs);
      case 'micros':
        return Math.floor((performance.now() - this.startMs) * 1000);
      case 'tone':
        this.bridge.onTone?.(normalizePinArg(args[0], this.bridge.boardId), Number(args[1]) || 0, args[2]);
        return;
      case 'noTone':
        this.bridge.onNoTone?.(normalizePinArg(args[0] ?? '', this.bridge.boardId));
        return;
      case 'digitalPinToInterrupt':
        return args[0];
      case 'map': {
        const [x, inMin, inMax, outMin, outMax] = args.map(Number);
        if (inMax === inMin) return outMin;
        return Math.round(((x - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
      }
      case 'constrain': {
        const [x, lo, hi] = args.map(Number);
        return Math.max(lo, Math.min(hi, x));
      }
      case 'min': return Math.min(Number(args[0]), Number(args[1]));
      case 'max': return Math.max(Number(args[0]), Number(args[1]));
      case 'abs': return Math.abs(Number(args[0]));
      case 'pow': return Math.pow(Number(args[0]), Number(args[1]));
      case 'sqrt': return Math.sqrt(Number(args[0]));
      case 'random':
        return args.length === 1
          ? Math.floor(Math.random() * Number(args[0]))
          : Math.floor(Number(args[0]) + Math.random() * (Number(args[1]) - Number(args[0])));
      case 'String':
        if (args.length >= 2 && typeof args[0] === 'number' && typeof args[1] === 'number') {
          return Number(args[0]).toFixed(Math.max(0, Math.min(6, Math.trunc(args[1]))));
        }
        return String(args[0] ?? '');
      case 'int':
        return Math.trunc(Number(args[0]) || 0);
      case 'float':
        return Number(args[0]) || 0;
      default: {
        const ctor = this.findVarScope(name, scopes).get(name);
        if (typeof ctor === 'function') return ctor(...args);
        if (this.funcs.has(name)) return this.callUserFunc(name, args, signal);
        throw new ArduinoCompileError(`Función no definida: "${name}()"`, line);
      }
    }
  }
}
