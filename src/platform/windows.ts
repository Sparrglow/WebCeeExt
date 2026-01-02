import * as vscode from 'vscode';
import type { PlatformAdapter } from './index';

export class WindowsPlatformAdapter implements PlatformAdapter {
  normalizePath(p: string): string {
    return vscode.Uri.file(p).fsPath;
  }
}
