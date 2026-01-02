import { WebCeeParser, type WebCeeNode } from '../parser/webceeParser';
import type { WebCeeSimBootstrap } from '../sim/types';
import { buildSimBootstrapScript } from '../sim/bootstrap';

export interface WebCeeRenderOptions {
  runtimeScriptSrc?: string;
  simBootstrap?: WebCeeSimBootstrap;
}

export class WebCeeRenderer {
  private readonly parser = new WebCeeParser();

  renderToHtml(wceContent: string, options: WebCeeRenderOptions = {}): { html: string; errors: string[] } {
    const parsed = this.parser.parse(wceContent);
    const errorLines = parsed.errors.map((e) => this.formatParseError(wceContent, e));
    const body = this.renderNodeChildren(parsed.root);

    const errorBanner =
      errorLines.length > 0
        ? `<div class="wce-errors">
  <div class="wce-errors__title">解析错误（${errorLines.length}）</div>
  <ul class="wce-errors__list">${errorLines
    .slice(0, 20)
    .map((m) => `<li>${this.escapeHtml(m)}</li>`)
    .join('')}</ul>
</div>`
        : '';

    const bootstrapScript = buildSimBootstrapScript(options.simBootstrap ?? {});
    const runtimeScriptTag = options.runtimeScriptSrc
      ? `<script src="${this.escapeAttr(options.runtimeScriptSrc)}"></script>`
      : '';

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WebCee Preview</title>
<style>
  /* Base styles aligned with WebCee runtime fallback (WebCee/src/webcee.c) */
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;background:#f0f2f5;}
  .container{max_width:800px;margin:0 auto;}
  .row{display:flex;flex-wrap:wrap;margin:-10px;}
  .col{flex:1;padding:10px;min-width:200px;}
  .card{background:white;border-radius:8px;padding:20px;box-shadow:0 2px 4px rgba(0,0,0,0.1);margin-bottom:20px;}
  button{background:#007bff;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;}
  button:hover{background:#0056b3;}
  input{padding:8px;border:1px solid #ddd;border-radius:4px;width:100%;box-sizing:border-box;}

  /* Extension-only helpers */
  .wce-errors{margin:0 0 16px 0;padding:12px 14px;border-radius:10px;background:#fff3cd;color:#664d03;border:1px solid #ffecb5;}
  .wce-errors__title{font-weight:700;margin-bottom:6px;}
  .wce-errors__list{margin:0;padding-left:18px;}
  .wce-errors__list li{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:12px;line-height:1.4;}
  .bind-hint{opacity:.6;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;}
</style>
</head>
<body>
${errorBanner}
<div id="app">${body}</div>
${bootstrapScript}
${runtimeScriptTag}
</body>
</html>`;

    const errors = parsed.errors.map((e) => e.message);
    return { html, errors };
  }

  private renderNodeChildren(node: WebCeeNode): string {
    return node.children.map(n => this.renderNode(n)).join('');
  }

  private renderNode(node: WebCeeNode): string {
    const style = node.style ? ` style="${this.escapeAttr(node.style)}"` : '';

    switch (node.type) {
      case 'container':
        return `<div class="container"${style}>${this.renderNodeChildren(node)}</div>`;
      case 'row':
        return `<div class="row"${style}>${this.renderNodeChildren(node)}</div>`;
      case 'col':
        return `<div class="col"${style}>${this.renderNodeChildren(node)}</div>`;
      case 'card':
        return `<div class="card"${style}>${this.renderNodeChildren(node)}</div>`;
      case 'panel':
        return `<div class="panel"${style}>${this.renderNodeChildren(node)}</div>`;
      case 'text': {
        const label = node.label ? this.escapeHtml(node.label) : '';
        if (node.bind) {
          const hint = label ? '' : ' class="bind-hint"';
          // WebCee runtime binds on the same element; sync() replaces textContent entirely.
          return `<span${hint} wce-bind="${this.escapeAttr(node.bind)}"${style}>${label}</span>`;
        }

        return `<span${style}>${label}</span>`;
      }
      case 'button': {
        const label = node.label ? this.escapeHtml(node.label) : 'Button';
        const onClick = node.onClick ? ` onclick="trigger('${this.escapeJs(node.onClick)}')"` : '';
        return `<button${style}${onClick}>${label}</button>`;
      }
      case 'input': {
        const placeholder = node.label ? ` placeholder="${this.escapeAttr(node.label)}"` : '';
        const bind = node.bind ? ` wce-bind="${this.escapeAttr(node.bind)}"` : '';
        return `<input type="text"${style}${placeholder}${bind} />`;
      }
      case 'slider': {
        const bind = node.bind ? ` wce-bind="${this.escapeAttr(node.bind)}"` : '';
        return `<input type="range" min="0" max="100"${style}${bind} />`;
      }
      case 'progress': {
        const bind = node.bind ? ` wce-bind="${this.escapeAttr(node.bind)}"` : '';
        return `<progress max="100" value="0"${style}${bind}></progress>`;
      }
      default:
        return `<div class="card"${style}><div class="bind-hint">Unknown node</div>${this.renderNodeChildren(node)}</div>`;
    }
  }

  private escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeAttr(s: string): string {
    return this.escapeHtml(s).replace(/\"/g, '&quot;');
  }

  private escapeJs(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private formatParseError(source: string, e: { message: string; at: number }): string {
    const pos = this.offsetToLineCol(source, e.at);
    // 1-based line/col for humans
    const line = pos.line + 1;
    const col = pos.col + 1;
    return `L${line}:C${col} ${e.message}`;
  }

  private offsetToLineCol(source: string, offset: number): { line: number; col: number } {
    const o = Math.max(0, Math.min(offset, source.length));
    let line = 0;
    let lastLineStart = 0;
    for (let i = 0; i < o; i++) {
      if (source.charCodeAt(i) === 10 /* \n */) {
        line++;
        lastLineStart = i + 1;
      }
    }
    return { line, col: o - lastLineStart };
  }
}
