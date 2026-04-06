# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

CCland (RCLand) 是一个 Electron 桌面应用，用于管理 Claude Code CLI 的 Shell 配置。支持多 Shell（Zsh、Bash、PowerShell）、多 API Provider、加密密钥管理和云同步。

## 常用命令

```bash
npm run dev       # 启动开发服务器（Electron + Vite HMR）
npm run build     # 编译 TypeScript 并打包
npm run preview   # 预览构建产物
npm run pack      # 打包为目录（不签名）
npm run dist      # 构建平台安装包
```

无测试框架、无 lint 工具。

## 架构

### Electron 三层架构

- **Main** (`src/main/`) — 应用生命周期、窗口管理、文件 I/O、IPC handlers
- **Preload** (`src/preload/index.ts`) — Context Bridge，暴露 `window.electronAPI`，所有 IPC 通道的类型安全桥接
- **Renderer** (`src/renderer/src/`) — React 19 SPA，Ant Design UI，Zustand 状态管理

### 路由（Hash Router）

| 路径 | 功能 |
|------|------|
| `/env` | 环境变量管理 |
| `/path` | PATH 管理 |
| `/functions` | Shell 函数 |
| `/aliases` | Shell 别名 |
| `/ccland` | CC Launch 配置（Provider/密钥/配置集） |

### 状态管理（Zustand）

三个独立 Store：
- `useAppStore` — CCLaunch 数据（providers、configs、selector）
- `useSettingsStore` — 应用设置（shell profiles、密钥路径、默认页面）
- `useShellConfigStore` — Shell 配置（变量、PATH、函数、别名）

所有 Store 的修改通过 IPC 调用 Main 进程写入文件系统。

### 数据持久化

| 文件 | 内容 | 可同步 |
|------|------|--------|
| `rcland.config.claudecode.json` (v5) | Providers、ConfigSets、Selector | 是 |
| `rcland.config.shell.json` (v1) | 变量、PATH、函数、别名 | 是 |
| Electron userData | AppSettings（shell profiles、密钥路径） | 否 |

### IPC 通道分组

- `config:*` / `data:*` / `settings:*` / `shell-config:*` — 数据读写
- `crypto:*` — 加密/解密/密钥管理
- `shell:*` — Shell 脚本生成和应用
- `backup:*` — 备份管理
- `dialog:*` — 原生文件对话框

### 路径别名

```
@shared  → src/shared
@renderer → src/renderer/src
```

## 关键模式

### CRUD + 自动保存
Store 中每个实体（变量/PATH/函数/别名）实现 add/update/remove/reorder 操作，修改后自动通过 IPC 保存。CRUD 辅助函数在 `stores/crud-helpers.ts`。

### localOnly 标记
Provider 和 ConfigSet 可标记 `localOnly: true`，不参与云同步。本地数据存储在独立的 `LocalCCLaunchData` 结构中。

### builtIn 函数
Shell 函数可标记 `builtIn: true`（只读、不可编辑/删除），加载时与用户函数合并。

### 加密
敏感 token 以 `enc:v1:...` 格式加密存储，基于口令派生密钥。解密按需执行。

### 多 Shell 适配
Shell 脚本生成在 `src/main/services/generators/`，按 section 拆分（path/variables/functions/aliases/ccland），每个 section 处理不同 Shell 的语法差异。

### 模块化 UI
每个功能模块（`src/renderer/src/modules/`）自包含：页面组件 + 表单模态框 + 卡片组件。共享组件在 `src/renderer/src/components/`（BaseItemCard、SortableWrapper、GroupHeader 等）。

## 技术栈

React 19 + TypeScript 5.8 + Ant Design 5 + Zustand 5 + @dnd-kit + Electron 35 + electron-vite
