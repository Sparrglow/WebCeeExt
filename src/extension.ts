import * as vscode from 'vscode';
import { registerWebCeeCommands } from './providers/commands';
import { WebCeeDiagnosticProvider } from './providers/diagnostics';
import { WebCeeProjectIndex } from './core/project';
import { registerWebCeeCompletion } from './providers/completion';

function isZhLanguage(): boolean {
  const lang = (vscode.env.language || '').toLowerCase();
  return lang === 'zh-cn' || lang.startsWith('zh');
}

async function openDocumentation(context: vscode.ExtensionContext): Promise<void> {
  const docFile = isZhLanguage() ? 'README.zh-CN.md' : 'README.md';
  const docPath = context.asAbsolutePath(docFile);
  const uri = vscode.Uri.file(docPath);

  try {
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  } catch {
    await vscode.commands.executeCommand('vscode.open', uri);
  }
}

async function maybeShowWelcome(context: vscode.ExtensionContext): Promise<void> {
  const key = 'webcee.welcomeShown.v1';
  if (context.globalState.get<boolean>(key)) return;

  const zh = isZhLanguage();
  const msg = zh
    ? 'WebCeeExt 已安装。要打开中文使用指南吗？'
    : 'WebCeeExt installed. Open the documentation?';
  const openLabel = zh ? '打开使用指南' : 'Open Docs';
  const dismissLabel = zh ? '不再提示' : "Don't show again";

  const choice = await vscode.window.showInformationMessage(msg, openLabel, dismissLabel);
  await context.globalState.update(key, true);

  if (choice === openLabel) {
    await openDocumentation(context);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "webcee-ext" is now active!');
  const projectIndex = new WebCeeProjectIndex();
  context.subscriptions.push(projectIndex);

  context.subscriptions.push(
    vscode.commands.registerCommand('webcee.openDocumentation', async () => {
      await openDocumentation(context);
    })
  );

  registerWebCeeCommands(context);

  registerWebCeeCompletion(context, projectIndex);

  const diagnosticProvider = new WebCeeDiagnosticProvider(projectIndex);
  context.subscriptions.push(diagnosticProvider);

  // Show a one-time welcome prompt that opens docs in the user's VS Code language.
  void maybeShowWelcome(context);
}

export function deactivate() {
  // no-op
}
