import * as vscode from 'vscode';
import { WebCeeProjectIndex } from '../core/project';
import { WEBCEE_COMPONENT_CALLS, WEBCEE_PROPERTY_CALLS } from '../core/spec/webceeSpec';

function completionRange(document: vscode.TextDocument, position: vscode.Position, typedPrefix: string): vscode.Range {
  const start = position.translate(0, -typedPrefix.length);
  return new vscode.Range(start, position);
}

function findOpenStringCall(linePrefix: string, fnName: string): string | null {
  // match: wce_bind("<typed>
  const re = new RegExp(`${fnName}\\(\\\"([^\\\"\\\\]*)$`);
  const m = linePrefix.match(re);
  return m ? m[1] : null;
}

export function registerWebCeeCompletion(context: vscode.ExtensionContext, index: WebCeeProjectIndex) {
  const provider: vscode.CompletionItemProvider = {
    provideCompletionItems: async (document, position) => {
      if (document.languageId !== 'webcee') return;

      const line = document.lineAt(position.line);
      const linePrefix = line.text.slice(0, position.character);

      const bindTyped = findOpenStringCall(linePrefix, 'wce_bind');
      if (bindTyped !== null) {
        const symbols = await index.getSymbols();
        const items: vscode.CompletionItem[] = [];
        for (const k of symbols.dataKeys) {
          const item = new vscode.CompletionItem(k, vscode.CompletionItemKind.Value);
          item.range = completionRange(document, position, bindTyped);
          items.push(item);
        }
        return items;
      }

      const clickTyped = findOpenStringCall(linePrefix, 'wce_on_click');
      if (clickTyped !== null) {
        const symbols = await index.getSymbols();
        const items: vscode.CompletionItem[] = [];
        for (const h of symbols.eventHandlers) {
          const item = new vscode.CompletionItem(h, vscode.CompletionItemKind.Function);
          item.range = completionRange(document, position, clickTyped);
          items.push(item);
        }
        return items;
      }

      // generic completions
      const items: vscode.CompletionItem[] = [];

      // component call completions (from Spec)
      for (const c of WEBCEE_COMPONENT_CALLS) {
        const item = new vscode.CompletionItem(c, vscode.CompletionItemKind.Function);
        // Common .wce shape: wce_xxx("label") { ... }
        item.insertText = new vscode.SnippetString(`${c}("\${1:label}") {\n\t$0\n}`);
        items.push(item);

        // Also offer a statement form: wce_xxx("label");
        const stmt = new vscode.CompletionItem(`${c}("...");`, vscode.CompletionItemKind.Snippet);
        stmt.insertText = new vscode.SnippetString(`${c}("\${1:label}");`);
        items.push(stmt);
      }

      for (const prop of WEBCEE_PROPERTY_CALLS) {
        const label = `${prop}("...");`;
        const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
        if (prop === 'wce_css') item.insertText = new vscode.SnippetString('wce_css("${1:style}");');
        else if (prop === 'wce_bind') item.insertText = new vscode.SnippetString('wce_bind("${1:key}");');
        else if (prop === 'wce_on_click') item.insertText = new vscode.SnippetString('wce_on_click("${1:handler}");');
        else item.insertText = new vscode.SnippetString(`${prop}("$1");`);
        items.push(item);
      }

      return items;
    }
  };

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider({ language: 'webcee' }, provider, '"', '_')
  );
}
