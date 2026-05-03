# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

RCLand 是一个 Electron 桌面应用，管理 Claude Code CLI 和 Codex CLI 的 Shell 配置。支持多 Shell（Zsh、Bash、PowerShell）、多 API Provider、加密密钥管理和云同步。

## 常用命令

```bash
npm run dev         # 启动开发服务器（Electron + Vite HMR）
npm run typecheck   # TypeScript 类型检查
npm run build       # typecheck + 打包
npm run preview     # 预览构建产物
npm run pack        # 打包为目录（不签名）
npm run dist        # 构建平台安装包
npm test            # 运行全部测试（esbuild 捆绑 + node --test）
```

无 lint 工具。

### 运行单个测试

测试使用 Node.js 内置 `node:test` + `node:assert/strict`，esbuild 捆绑后执行：

```bash
npx esbuild tests/generator-escaping.test.ts --bundle --platform=node --format=cjs \
  --outdir=/tmp/rcland-tests --alias:@shared=./src/shared --alias:@renderer=./src/renderer/src \
  && node --test /tmp/rcland-tests/generator-escaping.test.js
```

## 架构

### Electron 三层架构

- **Main** (`src/main/`) — 应用生命周期、窗口管理、文件 I/O、IPC handlers
- **Preload** (`src/preload/index.ts`) — Context Bridge，暴露 `window.electronAPI`，所有 IPC 通道的类型安全桥接
- **Renderer** (`src/renderer/src/`) — React 19 SPA，Ant Design UI，Zustand 状态管理

### 路径别名

```
@shared   → src/shared（main + preload + renderer 共享）
@renderer → src/renderer/src（仅 renderer）
```

### 路由（Hash Router）

| 路径 | 功能 |
|------|------|
| `/env` | 环境变量管理 |
| `/path` | PATH 管理（PATH 条目 + 路径变量） |
| `/functions` | Shell 函数 |
| `/aliases` | Shell 别名 |
| `/system-proxy` | 系统代理 |
| `/ccland` | CC Launch（Provider/启动项/环境变量字典/选择器） |
| `/cxland` | CX Launch（Provider/启动项/选择器） |

### Zustand Store（6 个）

| Store | 数据源 | 持久化 |
|-------|--------|--------|
| `useCCLaunchStore` | CC providers、launchItems、selector | PersistQueue → `data:save` |
| `useCXLandStore` | CX providers、launchItems、selector | PersistQueue → `cxland:save` |
| `useShellConfigStore` | 变量、PATH、函数、别名 | PersistQueue → `shell-config:save` |
| `useSettingsStore` | 应用设置、密钥管理 | 直接 IPC |
| `useClaudeEnvDictStore` | Claude 环境变量字典（内置 + 用户条目） | 直接 IPC |

**PersistQueue**（`stores/persist.ts`）：串行化异步保存，防止竞态条件。前三个 Store 各有一个队列实例。

### IPC 通道分组

| 前缀 | 域 |
|------|-----|
| `config:*` / `data:*` | 配置目录、CCLaunchData 读写 |
| `cxland:*` | CXLandData 读写 |
| `settings:*` | AppSettings 读写 |
| `shell-config:*` | ShellConfigData 读写、冲突检测 |
| `crypto:*` | 加密/解密/密钥管理 |
| `shell:*` | Shell 检测、脚本生成、应用 |
| `backup:*` | 备份管理 |
| `claude-env-dict:*` | 环境变量字典 CRUD |
| `system-proxy:*` | 操作系统代理读取 |
| `dialog:*` | 原生文件对话框 |

### 数据持久化

| 文件 | 内容 | 版本 | 可同步 |
|------|------|------|--------|
| `rcland.config.claudecode.json` | CC providers、launchItems、selector | v5 | 是 |
| `rcland.config.codex.json` | CX providers、launchItems、selector | v3 | 是 |
| `rcland.config.shell.json` | 变量、PATH、函数、别名 | v1 | 是 |
| `rcland.claude-env-dict.json` | 环境变量字典（用户条目 + 覆盖） | v1 | 是 |
| `local/` | local-only 数据（CC + CX） | v1 | 否 |
| Electron userData | AppSettings（shell profiles、密钥路径、语言） | — | 否 |

## 关键模式

### Shell 生成器架构

`src/main/services/generators/` — 最复杂的子系统。

**Section-based 编排**：7 个 section（variables → path → functions → aliases → systemProxy → ccland → cxland），每个 section 为每种 Shell 实现独立的 `SectionGenerator`（共 21 个生成器）。`orchestrator.ts` 按固定顺序组装成完整脚本。

**生成流程**：generate → 写入 `~/.rcland/{shell}rc` → 注入 source 行到 shell profile（marker: `# >>> RCLand >>>`） → 备份旧文件。

### CRUD + 自动保存

CRUD 辅助函数在 `stores/crud-helpers.ts`：
- `createShellConfigCrud<T>` — ShellConfig 嵌套字段的 CRUD
- `createTopLevelCrud<T>` — 顶层数组（providers、launchItems）的 CRUD

每次修改自动触发 IPC 保存。

### 变量引用

`src/shared/var-refs.ts` — `{{VAR_NAME}}` 语法，支持拓扑排序和循环引用检测。用于环境变量和路径变量之间的引用解析。

### localOnly 标记

Provider 和 LaunchItem 可标记 `localOnly: true`，不参与云同步。本地数据存储在独立的 `LocalCCLandData` / `LocalCXLandData` 结构中。

### builtIn 函数

Shell 函数可标记 `builtIn: true`（只读、不可编辑/删除），加载时与用户函数合并。

### 加密

敏感 token 以 `enc:v1:...` 格式（AES-256-GCM + PBKDF2）加密存储，仅在生成脚本时按需解密。

### 多 Shell 适配

`sections/` 目录下每个模块为 Zsh、Bash、PowerShell 各一个生成器，处理语法差异（转义规则、函数定义、环境变量设置等）。

### 模块化 UI

每个功能模块（`src/renderer/src/modules/`）自包含：页面组件 + 表单模态框 + 卡片组件。CC/CX Launch 共享组件在 `modules/shared/launcher/`。

### i18n

`i18next` + `react-i18next`，默认 `zh-CN`。翻译文件在 `src/renderer/src/i18n/locales/`（zh-CN.ts、en.ts）。

## 技术栈

React 19 + TypeScript 5.8 + Ant Design 5 + Zustand 5 + @dnd-kit + Electron 35 + electron-vite 3
