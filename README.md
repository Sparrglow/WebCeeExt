# WebCeeExt

This extension provides a simulation-first preview workflow for WebCee `.wce` UI files.

For Chinese documentation, see: `README.zh-CN.md`.

## Features (MVP)
- Syntax highlighting for `.wce`
- Code snippets for common WebCee blocks
- Basic diagnostics (brace balance + unknown `wce_*` calls)
- Preview panel (static HTML; auto refresh on save)

## Platform support

Works on Windows / Linux. The preview runs fully in JS (no SDK/compiler required).

## Commands
- **WebCeeExt: Show WebCee Preview** (`webcee.showPreview`)
- **WebCeeExt: Open Preview in Browser** (`webcee.openInBrowser`)
- **WebCeeExt: Open Documentation** (`webcee.openDocumentation`)

> Note: These are **VS Code commands** (Command Palette / context menu), not shell commands.

## Quick start

No SDK/compiler is required.

### Option A: Right-click in the editor (recommended)
1. Open any `.wce` file
2. Right-click anywhere in the editor (including blank space)
3. Select **Show WebCee Preview**

### Option B: Command Palette
1. Focus an open `.wce` editor
2. Press `Ctrl+Shift+P`
3. Run **WebCeeExt: Show WebCee Preview**

### Option C: Open in browser (optional)
Run **WebCeeExt: Open Preview in Browser**.

Note for Linux/headless environments: opening a browser may fail if no GUI/default browser is available.

## Refresh behavior
- Default: refreshes on save (`Ctrl+S`)
- Optional: set `webcee.preview.livePreview` to refresh while typing (debounced)
- `webcee.preview.refreshDelay` controls debounce delay (ms)

## Configuration

All settings are optional.

```json
{
  "webcee.preview.enabled": true,
  "webcee.preview.autoRefresh": true,
  "webcee.preview.livePreview": false,
  "webcee.preview.refreshDelay": 300,
  "webcee.diagnostics.enabled": true
}
```

## Important: `.wce` only describes UI

`.wce` is a UI description DSL. Real runtime behavior (data binding, events, hot updates) lives in your C project:

- Register callbacks with `wce_register_function("...")`
- Optionally implement `wce_handle_model_update(key, val)`
- Update bound data via `wce_data_set(key, val)`

This extension currently focuses on the editor experience + simulation preview.

## Development

```bash
npm install
npm run compile
```

Press `F5` in VS Code to launch the Extension Development Host.
    ],
