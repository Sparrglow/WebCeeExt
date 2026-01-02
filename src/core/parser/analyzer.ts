import { WebCeeNodeType } from './webceeParser';
import { WEBCEE_KNOWN_CALLS, type WebCeePropertyCall } from '../spec/webceeSpec';

export type WebCeePropName = WebCeePropertyCall;

export interface WebCeePropUsage {
  name: WebCeePropName;
  value?: string;
  valueRange?: { start: number; end: number };
  callRange: { start: number; end: number };
  inComponent: WebCeeNodeType;
}

export interface WebCeeUnknownCall {
  name: string;
  range: { start: number; end: number };
}

export interface WebCeeAnalysis {
  props: WebCeePropUsage[];
  unknownCalls: WebCeeUnknownCall[];
  braceDelta: number;
}

type TokenType = 'ident' | 'string' | 'punct' | 'eof';
interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

class Tokenizer {
  private i = 0;
  constructor(private readonly src: string) {}

  next(): Token {
    this.skipWsAndComments();
    if (this.i >= this.src.length) return { type: 'eof', value: '', start: this.i, end: this.i };

    const ch = this.src[this.i];

    if (ch === '"') {
      const start = this.i;
      this.i++;
      let out = '';
      while (this.i < this.src.length) {
        const c = this.src[this.i];
        if (c === '"') {
          this.i++;
          break;
        }
        if (c === '\\' && this.i + 1 < this.src.length) {
          // keep escapes as literal for now
          out += this.src[this.i + 1];
          this.i += 2;
          continue;
        }
        out += c;
        this.i++;
      }
      return { type: 'string', value: out, start, end: this.i };
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = this.i;
      this.i++;
      while (this.i < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.i])) this.i++;
      const value = this.src.slice(start, this.i);
      return { type: 'ident', value, start, end: this.i };
    }

    const start = this.i;
    this.i++;
    return { type: 'punct', value: ch, start, end: this.i };
  }

  private skipWsAndComments() {
    while (this.i < this.src.length) {
      const ch = this.src[this.i];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.i++;
        continue;
      }
      if (ch === '/' && this.i + 1 < this.src.length && this.src[this.i + 1] === '/') {
        this.i += 2;
        while (this.i < this.src.length && this.src[this.i] !== '\n') this.i++;
        continue;
      }
      break;
    }
  }
}

function nodeTypeFromCall(name: string): WebCeeNodeType {
  const t = name.replace(/^wce_/, '');
  switch (t) {
    case 'container':
    case 'row':
    case 'col':
    case 'card':
    case 'panel':
    case 'text':
    case 'button':
    case 'input':
    case 'slider':
    case 'progress':
      return t;
    default:
      return 'unknown';
  }
}

export function analyzeWebCee(source: string): WebCeeAnalysis {
  const tokenizer = new Tokenizer(source);
  const props: WebCeePropUsage[] = [];
  const unknownCalls: WebCeeUnknownCall[] = [];

  const stack: WebCeeNodeType[] = ['container'];

  let braceDelta = 0;

  let tok: Token = tokenizer.next();
  while (tok.type !== 'eof') {
    // brace tracking
    if (tok.type === 'punct' && tok.value === '{') {
      braceDelta++;
      tok = tokenizer.next();
      continue;
    }
    if (tok.type === 'punct' && tok.value === '}') {
      braceDelta--;
      if (stack.length > 1) stack.pop();
      tok = tokenizer.next();
      continue;
    }

    if (tok.type !== 'ident') {
      tok = tokenizer.next();
      continue;
    }

    const nameTok = tok;
    const name = nameTok.value;
    tok = tokenizer.next();

    // only consider call-like patterns
    if (!(tok.type === 'punct' && tok.value === '(')) {
      continue;
    }

    const callStart = nameTok.start;
    tok = tokenizer.next();

    let firstString: Token | undefined;
    while (tok.type !== 'eof' && !(tok.type === 'punct' && tok.value === ')')) {
      if (!firstString && tok.type === 'string') {
        firstString = tok;
      }
      tok = tokenizer.next();
    }

    const closeParen = tok;
    if (tok.type === 'punct' && tok.value === ')') {
      tok = tokenizer.next();
    }

    const callEnd = closeParen.end;

    // optional ';'
    if (tok.type === 'punct' && tok.value === ';') {
      tok = tokenizer.next();
    }

    const inComponent = stack[stack.length - 1] ?? 'unknown';

    if (name === 'wce_css' || name === 'wce_bind' || name === 'wce_on_click') {
      props.push({
        name,
        value: firstString?.value,
        valueRange: firstString ? { start: firstString.start, end: firstString.end } : undefined,
        callRange: { start: callStart, end: callEnd },
        inComponent
      });
      continue;
    }

    // component call
    if (name.startsWith('wce_')) {
      const known =
        WEBCEE_KNOWN_CALLS.KNOWN_COMPONENTS.has(name) || WEBCEE_KNOWN_CALLS.PROPERTY_CALLS.has(name);
      if (!known) {
        unknownCalls.push({ name, range: { start: callStart, end: callEnd } });
      }

      // if followed by '{' then it's a block; push component context
      if (tok.type === 'punct' && tok.value === '{') {
        const type = nodeTypeFromCall(name);
        stack.push(type);
        // '{' will be processed by brace logic next loop
      }
    }
  }

  return { props, unknownCalls, braceDelta };
}
