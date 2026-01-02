import * as vscode from 'vscode';
import type { PlatformAdapter } from './index';

export class LinuxPlatformAdapter implements PlatformAdapter {
  normalizePath(p: string): string {
    return vscode.Uri.file(p).fsPath;
  }
}
