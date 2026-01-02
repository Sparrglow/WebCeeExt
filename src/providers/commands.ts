import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { WebCeePreviewPanel } from './previewPanel';
import { WebCeeRenderer } from '../core/preview/renderer';

export function registerWebCeeCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('webcee.showPreview', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      if (editor.document.languageId !== 'webcee') {
        vscode.window.showWarningMessage('Active editor is not a .wce file.');
        return;
      }
      WebCeePreviewPanel.createOrShow(context, editor.document);
    }),

    vscode.commands.registerCommand('webcee.openInBrowser', async () => {
      // Best-effort: take current preview html and write to a temp file.
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'webcee') {
        vscode.window.showWarningMessage('Open a .wce file and show preview first.');
        return;
      }

      // Ensure preview exists
      WebCeePreviewPanel.createOrShow(context, editor?.document);

      // We cannot directly access the other instance safely, so regenerate from document.
      const doc = editor?.document;
      if (!doc) return;

      const storageDir = context.globalStorageUri.fsPath;
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {
        // ignore
      }

      const htmlPath = path.join(storageDir, 'webcee-preview.html');

      const renderer = new WebCeeRenderer();
      const { html } = renderer.renderToHtml(doc.getText());

      fs.writeFileSync(htmlPath, html, 'utf8');
      const opened = await vscode.env.openExternal(vscode.Uri.file(htmlPath));
      if (!opened) {
        vscode.window.showWarningMessage('Unable to open the preview in an external browser on this system.');
      }
    })
  );
}
