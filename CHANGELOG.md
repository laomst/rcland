# Changelog

## [0.1.1] - 2026-05-29

### Features

- **透传模式增强** — 支持自定义透传命令名称（不再限于 `claude`/`codex`），CCLand 透传模式下支持配置环境变量
- **复制项插入位置优化** — CX 启动项和 PATH 变量的复制操作现在插入到源项的紧后方，而不是追加到末尾

### Bug Fixes

- **Bash prompt-select 菜单重绘修复** — 修复 Bash 中 `local` 多变量声明导致菜单行数计算错误（始终为 4），改用相对光标移动替代绝对光标保存/恢复以避免滚动异常

### Internal

- 简化启动项选择器实现
- 移除不再需要的 `set_main_task_name` 内置函数

## [0.1.0] - 2026-05-05

首个发布版本。

### Features

- **多 Shell 配置管理** — 支持 Zsh、Bash、PowerShell 三种 Shell 的环境变量、PATH、函数、别名配置
- **CC Launch** — Claude Code CLI 多供应商启动项管理，支持 Provider/Endpoint/Key 配置、透传模式、系统代理
- **CX Launch** — Codex CLI 多供应商启动项管理，支持 wireApi 协议切换、模型覆盖
- **加密密钥管理** — API Token 以 AES-256-GCM 加密存储，生成脚本时按需解密
- **变量引用系统** — `{{VAR_NAME}}` 语法支持环境变量和路径变量之间的相互引用，含拓扑排序和循环检测
- **Claude 环境变量字典** — 内置预设 + 用户自定义条目，统一管理 Claude Code 环境变量
- **Kanban URL** — Provider 级别的用量看板链接
- **启动项选择器** — Shell 函数菜单，支持自定义函数名和提示标题
- **本地配置隔离** — Provider 和 LaunchItem 支持 `localOnly` 标记，本地数据不参与云同步
- **i18n** — 支持中文（zh-CN）和英文（en）
- **跨平台支持** — macOS 和 Linux 构建兼容

### Bug Fixes

- 修复 `pack` 和 `dist` 脚本未自动触发 build 的问题
- 修复 macOS 下 Edit 菜单缺失导致 Cmd+C/V/X/A/Z 快捷键失效
- 修复备份目录使用 configDir（随版本变化）而非固定路径 `~/.rcland/backups`
