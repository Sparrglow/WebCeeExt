export type WebCeeNodeType =
  | 'container'
  | 'row'
  | 'col'
  | 'card'
  | 'panel'
  | 'text'
  | 'button'
  | 'input'
  | 'slider'
  | 'progress'
  | 'unknown';

export interface WebCeeNode {
  type: WebCeeNodeType;
  label?: string;
  style?: string;
  bind?: string;
  onClick?: string;
  children: WebCeeNode[];
}

import { WEBCEE_KNOWN_CALLS as SPEC_KNOWN_CALLS } from '../spec/webceeSpec';

type TokenType = 'ident' | 'string' | 'punct' | 'eof';
interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

const { KNOWN_COMPONENTS, PROPERTY_CALLS } = SPEC_KNOWN_CALLS;

class Tokenizer {
  private i = 0;

  constructor(private readonly src: string) {}

  next(): Token {
    this.skipWsAndComments();
    if (this.i >= this.src.length) {
      return { type: 'eof', value: '', start: this.i, end: this.i };
    }

    const ch = this.src[this.i];

    // string
    if (ch === '"') {
      const start = this.i;
      this.i++; // skip opening
      let out = '';
      while (this.i < this.src.length) {
        const c = this.src[this.i];
        if (c === '"') {
          this.i++;
          break;
        }
        if (c === '\\' && this.i + 1 < this.src.length) {
          const n = this.src[this.i + 1];
          if (n === '"' || n === '\\') {
            out += n;
            this.i += 2;
            continue;
          }
        }
        out += c;
        this.i++;
      }
      return { type: 'string', value: out, start, end: this.i };
    }

    // identifier
    if (/[A-Za-z_]/.test(ch)) {
      const start = this.i;
      this.i++;
      while (this.i < this.src.length && /[A-Za-z0-9_]/.test(this.src[this.i])) this.i++;
      const value = this.src.slice(start, this.i);
      return { type: 'ident', value, start, end: this.i };
    }

    // punctuation
    const start = this.i;
    this.i++;
    return { type: 'punct', value: ch, start, end: this.i };
  }

  private skipWsAndComments() {
    while (this.i < this.src.length) {
      const ch = this.src[this.i];
      // whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.i++;
        continue;
      }
      // // comment
      if (ch === '/' && this.i + 1 < this.src.length && this.src[this.i + 1] === '/') {
        this.i += 2;
        while (this.i < this.src.length && this.src[this.i] !== '\n') this.i++;
        continue;
      }
      break;
    }
  }
}

export interface ParseError {
  message: string;
  at: number;
}

export interface ParseResult {
  root: WebCeeNode;
  errors: ParseError[];
}

export class WebCeeParser {
  parse(source: string): ParseResult {
    const tokenizer = new Tokenizer(source);
    const errors: ParseError[] = [];

    let tok: Token = tokenizer.next();
    const root: WebCeeNode = { type: 'container', children: [] };
    const stack: WebCeeNode[] = [root];

    const parseCall = () => {
      if (tok.type !== 'ident') return;
      const name = tok.value;
      tok = tokenizer.next();

      // call must have ()
      if (!(tok.type === 'punct' && tok.value === '(')) {
        return;
      }
      tok = tokenizer.next();

      const args: (string | null)[] = [];
      while (tok.type !== 'eof' && !(tok.type === 'punct' && tok.value === ')')) {
        if (tok.type === 'string') {
          args.push(tok.value);
          tok = tokenizer.next();
        } else if (tok.type === 'punct' && tok.value === ',') {
          tok = tokenizer.next();
        } else {
          // ignore non-string args in MVP
          args.push(null);
          tok = tokenizer.next();
        }
      }
      if (tok.type === 'punct' && tok.value === ')') {
        tok = tokenizer.next();
      } else {
        errors.push({ message: `Expected ')'`, at: tok.start });
      }

      // optional semicolon
      if (tok.type === 'punct' && tok.value === ';') {
        tok = tokenizer.next();
      }

      if (PROPERTY_CALLS.has(name)) {
        const current = stack[stack.length - 1];
        if (name === 'wce_css' && args[0]) current.style = args[0];
        if (name === 'wce_bind' && args[0]) current.bind = args[0];
        if (name === 'wce_on_click' && args[0]) current.onClick = args[0];
        return;
      }

      if (!KNOWN_COMPONENTS.has(name)) {
        // allow unknown calls (parser still continues)
      }

      const node = this.createNodeFromCall(name, args[0] ?? undefined);
      const parent = stack[stack.length - 1];
      parent.children.push(node);

      // block?
      if (tok.type === 'punct' && tok.value === '{') {
        tok = tokenizer.next();
        stack.push(node);
        while (tok.type !== 'eof' && !(tok.type === 'punct' && tok.value === '}')) {
          parseCall();
          if (tok.type === 'punct' && tok.value === '}') break;
          // make progress if we got stuck
          if (tok.type !== 'ident') tok = tokenizer.next();
        }
        if (tok.type === 'punct' && tok.value === '}') {
          tok = tokenizer.next();
        } else {
          errors.push({ message: `Expected '}'`, at: tok.start });
        }
        stack.pop();
      }
    };

    while (tok.type !== 'eof') {
      if (tok.type === 'ident') {
        parseCall();
      } else {
        tok = tokenizer.next();
      }
    }

    return { root, errors };
  }

  private createNodeFromCall(name: string, firstStringArg?: string): WebCeeNode {
    const t = name.replace(/^wce_/, '');
    const type = ((): WebCeeNodeType => {
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
    })();

    const node: WebCeeNode = { type, children: [] };
    if (firstStringArg) node.label = firstStringArg;
    return node;
  }
}

export const WEBCEE_KNOWN_CALLS = SPEC_KNOWN_CALLS;
