# RCLand

[English](README.md)

一款桌面应用，用于管理 [Claude Code](https://claude.ai/code) CLI 和 [Codex](https://github.com/openai/codex) CLI 的 Shell 配置。通过可视化界面管理多个 API Provider、加密密钥、环境变量、PATH、Shell 函数、别名和系统代理，支持多 Shell。

![总览](docs/images/overview-zh.png)

## 功能特性

- **多 Shell 支持** — Zsh、Bash、PowerShell，自动检测操作系统
- **CC Launch 配置** — 为 Claude Code 创建命名启动配置，每个配置生成独立的 Shell 函数（如 `cc-sonnet`、`cc-opus`）
- **CX Launch 配置** — 同样支持 Codex CLI，兼容 OpenAI 官方和第三方 API
- **交互式选择器** — 可选的 `cc` / `ccl` Shell 函数，弹出交互式终端菜单选择启动配置
- **Claude 环境变量字典** — 内置 13 个 Claude Code 环境变量，含描述、分类和默认值模板
- **变量引用** — 使用 `{{VAR_NAME}}` 语法跨变量引用，支持自动拓扑排序和循环引用检测
- **路径变量** — 定义可复用的路径变量（如 `JAVA_HOME`），在生成时解析但不导出为 Shell 变量
- **系统代理** — 读取操作系统代理设置，生成切换代理的 Shell 函数
- **加密密钥存储** — API 密钥使用 AES-256-GCM + PBKDF2 加密，仅在生成配置时解密
- **环境变量管理** — 按 Shell 类型管理环境变量，支持加密、拖拽排序
- **PATH 管理** — 添加、排序、切换 PATH 条目，支持描述和变量引用
- **Shell 函数** — 多 Shell 函数体变体，含内置工具函数（`pathls`、`check-env-exists`、`prompt-select`）
- **Shell 别名** — 快捷命令别名，支持按 Shell 类型筛选
- **预设系统** — 内置常用别名包、Git 快捷方式包、SDK 路径包
- **国际化** — 支持简体中文和英文界面切换
- **冲突检测** — 检测重复变量、别名-函数冲突、未定义引用、命令覆盖
- **备份与恢复** — 每次应用前自动备份 Shell 配置（每个 Shell 最多保留 10 份）
- **云同步友好** — 任何项目可标记为 local-only，不参与云同步
- **实时预览** — 应用前预览生成的 Shell 脚本

## 安装

### 预构建安装包

<!-- TODO: 发布后添加下载链接 -->

| 平台 | 格式 |
|------|------|
| macOS | `.zip` |
| Windows | `.exe`（NSIS 安装包） |
| Linux | `.AppImage` / `.deb` |

### 从源码构建

前置要求：Node.js 18+、npm 9+

```bash
git clone https://github.com/laomst/ccland.git
cd ccland
npm install
npm run dist    # 构建平台安装包
```

## 快速上手

### 1. 启动 RCLand

打开应用，左侧导航栏包含七个模块：

<!-- 📸 截图：侧边栏导航 -->
![侧边栏](docs/images/sidebar-zh.png)

| 模块 | 说明 |
|------|------|
| **System Proxy** | 系统代理读取与管理 |
| **Env** | 环境变量 |
| **PATH** | PATH 条目和路径变量 |
| **Functions** | Shell 函数 |
| **Aliases** | Shell 别名 |
| **CCLand** | Claude Code 启动配置 |
| **CXLand** | Codex 启动配置 |

### 2. 配置 Shell Profile

点击侧边栏底部的 **齿轮图标** 打开设置：

<!-- 📸 截图：设置弹窗 -->
![设置](docs/images/settings-zh.png)

- 启用你使用的 Shell（macOS/Linux 上的 Zsh/Bash，Windows 上的 PowerShell）
- 设置加密密钥文件路径
- 选择界面语言（English / 简体中文）
- 选择默认打开的页面

### 3. 添加 CC Provider

进入 **CCLand** → **Providers** 标签：

<!-- 📸 截图：CC Provider 表单 -->
![CC Provider](docs/images/cc-provider-zh.png)

1. 点击 **添加 Provider**
2. 输入名称（如 "Anthropic"、"OpenRouter"、"GLM"）
3. 添加 **Endpoint**（API 地址）
4. 添加 **API Key**（自动加密）
5. 可选：配置 **Template** 设置默认环境变量
6. 可选：设置 **Kanban URL**（用量看板链接）

### 4. 创建启动配置

切换到 **Configs** 标签：

<!-- 📸 截图：CC Config 表单 -->
![CC Config](docs/images/cc-config-zh.png)

1. 点击 **添加 Config**
2. 选择 Provider、Endpoint、API Key
3. 设置 **函数名**（将生成 Shell 函数，如 `cc-sonnet`）
4. 配置 Claude 环境变量（或使用 **Env Dictionary** 中的内置变量）
5. 可选：启用 **Passthrough 模式**（直接运行 `claude`，不注入 Provider 凭据）
6. 保存

### 5. 启用选择器（可选）

切换到 **Selector** 标签配置交互式菜单函数：

<!-- 📸 截图：选择器配置 -->
![选择器](docs/images/selector-zh.png)

| 函数 | 说明 |
|------|------|
| `cc` | 交互式选择已同步的配置 |
| `ccd` | `cc --dangerously-skip-permissions` 的快捷方式 |
| `ccl` | 交互式选择本地专属配置 |
| `ccld` | `ccl --dangerously-skip-permissions` 的快捷方式 |

### 6. 预览与应用

使用底部操作栏：

1. 点击 Shell 名称按钮（如 **Zsh**）预览生成的脚本
2. 点击 **应用** 写入 Shell 配置文件

<!-- 📸 截图：预览弹窗 -->
![预览](docs/images/preview-zh.png)

RCLand 将配置写入 `~/.rcland/{shell}rc`，并在 Shell profile（如 `~/.zshrc`）中注入 source 行：

```bash
# >>> RCLand >>>
source ~/.rcland/zshrc
# <<< RCLand <<<
```

重启终端或执行 `source ~/.zshrc` 即可生效。

## 模块说明

### 系统代理

<!-- 📸 截图：系统代理页面 -->
![系统代理](docs/images/system-proxy-zh.png)

读取操作系统代理设置（macOS: `scutil --proxy`，Windows: 注册表，Linux: `gsettings`），显示 HTTP/HTTPS/SOCKS/NO_PROXY 值。生成三个可配置的 Shell 函数：

| 函数 | 默认名称 | 说明 |
|------|---------|------|
| 开启代理 | `proxy-on` | 导出代理环境变量 |
| 关闭代理 | `proxy-off` | 清除代理环境变量 |
| 代理状态 | `proxy-status` | 显示当前代理设置 |

### 环境变量

<!-- 📸 截图：环境变量页面 -->
![环境变量](docs/images/env-vars-zh.png)

管理 Shell 环境变量：

- 按 Shell 类型筛选（Zsh、Bash、PowerShell）
- 启用/禁用开关
- 敏感值可选加密
- 本地专属标记（不参与云同步）
- `{{VAR}}` 引用其他变量（在生成时解析）
- 拖拽排序
- 按 **已同步** 和 **本地** 分组，支持折叠

### PATH 管理

<!-- 📸 截图：PATH 管理页面 -->
![PATH 管理](docs/images/path-page-zh.png)

两个子标签：

**PATH 条目** — 向 `$env:PATH` 添加目录：
- 描述字段用于备注
- 按 Shell 类型筛选和启用/禁用
- 拖拽排序（顺序决定 PATH 优先级）
- 支持 `{{VAR}}` 引用路径变量
- 本地专属标记

**路径变量** — 定义可复用的路径变量：

<!-- 📸 截图：路径变量标签 -->
![路径变量](docs/images/path-variables-zh.png)

- 定义如 `JAVA_HOME=/usr/lib/jvm/java-17` 的变量，在生成时解析
- 不导出为 Shell 变量（仅用于 `{{VAR}}` 展开）
- 支持变量间引用，自动拓扑排序和循环引用检测
- 本地专属标记

### Shell 函数

<!-- 📸 截图：Shell 函数页面 -->
![Shell 函数](docs/images/functions-zh.png)

定义自定义 Shell 函数：

- 多 Shell 支持，可为不同 Shell 编写不同函数体
- 自动从函数体提取函数名
- 分类分组（如 `custom`、`builtin`）
- 内置只读函数：
  - `set_main_task_name` — 设置终端标签/窗口标题（iTerm2 OSC 1337 或标准 OSC 0）
  - `pathls` — 显示 PATH 条目，`-i` 参数查看 RCLand 管理的路径与完整 PATH 的对比
  - `check-env-exists` — 检查必需环境变量是否已设置，打印缺失项
  - `prompt-select` — 交互式终端菜单，支持方向键和数字快捷键

### Shell 别名

<!-- 📸 截图：别名页面 -->
![别名](docs/images/aliases-zh.png)

创建命令别名：

- 简单的 `alias name='command'` 定义
- 按 Shell 类型筛选
- 描述字段
- 启用/禁用、本地专属、拖拽排序

### CC Launch

核心功能 — 管理多个 Claude Code CLI 配置，包含四个子标签：

**Provider** 定义 API 服务：
- 名称和颜色标签
- 多个 Endpoint（API 地址，每个可单独配置系统代理）
- 多个 API Key（加密存储）
- Template 模板（新配置的默认环境变量）
- Kanban URL（用量看板链接）

**Config** 组合 Provider + Endpoint + Key + 环境变量，生成启动函数：

```bash
# 生成的函数示例（Zsh/Bash）
cc-sonnet() {
  ANTHROPIC_AUTH_TOKEN="sk-..."
  ANTHROPIC_BASE_URL="https://api.anthropic.com"
  ANTHROPIC_MODEL="claude-sonnet-4-20250514"
  claude "$@"
}
```

```powershell
# 生成的函数示例（PowerShell）
function cc-sonnet {
  $env:ANTHROPIC_AUTH_TOKEN = "sk-..."
  $env:ANTHROPIC_BASE_URL = "https://api.anthropic.com"
  $env:ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
  claude @args
}
```

支持 **Passthrough 模式** — 直接运行 `claude` 而不注入 Provider 凭据，适用于仅需设置模型偏好等场景。

**环境变量字典** — Claude Code 环境变量的精选目录：

<!-- 📸 截图：环境变量字典页面 -->
![环境变量字典](docs/images/env-dict-zh.png)

- 13 个内置条目，涵盖分类：`model`、`thinking`、`request`、`privacy`、`cache`
- 用户可添加自定义条目
- 每个条目有 `defaultInTemplate` 开关（创建新 Provider 时自动填充）
- 内置条目只读，但 `defaultInTemplate` 可覆盖

常见内置变量：`ANTHROPIC_MODEL`、`MAX_THINKING_TOKENS`、`CLAUDE_CODE_DISABLE_THINKING`、`CLAUDE_CODE_EFFORT_LEVEL`、`API_TIMEOUT_MS`、`ANTHROPIC_BETAS`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、`DISABLE_PROMPT_CACHING`

**选择器** — 配置交互式菜单函数（参见快速上手第 5 步）。

### CX Launch

<!-- 📸 截图：CX Provider 表单 -->
![CX Provider](docs/images/cx-provider-zh.png)

<!-- 📸 截图：CX Config 表单 -->
![CX Config](docs/images/cx-config-zh.png)

与 CC Launch 相同的工作流，但用于 [Codex CLI](https://github.com/openai/codex)。主要区别：

- 通过 `-c key="value"` TOML 风格参数传递配置
- 支持两种 `wireApi` 模式：
  - `responses` — OpenAI 官方 API
  - `chat` — 第三方兼容（如使用 OpenAI 兼容的端点）
- 三个子标签：**Configs**、**Providers**、**Selector**

```bash
# 生成的函数示例（Zsh/Bash）
cx-gpt4o() {
  codex -c "api_key=sk-..." -c "api_base=https://api.openai.com/v1" \
        -c "model=gpt-4o" "$@"
}
```

## 变量引用

<!-- 📸 截图：变量引用语法提示 -->
![变量引用语法](docs/images/var-ref-syntax-zh.png)

RCLand 支持在环境变量值和 PATH 条目中使用 `{{VAR_NAME}}` 语法：

- **拓扑排序** — 变量按依赖顺序生成
- **循环引用检测** — 变量形成循环时发出警告
- **删除保护** — 阻止删除被其他变量引用的变量
- **可视化标签** — 引用在界面中渲染为可点击的标签，附带语法提示
- **跨模块引用** — 环境变量可引用路径变量，反之亦然

## 预设系统

内置预设包，快速导入：

| 预设 | 内容 |
|------|------|
| **常用别名** | `ls` 变体、导航快捷键、Python 辅助 |
| **Git 别名** | `gst`、`gco`、`gbr`、`glg` 等 |
| **SDK 变量** | Java `JAVA_HOME`、Maven `MAVEN_HOME`、Python 路径 |

在每个模块页面点击 **导入** 按钮即可导入预设。

## 加密机制

RCLand 使用 **AES-256-GCM** 加密敏感数据（API 密钥/Token）：

- 密钥通过 **PBKDF2** 派生（SHA-256，100,000 次迭代，16 字节随机盐）
- 加密值以 `enc:v1:{base64}` 格式存储（盐 + IV + 认证标签 + 密文）
- 仅在生成配置时按需解密
- **临时密钥模式** — 使用一次性口令进行单次应用操作
- 完整的 **重新加密** 支持，更换密钥时可批量处理

**首次使用：** 首次点击「应用」时，RCLand 会提示初始化加密密钥。

## 冲突检测

应用前检查六类冲突：

| 严重级别 | 检查项 |
|---------|--------|
| 错误 | 重复的环境变量键名 |
| 错误 | 重复的别名名称 |
| 错误 | 别名与函数名冲突 |
| 警告 | 别名覆盖系统命令（ls、cd、rm、mv、cp 等） |
| 警告 | 重复的 PATH 条目 |
| 警告 | 未定义的 `{{VAR}}` 引用 |

## 数据存储

| 文件 | 内容 | 可同步 |
|------|------|--------|
| `rcland.config.claudecode.json` | CC Launch Provider、Config、Selector | 是 |
| `rcland.config.codex.json` | CX Launch Provider、Config、Selector | 是 |
| `rcland.config.shell.json` | 变量、PATH、函数、别名 | 是 |
| `rcland.claude-env-dict.json` | Claude 环境变量字典（用户条目 + 覆盖） | 是 |
| `local/` 子目录 | 各配置类型的本地专属数据 | 否 |
| `backups/` 子目录 | Shell 配置备份（每个 Shell 最多 10 份） | 否 |
| Electron `userData` | 应用设置（窗口状态、密钥路径、语言） | 否 |
| `~/.rcland/` | 生成的 Shell 脚本（`zshrc`、`bashrc`、`powershellrc.ps1`） | 否 |

## 开发

### 前置要求

- Node.js 18+
- npm 9+

### 命令

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（Electron + Vite HMR）
npm run build     # 编译 TypeScript 并打包
npm run preview   # 预览构建产物
npm run pack      # 打包为目录（不签名）
npm run dist      # 构建平台安装包
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 35 |
| UI | React 19 + Ant Design 5 |
| 语言 | TypeScript 5.8 |
| 状态管理 | Zustand 5 |
| 拖拽排序 | @dnd-kit |
| 国际化 | i18next + react-i18next |
| 构建 | electron-vite 3 |
| 打包 | electron-builder 25 |

### 架构

```
┌─────────────────────────────────────────────┐
│                  Renderer                    │
│   React 19 + Ant Design + Zustand Stores    │
│   (src/renderer/src/)                        │
├─────────────────────────────────────────────┤
│            Preload（Context Bridge）          │
│   类型安全 IPC 桥接 → window.electronAPI      │
│   (src/preload/)                             │
├─────────────────────────────────────────────┤
│                    Main                      │
│   应用生命周期、文件 I/O、加密、Shell 生成器    │
│   （Zsh/Bash/PowerShell）                     │
│   (src/main/)                                │
└─────────────────────────────────────────────┘
```

### 测试

测试使用 Node.js 内置测试运行器 + esbuild 打包：

```bash
npm test          # 运行所有测试
```

共 17 个测试文件，覆盖：Claude 环境变量字典、配置更新、CX 构建器、加密、生成器转义、IPC 契约、本地配置、同步逻辑、OS 代理读取、Shell 应用、系统代理生成。

## 许可证

<!-- TODO: 添加许可证信息 -->
