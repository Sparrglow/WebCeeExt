import * as vscode from 'vscode';

export interface WebCeeProjectSymbols {
  eventHandlers: Set<string>;
  dataKeys: Set<string>;
}

export class WebCeeProjectIndex implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private rebuildTimer: NodeJS.Timeout | undefined;
  private cache: WebCeeProjectSymbols | null = null;
  private cacheVersion = 0;
  private inflight: Promise<WebCeeProjectSymbols> | null = null;

  constructor() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{c,h,cpp,hpp}');
    this.disposables.push(
      watcher,
      watcher.onDidCreate(() => this.scheduleRebuild()),
      watcher.onDidChange(() => this.scheduleRebuild()),
      watcher.onDidDelete(() => this.scheduleRebuild())
    );

    // initial lazy build
  }

  dispose() {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
    for (const d of this.disposables) d.dispose();
  }

  scheduleRebuild(delayMs = 500) {
    if (this.rebuildTimer) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = undefined;
    }
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = undefined;
      this.cache = null;
      this.cacheVersion++;
    }, delayMs);
  }

  async getSymbols(): Promise<WebCeeProjectSymbols> {
    if (this.cache) return this.cache;
    if (this.inflight) return this.inflight;

    const requestVersion = this.cacheVersion;
    this.inflight = this.buildSymbols().then((s) => {
      // only commit if nothing invalidated during build
      if (requestVersion === this.cacheVersion) {
        this.cache = s;
      }
      this.inflight = null;
      return s;
    });

    return this.inflight;
  }

  private async buildSymbols(): Promise<WebCeeProjectSymbols> {
    const eventHandlers = new Set<string>();
    const dataKeys = new Set<string>();

    const uris = await vscode.workspace.findFiles('**/*.{c,h,cpp,hpp}', '**/node_modules/**');

    // Regexes are intentionally simple (best-effort indexing)
    const reRegister = /\bwce_register_function\s*\(\s*\"([^\"]+)\"/g;
    const reData = /\bwce_data_(?:set|get)\s*\(\s*\"([^\"]+)\"/g;
    const reModelKey = /\bstrcmp\s*\(\s*key\s*,\s*\"([^\"]+)\"\s*\)/g;

    for (const uri of uris) {
      let text = '';
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        text = Buffer.from(bytes).toString('utf8');
      } catch {
        continue;
      }

      for (let m = reRegister.exec(text); m; m = reRegister.exec(text)) {
        eventHandlers.add(m[1]);
      }
      for (let m = reData.exec(text); m; m = reData.exec(text)) {
        dataKeys.add(m[1]);
      }
      for (let m = reModelKey.exec(text); m; m = reModelKey.exec(text)) {
        dataKeys.add(m[1]);
      }
    }

    return { eventHandlers, dataKeys };
  }
}
