# Contributing to WebCeeExt

Thank you for your interest in contributing!

## Development Setup

1. **Prerequisites**
   - Node.js (v14 or higher)
   - VS Code

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build**
   ```bash
   npm run compile
   ```

4. **Run/Debug**
   - Open this folder in VS Code.
   - Press `F5` to launch the Extension Development Host.
   - Open a `.wce` file in the new window to test your changes.

## Project Structure

- `src/extension.ts`: Entry point.
- `src/providers/preview.ts`: Handles the Webview panel and HTML generation.
- `src/providers/diagnostics.ts`: Simple syntax checking logic.
- `src/simulation/`: Contains the JS-based runtime simulator logic.
- `syntaxes/`: TextMate grammar for syntax highlighting.
- `snippets/`: Code snippets.

## Packaging

To create a `.vsix` file for installation:

```bash
npm install -g vsce
vsce package
```
