import * as vscode from 'vscode';
import { WebCeeConfiguration } from '../core/config';
import { analyzeWebCee } from '../core/parser/analyzer';
import { WebCeeProjectIndex } from '../core/project';

export class WebCeeDiagnosticProvider implements vscode.Disposable {
  private readonly collection: vscode.DiagnosticCollection;
  private readonly disposables: vscode.Disposable[] = [];
  constructor(private readonly index: WebCeeProjectIndex) {
    this.collection = vscode.languages.createDiagnosticCollection('webcee');

    this.disposables.push(
      this.collection,
      vscode.workspace.onDidOpenTextDocument((doc: vscode.TextDocument) => this.refresh(doc)),
      vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => this.refresh(doc)),
      vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => this.refresh(e.document))
    );

    // initial
    for (const doc of vscode.workspace.textDocuments) {
      this.refresh(doc);
    }
  }

  dispose() {
    for (const d of this.disposables) d.dispose();
  }

  private async refresh(document: vscode.TextDocument) {
    if (!WebCeeConfiguration.isDiagnosticsEnabled()) return;
    if (document.languageId !== 'webcee') return;

    const text = document.getText();
    const analysis = analyzeWebCee(text);
    const symbols = await this.index.getSymbols();
    const diagnostics: vscode.Diagnostic[] = [];

    if (analysis.braceDelta !== 0) {
      const msg = analysis.braceDelta > 0 ? 'Missing closing brace(s)' : 'Extra closing brace(s)';
      diagnostics.push(new vscode.Diagnostic(this.rangeFromOffsets(document, 0, 1), msg, vscode.DiagnosticSeverity.Error));
    }

    for (const unk of analysis.unknownCalls) {
      const range = this.rangeFromOffsets(document, unk.range.start, unk.range.end);
      diagnostics.push(new vscode.Diagnostic(range, `Unknown WebCee call: ${unk.name}`, vscode.DiagnosticSeverity.Warning));
    }

    // Property checks + reference checks
    for (const p of analysis.props) {
      const callRange = this.rangeFromOffsets(document, p.callRange.start, p.callRange.end);
      const valueRange = p.valueRange ? this.rangeFromOffsets(document, p.valueRange.start, p.valueRange.end) : callRange;

      if (p.name === 'wce_on_click') {
        if (p.inComponent !== 'button') {
          diagnostics.push(
            new vscode.Diagnostic(callRange, 'wce_on_click() should be used inside wce_button() block', vscode.DiagnosticSeverity.Warning)
          );
        }
        if (p.value && symbols.eventHandlers.size > 0 && !symbols.eventHandlers.has(p.value)) {
          diagnostics.push(
            new vscode.Diagnostic(valueRange, `on_click handler not found in C project: ${p.value}`, vscode.DiagnosticSeverity.Warning)
          );
        }
      }

      if (p.name === 'wce_bind') {
        if (p.inComponent !== 'text' && p.inComponent !== 'input') {
          diagnostics.push(
            new vscode.Diagnostic(callRange, 'wce_bind() is typically used inside wce_text() or wce_input() block', vscode.DiagnosticSeverity.Warning)
          );
        }
        if (p.value && symbols.dataKeys.size > 0 && !symbols.dataKeys.has(p.value)) {
          diagnostics.push(
            new vscode.Diagnostic(valueRange, `bind key not found in C project: ${p.value}`, vscode.DiagnosticSeverity.Warning)
          );
        }
      }

      if (p.name === 'wce_css') {
        // no strict rule in MVP
      }
    }

    this.collection.set(document.uri, diagnostics);
  }

  private rangeFromOffsets(document: vscode.TextDocument, start: number, end: number): vscode.Range {
    const s = document.positionAt(Math.max(0, Math.min(start, document.getText().length)));
    const e = document.positionAt(Math.max(0, Math.min(end, document.getText().length)));
    return new vscode.Range(s, e);
  }
}
