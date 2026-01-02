# WebCeeExt

## 功能（MVP）
- `.wce` 语法高亮
- 常用 WebCee 代码片段
- 基础诊断（括号/大括号配对、未知 `wce_*` 调用）
- 预览面板（静态 HTML；保存自动刷新）

## 平台支持

支持 Windows / Linux。
预览完全由 JS 模拟实现，不依赖 SDK/编译器。

## 命令
- **WebCeeExt: Show WebCee Preview** (`webcee.showPreview`)
- **WebCeeExt: Open Preview in Browser** (`webcee.openInBrowser`)
- **WebCeeExt: Open Documentation** (`webcee.openDocumentation`)

> 注意：以上都是 **VS Code 命令**（通过命令面板/右键菜单运行），不是在终端里输入的 shell 命令。

## 快速上手（用户使用指南）

发布上线后，用户不需要安装 SDK，也不需要配置编译器。

### 1) 用右键打开预览（最推荐）

1. 打开任意 `.wce` 文件
2. 在编辑器内容区域（包括空白处）右键
3. 选择 **Show WebCee Preview**

预览面板会打开，并渲染当前 `.wce` 的界面。

### 2) 用命令面板打开预览

1. 确保当前激活编辑器是一个 `.wce` 文件
2. 按 `Ctrl+Shift+P`
3. 输入并选择 **WebCeeExt: Show WebCee Preview**

### 3) 在浏览器中打开（可选）

命令：**WebCeeExt: Open Preview in Browser**

- 会把当前 `.wce` 的渲染结果写入一个本地 HTML 文件，并用默认浏览器打开
- 适合你想对比浏览器渲染/截图/录屏的场景

Linux/无桌面环境提示：如果系统没有 GUI 或没有默认浏览器，打开浏览器可能失败。

## 预览刷新规则

- 默认：保存 `.wce`（`Ctrl+S`）后自动刷新预览
- 可选：开启 `webcee.preview.livePreview` 后，输入时也会刷新（带防抖）
- `webcee.preview.refreshDelay` 控制刷新防抖的延迟（毫秒）

## 配置

以下设置都不是必须的，默认即可用。

```json
{
  "webcee.preview.enabled": true,
  "webcee.preview.autoRefresh": true,
  "webcee.preview.livePreview": false,
  "webcee.preview.refreshDelay": 300,
  "webcee.diagnostics.enabled": true
}
```

## 预览模式：Simulation-first（默认）

预览默认使用内置的 JS 模拟运行时：
- 打开预览 **不需要** 配置 SDK/编译器

## 重要声明：`.wce` 只生成 UI

`.wce` 是 WebCee 的 UI 描述文件（DSL 源码），它本身不是“可运行产物”。

- **`.wce` 只负责生成 UI 的 C 代码**（例如 `xxx.generated.c` / `ui_gen.c`）
- **实时绑定、输入回传、事件处理、热更新等行为属于 C 侧逻辑**：需要你在 `main.c`（或你的工程代码）里实现：
  - `wce_register_function("...")` 注册事件回调
  - （可选）实现 `wce_handle_model_update(key, val)` 处理输入/模型更新
  - 通过 `wce_data_set(key, val)` 更新绑定数据

本扩展当前仅提供：模拟预览（便于编辑 UI）。

## Simulation（运行时模型模拟）

预览 WebView 内置了一个轻量模拟器，用来模拟 WebCee 的 HTTP API 模型（`/api/data`, `/api/update`, `/api/trigger`, `/api/list`）。
你可以通过 VS Code 设置 `webcee.simulation.*` 定制它的行为。

## 常见问题

### 右键菜单里没有 “Show WebCee Preview”

- 确认文件扩展名是 `.wce`
- 确认右键的位置是在该 `.wce` 文件的编辑器内容区域（不是终端/输出/侧边栏空白处）
- 如果你用命令面板方式，确保当前激活编辑器是 `.wce`

### 预览没有更新

- 默认只在保存时刷新：请先 `Ctrl+S`

## 开发指南

如果你想参与本插件的开发或自行构建：

1. **安装依赖**
   ```bash
   npm install
   ```

2. **编译**
   ```bash
   npm run compile
   ```

3. **调试**
   - 在 VS Code 中打开本项目
   - 按 `F5` 启动 "Extension Development Host" 进行调试

- 或在设置里开启 `webcee.preview.livePreview`
- 确认没有把 `webcee.preview.enabled` 关闭

## 开发

```bash
npm install
npm run compile
```

然后在 VS Code 里按 `F5` 启动 Extension Development Host。
