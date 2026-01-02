import * as vscode from 'vscode';
import * as path from 'path';
import { WebCeeConfiguration } from '../core/config';
import { WebCeeRenderer } from '../core/preview/renderer';

export class WebCeePreviewPanel {
  private static currentPanel: WebCeePreviewPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly renderer = new WebCeeRenderer();

  private document: vscode.TextDocument | undefined;
  private updateTimeout: NodeJS.Timeout | undefined;
  private disposables: vscode.Disposable[] = [];

  static createOrShow(context: vscode.ExtensionContext, document?: vscode.TextDocument) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (WebCeePreviewPanel.currentPanel) {
      WebCeePreviewPanel.currentPanel.panel.reveal(column);
      if (document) WebCeePreviewPanel.currentPanel.attach(document);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'webceePreview',
      'WebCee Preview',
      column ?? vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'resources')
        ]
      }
    );

    WebCeePreviewPanel.currentPanel = new WebCeePreviewPanel(panel, context);
    if (document) WebCeePreviewPanel.currentPanel.attach(document);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.context = context;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // watchers
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) => {
        if (!WebCeeConfiguration.isPreviewAutoRefreshEnabled()) return;
        if (doc.languageId !== 'webcee') return;
        if (!this.document || doc.uri.toString() !== this.document.uri.toString()) return;
        this.scheduleUpdate(doc.getText(), WebCeeConfiguration.getPreviewRefreshDelayMs());
      }),
      vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (!WebCeeConfiguration.isLivePreviewEnabled()) return;
        if (e.document.languageId !== 'webcee') return;
        if (!this.document || e.document.uri.toString() !== this.document.uri.toString()) return;
        this.scheduleUpdate(e.document.getText(), Math.max(300, WebCeeConfiguration.getPreviewRefreshDelayMs()));
      })
    );
  }

  attach(document: vscode.TextDocument) {
    this.document = document;
    this.panel.title = `WebCee Preview: ${path.basename(document.uri.fsPath)}`;
    this.scheduleUpdate(document.getText(), 0);
  }

  getCurrentHtml(): string | undefined {
    return this.panel.webview.html;
  }

  private scheduleUpdate(content: string, delayMs: number) {
    if (!WebCeeConfiguration.isPreviewEnabled()) return;

    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = undefined;
    }

    this.updateTimeout = setTimeout(() => {
      this.updateTimeout = undefined;
      this.updatePreview(content);
    }, delayMs);
  }

  private updatePreview(content: string) {
    const runtimeUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webcee-runtime.js')
    );

    const { html } = this.renderer.renderToHtml(content, {
      runtimeScriptSrc: runtimeUri.toString(),
      simBootstrap: {
        pollIntervalMs: WebCeeConfiguration.simulationPollIntervalMs(),
        initialData: WebCeeConfiguration.simulationInitialData(),
        handlerEffects: WebCeeConfiguration.simulationHandlerEffects(),
        modelUpdateEffects: WebCeeConfiguration.simulationModelUpdateEffects(),
        lists: WebCeeConfiguration.simulationLists()
      }
    });
    this.panel.webview.html = html;
  }

  dispose() {
    WebCeePreviewPanel.currentPanel = undefined;
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
