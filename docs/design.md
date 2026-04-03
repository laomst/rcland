# CCland - 设计文档

## 1. 项目概述

CCland 是一个 Electron 桌面应用，定位为 Claude Code CLI 的综合管理工具。当前首个功能模块为 **Claude Code 启动配置管理**，后续将持续扩展更多功能模块。

### 1.1 当前模块：启动配置管理

管理 Claude Code CLI 运行所需的 Provider、Token、Launcher 和 Selector 配置：

- 以 JSON 格式管理所有配置数据，数据层与 Shell 类型解耦（shell-agnostic）
- 敏感字段（Token 等）支持 AES-256-GCM 加密存储，密钥文件路径可自定义
- 一键生成 Shell 配置文件，支持多种 Shell 类型（zsh、bash、PowerShell、fish）
- 自动检测当前系统 Shell，适配对应的 profile 文件（`.zshrc` / `$PROFILE` 等）
- 配置目录可指定，便于通过 iCloud/Dropbox 等跨设备同步

### 1.2 扩展性设计

应用采用模块化架构，UI 布局和路由设计均考虑了未来功能模块的接入：

- 侧边栏按功能模块分组，当前仅有「Claude Code 配置」分组，未来可平铺添加新分组
- 路由、状态管理、IPC 通道均按模块隔离，新增模块不影响已有模块
- 底层基础设施（加解密、配置文件管理、Shell 生成器）作为共享服务供所有模块使用

## 2. 技术架构

```
┌──────────────────────────────────────────────────────────────┐
│                      Electron 主进程                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │   基础设施    │  │  Shell 生成器 │  │  模块服务 (可扩展)  │ │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌──────────────┐  │ │
│  │  │文件管理│  │  │  │  zsh   │  │  │  │ CC 启动配置   │  │ │
│  │  │加解密  │  │  │  │  bash  │  │  │  │ (Provider/    │  │ │
│  │  │导入解析│  │  │  │  pwsh  │  │  │  │  Token/       │  │ │
│  │  └────────┘  │  │  │  fish  │  │  │  │  Launcher)    │  │ │
│  └──────┬───────┘  │  └────┬───┘  │  │  └──────┬───────┘  │ │
│         │          │  (可扩展)    │  │  (可扩展) │          │ │
│         └──────────┴──────┬───────┴──┴──────────┘          │
│                           │ IPC                             │
├───────────────────────────┼─────────────────────────────────┤
│                      渲染进程                               │
│  ┌────────────────────────┴───────────────────────────────┐ │
│  │                React + TypeScript                       │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │ │
│  │  │ CC 配置模块  │  │ 未来模块 ...  │  │  共享设置页    │ │ │
│  │  │ (Providers) │  │              │  │  (Settings)    │ │ │
│  │  │ (Launchers) │  │              │  │               │ │ │
│  │  │ (Selector)  │  │              │  │               │ │ │
│  │  └─────────────┘  └──────────────┘  └───────────────┘ │ │
│  │         Ant Design  |  Zustand  |  Vite                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 技术选型

| 层面       | 选择                            | 理由                          |
| ---------- | ------------------------------- | ----------------------------- |
| 框架       | Electron 33+                    | 跨平台桌面应用                |
| 前端       | React 19 + TypeScript 5         | 生态成熟，类型安全            |
| UI 组件库  | Ant Design 5                    | 开箱即用的表单/表格/布局组件  |
| 状态管理   | Zustand                         | 轻量简洁，适合中小型应用      |
| 构建工具   | Vite + electron-builder         | 开发体验好，打包配置简单      |
| 加密       | Node.js crypto（AES-256-GCM）   | 无需外部依赖，性能好          |

### 项目目录结构

```
ccland/
├── docs/
│   └── design.md
├── src/
│   ├── main/                         # Electron 主进程
│   │   ├── index.ts                  # 入口，窗口创建
│   │   ├── ipc.ts                    # IPC handler 注册
│   │   ├── services/
│   │   │   ├── config.ts             # 配置文件读写
│   │   │   ├── crypto.ts             # 加解密服务（共享基础设施）
│   │   │   ├── shell-detector.ts     # 系统Shell自动检测
│   │   │   ├── importer.ts           # 从现有配置文件导入
│   │   │   ├── generators/           # Shell 生成器（策略模式）
│   │   │   │   ├── index.ts          # 生成器注册表 & 工厂
│   │   │   │   ├── base.ts           # BaseShellGenerator 抽象类
│   │   │   │   ├── zsh.ts            # zsh 生成器
│   │   │   │   ├── bash.ts           # bash 生成器
│   │   │   │   ├── powershell.ts     # PowerShell 生成器
│   │   │   │   └── fish.ts           # fish 生成器
│   │   │   └── modules/              # 功能模块（可扩展）
│   │   │       └── cc-launch/        # Claude Code 启动配置模块
│   │   │           ├── types.ts      # 模块数据类型
│   │   │           ├── service.ts    # 模块业务逻辑
│   │   │           └── importer.ts   # 模块专用导入解析
│   │   └── preload.ts                # contextBridge 暴露 API
│   ├── renderer/                     # 渲染进程（React）
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── modules/                  # 功能模块页面（可扩展）
│   │   │   └── cc-launch/            # Claude Code 启动配置模块
│   │   │       ├── pages/
│   │   │       │   ├── Providers.tsx
│   │   │       │   ├── Launchers.tsx
│   │   │       │   └── Selector.tsx
│   │   │       └── components/
│   │   │           ├── FieldEditor.tsx
│   │   │           └── TokenList.tsx
│   │   ├── pages/
│   │   │   └── Settings.tsx          # 全局设置页
│   │   ├── components/               # 全局共享组件
│   │   │   ├── ModuleNav.tsx         # 模块化侧边栏导航
│   │   │   └── ShellPreview.tsx      # Shell 配置预览（多Shell切换）
│   │   └── stores/
│   │       ├── settings.ts           # 全局设置 store
│   │       └── modules/
│   │           └── cc-launch.ts      # CC 启动配置模块 store
│   └── shared/
│       ├── types.ts                  # 共享基础类型
│       └── shell.ts                  # Shell 类型定义 & 枚举
├── package.json
├── electron-builder.yml
├── tsconfig.json
└── vite.config.ts
```

## 3. 数据模型

> **设计原则：数据层与 Shell 类型完全解耦。** JSON 中存储的是 shell-agnostic 的结构化数据，由 Shell 生成器负责转换为特定 Shell 语法的配置文件。

### 3.0 Shell 类型定义

```typescript
// shared/shell.ts
type ShellType = 'zsh' | 'bash' | 'powershell' | 'fish'

interface ShellProfile {
  type: ShellType
  profilePath: string     // Shell 配置文件路径，如 ~/.zshrc、$PROFILE
  outputPath: string      // 生成的配置文件路径，如 ~/cctokenrc.zsh
  autoSource: boolean     // 是否自动在 profile 中 source
}

// 各 Shell 的默认值
const SHELL_DEFAULTS: Record<ShellType, { profilePath: string; outputFileExt: string }> = {
  zsh:         { profilePath: '~/.zshrc',                            outputFileExt: '.zsh'  },
  bash:        { profilePath: '~/.bashrc',                           outputFileExt: '.sh'   },
  powershell:  { profilePath: '$PROFILE',                            outputFileExt: '.ps1'  },
  fish:        { profilePath: '~/.config/fish/config.fish',          outputFileExt: '.fish' },
}
```

### 3.1 整体结构

所有业务数据存储在配置目录下的 `data.json` 中：

```jsonc
{
  "version": 1,
  "defaultAuthToken": {
    "varName": "GLM_ANTHROPIC_AUTH_TOKEN",  // 默认 ANTHROPIC_AUTH_TOKEN 指向哪个 token
    "enabled": true
  },
  "providers": [ /* Provider[] */ ],
  "launchers": [ /* Launcher[] */ ],
  "selector": { /* SelectorConfig */ }
}
```

### 3.2 Provider（API 供应商）

```typescript
interface Provider {
  id: string                       // 唯一标识，如 "glm", "minimax"
  name: string                     // 显示名称，如 "GLM (智谱 AI)"
  comment: string                  // 描述注释
  enabled: boolean                 // 是否启用（false 则整个 provider 不导出）
  baseUrl: ProviderField<string>   // Base URL
  tokens: ProviderToken[]          // 该 provider 下的 token 列表
}

interface ProviderField<T> {
  varName: string      // 环境变量名，如 "GLM_ANTHROPIC_BASE_URL"
  value: T             // 实际值（加密时存储密文）
  enabled: boolean     // false → 生成时注释掉
  encrypted: boolean   // true → value 存储为密文，生成时解密
}

interface ProviderToken {
  id: string
  varName: string      // 如 "GLM_ANTHROPIC_AUTH_TOKEN"
  value: string        // token 值（加密时为密文）
  enabled: boolean
  encrypted: boolean
  comment: string      // 行末注释，如 "冲哥的Key"
}
```

### 3.3 Launcher（启动函数）

```typescript
interface Launcher {
  id: string
  funcName: string              // 函数名，如 "cc-glm5"
  description: string           // 函数上方注释
  enabled: boolean              // false → 不生成此函数
  providerId: string            // 引用的 Provider
  tokenVarName: string          // 使用的 token 变量名
  envVars: {
    ANTHROPIC_MODEL?: string
    ANTHROPIC_DEFAULT_OPUS_MODEL?: string
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string
    ANTHROPIC_DEFAULT_HAIKU_MODEL?: string
    API_TIMEOUT_MS: string
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: string
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS?: string
  }
}
```

### 3.4 Selector（模型选择器）

```typescript
interface SelectorConfig {
  enabled: boolean              // 是否生成 cc() 函数
  funcName: string              // 默认 "cc"
  promptTitle: string           // 选择提示，默认 "Claude Code 模型选择"
  entries: SelectorEntry[]
}

interface SelectorEntry {
  shortcut: string              // 快捷键，如 "glm5"
  displayName: string           // 显示名，如 "GLM-5 (智谱AI, GLM Coding Plan)"
  launcherId: string            // 关联的 Launcher
  enabled: boolean
  order: number                 // 排序
}
```

### 3.5 示例 data.json

```jsonc
{
  "version": 1,
  "defaultAuthToken": {
    "varName": "GLM_ANTHROPIC_AUTH_TOKEN",
    "enabled": true
  },
  "providers": [
    {
      "id": "glm",
      "name": "GLM (智谱 AI)",
      "comment": "GLM (智谱 AI)",
      "enabled": true,
      "baseUrl": {
        "varName": "GLM_ANTHROPIC_BASE_URL",
        "value": "https://open.bigmodel.cn/api/anthropic",
        "enabled": true,
        "encrypted": false
      },
      "tokens": [
        {
          "id": "glm-main",
          "varName": "GLM_ANTHROPIC_AUTH_TOKEN",
          "value": "enc:v1:a3f5b2...（密文）",
          "enabled": true,
          "encrypted": true,
          "comment": ""
        },
        {
          "id": "glm-cs",
          "varName": "GLM_ANTHROPIC_AUTH_TOKEN_CS",
          "value": "",
          "enabled": false,
          "encrypted": false,
          "comment": "冲哥的Key"
        }
      ]
    },
    {
      "id": "minimax",
      "name": "MiniMax",
      "comment": "MiniMax",
      "enabled": true,
      "baseUrl": {
        "varName": "MINIMAX_ANTHROPIC_BASE_URL",
        "value": "https://api.minimaxi.com/anthropic",
        "enabled": true,
        "encrypted": false
      },
      "tokens": [
        {
          "id": "minimax-main",
          "varName": "MINIMAX_ANTHROPIC_AUTH_TOKEN",
          "value": "enc:v1:7d2e9f...（密文）",
          "enabled": true,
          "encrypted": true,
          "comment": ""
        }
      ]
    }
  ],
  "launchers": [
    {
      "id": "cc-glm5",
      "funcName": "cc-glm5",
      "description": "使用 GLM (智谱 AI) 模型运行 Claude Code",
      "enabled": true,
      "providerId": "glm",
      "tokenVarName": "GLM_ANTHROPIC_AUTH_TOKEN",
      "envVars": {
        "ANTHROPIC_MODEL": "glm-5.1",
        "ANTHROPIC_DEFAULT_OPUS_MODEL": "glm-5.1",
        "ANTHROPIC_DEFAULT_SONNET_MODEL": "glm-5.1",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5.1",
        "API_TIMEOUT_MS": "300000",
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
      }
    }
  ],
  "selector": {
    "enabled": true,
    "funcName": "cc",
    "promptTitle": "Claude Code 模型选择",
    "entries": [
      {
        "shortcut": "glm5",
        "displayName": "GLM-5 (智谱AI, GLM Coding Plan)",
        "launcherId": "cc-glm5",
        "enabled": true,
        "order": 1
      }
    ]
  }
}
```

## 4. 加密方案

### 4.1 算法选择

- **加密算法**: AES-256-GCM（认证加密，防篡改）
- **密钥派生**: PBKDF2-SHA256，迭代 100,000 次
- **密钥来源**: 用户提供的密钥字符串，存储在本地密钥文件中

### 4.2 密文格式

加密后的值以 `enc:v1:` 前缀标识，后跟 Base64 编码的 `iv(12B) + authTag(16B) + ciphertext`：

```
enc:v1:<base64(iv || authTag || ciphertext)>
```

### 4.3 密钥文件

密钥文件存储用户提供的原始密钥字符串（UTF-8 文本）。路径由用户在设置中指定，**不应放在同步目录中**。

```
# 示例：~/.cctokenrc/keyfile.key
my-secret-passphrase-for-cctokenrc
```

### 4.4 加解密流程

```
加密: plaintext → PBKDF2(key, salt) → AES-256-GCM-Encrypt(random-iv, plaintext) → "enc:v1:" + base64(salt + iv + authTag + ciphertext)

解密: "enc:v1:" + base64_decode → extract(salt, iv, authTag, ciphertext) → PBKDF2(key, salt) → AES-256-GCM-Decrypt(iv, ciphertext, authTag) → plaintext
```

> 注意：为了支持密钥更换（重加密），salt 存储在每个密文值内部而非全局共享。

### 4.5 加密操作入口

- **单个字段切换加密**: 在编辑字段时勾选"加密"，输入明文值后自动加密存储
- **批量加密/解密**: 设置页提供"全部加密"、"全部解密"操作
- **更换密钥**: 设置页提供"更换密钥"功能，用旧密钥解密后用新密钥重新加密所有字段

## 5. 文件与目录

### 5.1 文件布局

```
┌─ 配置目录（可同步） ────────────────────────────┐
│  {configDir}/                                    │
│  ├── data.json          # 所有业务数据           │
│  └── (可放在 iCloud/Dropbox/Git 仓库中)          │
└──────────────────────────────────────────────────┘

┌─ 本地文件（不同步） ─────────────────────────────┐
│  密钥文件: {keyFilePath}       # 用户指定路径     │
│  应用设置: {userData}/settings.json               │
│  └─ macOS: ~/Library/Application Support/         │
│     CCland/settings.json                          │
│  └─ Windows: %APPDATA%/CCland/settings.json       │
│  └─ Linux: ~/.config/CCland/settings.json         │
└──────────────────────────────────────────────────┘

┌─ 生成文件（由 Shell 类型决定） ───────────────────┐
│  zsh:        ~/cctokenrc.zsh   → source 到 ~/.zshrc │
│  bash:       ~/cctokenrc.sh    → source 到 ~/.bashrc │
│  PowerShell: ~/cctokenrc.ps1   → . 到 $PROFILE       │
│  fish:       ~/.config/fish/cctokenrc.fish           │
└──────────────────────────────────────────────────────┘
```

### 5.2 应用设置（settings.json）

存储在 Electron 的 `app.getPath('userData')` 下，不随配置目录同步：

```typescript
interface AppSettings {
  configDir: string              // 配置目录路径（可同步目录）
  keyFilePath: string            // 密钥文件路径
  shellProfile: ShellProfile     // 当前 Shell 配置（类型、路径等）
}
```

### 5.3 Shell Profile 集成

应用启动时通过 `shell-detector.ts` 自动检测当前系统默认 Shell，用户也可手动切换。点击"应用"时：

1. 根据 `shellProfile.type` 调用对应的 Shell 生成器
2. 生成配置文件写入 `shellProfile.outputPath`
3. 检查 `shellProfile.profilePath` 中是否已存在 source/point 行，不存在则追加

各 Shell 的 source 指令：

```zsh
# zsh / bash / fish — 使用标记注释确保幂等
# >>> CCland >>>
source ~/cctokenrc.zsh
# <<< CCland <<<

# PowerShell
# >>> CCland >>>
. ~/cctokenrc.ps1
# <<< CCland <<<
```

## 6. UI 设计

### 6.1 整体布局（模块化）

```
┌──────────────────────────────────────────────────────────┐
│  CCland                                    ─  □  ✕       │
├───────────┬──────────────────────────────────────────────┤
│           │                                              │
│  ▼ CC配置 │                                              │
│    供应商  │              主内容区                        │
│    启动器  │                                              │
│    选择器  │   根据左侧选中的导航项                        │
│           │   展示对应的列表/表单/预览                     │
│           │                                              │
│  ▼ 未来   │   导航项随功能模块动态生成                     │
│   模块 ...│                                              │
│           │                                              │
│  ─────── │                                              │
│   设置    │                                              │
│           │                                              │
├───────────┴──────────────────────────────────────────────┤
│  当前Shell: zsh ▾  │ [预览配置]  │  [应用配置]           │
└──────────────────────────────────────────────────────────┘
```

设计要点：
- **侧边栏按功能模块分组**：当前仅「CC 配置」分组（含供应商/启动器/选择器），未来新模块平铺添加新分组
- **设置页全局固定**：始终在侧边栏底部，不属于任何功能模块
- **底部全局操作栏**：显示当前 Shell 类型（可快速切换），预览和应用按钮始终可见
- **模块注册机制**：每个模块声明自己的导航项和页面组件，应用启动时动态注册到侧边栏

### 6.2 模块注册接口

```typescript
// 新增功能模块只需实现此接口
interface ModuleDescriptor {
  id: string                      // 模块标识，如 "cc-launch"
  name: string                    // 模块显示名，如 "CC 配置"
  icon: ReactNode                 // 侧边栏图标
  navItems: NavItem[]             // 模块子导航项
  routes: RouteObject[]           // 模块路由
  init: () => Promise<void>       // 模块初始化
}
```

### 6.3 页面说明

#### 供应商管理页（Providers）

- 卡片列表展示所有 Provider
- 每张卡片显示：名称、Base URL、Token 数量、启用状态
- 展开卡片进入编辑模式：
  - Provider 名称、注释
  - Base URL 编辑（含加密开关）
  - Token 列表（增删改，每个 Token 可独立设置加密和启用状态）
- 支持 Provider 的启用/禁用、排序

#### 启动器管理页（Launchers）

- 列表展示所有 Launcher 函数
- 每行显示：函数名、描述、关联 Provider、启用状态
- 编辑面板：
  - 函数名、描述
  - 关联 Provider（下拉选择）
  - 使用的 Token（下拉选择该 Provider 下的 Token）
  - 环境变量表单（模型名、超时时间等）
  - 启用/禁用

#### 选择器配置页（Selector）

- 开关：是否生成 `cc()` 函数
- 可排序列表，配置每个选项的 shortcut、显示名、关联 Launcher
- 拖拽排序调整顺序
- 实时预览生成的选择器函数代码（可切换 Shell 类型预览）

#### 设置页（Settings）— 全局

分为两个区域：

**通用设置**
- 配置目录路径（含文件夹选择器）
- 密钥文件路径（含文件选择器）
- 密钥管理：初始化密钥、更换密钥
- 批量操作：全部加密、全部解密

**Shell 设置**
- 当前 Shell 类型（自动检测 + 手动切换）
- Shell profile 路径（如 `.zshrc`）
- 输出配置文件路径
- 自动 source / dot 开关
- 从现有配置文件导入

### 6.4 字段编辑器组件（FieldEditor）

每个字段编辑器统一提供：

```
┌─────────────────────────────────────────────┐
│  变量名: [GLM_ANTHROPIC_AUTH_TOKEN    ]  🔒 │
│  值:    [••••••••••••••••••••••••••••••]  👁 │
│  ☑ 启用   ☑ 加密                             │
│  备注: [冲哥的Key                        ]    │
└─────────────────────────────────────────────┘
```

- 🔒 加密状态图标（已加密/未加密）
- 👁 显示/隐藏值（类似密码输入框）
- 加密字段在 UI 中默认以 `•••` 遮罩显示，点击👁可临时查看明文
- 勾选/取消"加密"时自动执行加解密

### 6.5 Shell 预览组件（ShellPreview）

底部操作栏点击「预览配置」时弹出模态窗口：

- 顶部 Tab 切换不同 Shell 类型（即使当前设备只用 zsh，也能预览 PowerShell 等输出）
- 语法高亮显示生成的配置文件内容
- 标注被禁用的条目（以注释形式存在于生成内容中）

## 7. Shell 生成器

### 7.1 架构设计

采用策略模式，每种 Shell 类型实现统一的生成器接口：

```typescript
// generators/base.ts
interface ShellGenerator {
  shellType: ShellType

  // 生成完整配置文件
  generate(data: CCLaunchData, decryptedValues: Map<string, string>): string

  // 生成 source 指令（用于写入 profile）
  generateSourceLine(outputPath: string): string

  // Source 指令的标记（用于幂等检测）
  sourceMarkers: { begin: string; end: string }

  // 文件头注释
  fileHeader(): string
}
```

### 7.2 生成器注册表

```typescript
// generators/index.ts
const generatorRegistry = new Map<ShellType, ShellGenerator>()

function getGenerator(shellType: ShellType): ShellGenerator {
  const gen = generatorRegistry.get(shellType)
  if (!gen) throw new Error(`Unsupported shell: ${shellType}`)
  return gen
}

// 新增 Shell 支持只需：1. 实现 ShellGenerator  2. 注册到 registry
```

### 7.3 各 Shell 语法差异对照

| 操作             | zsh / bash                          | PowerShell                           | fish                               |
| ---------------- | ----------------------------------- | ------------------------------------ | ---------------------------------- |
| 导出变量         | `export FOO="bar"`                  | `$env:FOO = "bar"`                   | `set -gx FOO bar`                  |
| 注释变量         | `# export FOO="bar"`                | `# $env:FOO = "bar"`                 | `# set -gx FOO bar`                |
| 引用变量         | `"$FOO"`                            | `"$env:FOO"`                         | `"$FOO"`                           |
| 定义函数         | `cc-glm5() { ... }`                | `function cc-glm5 { ... }`           | `function cc-glm5; ...; end`       |
| 环境变量前缀运行 | `FOO=bar command`                   | `$env:FOO="bar"; command`            | `env FOO=bar command`              |
| switch/case      | `case $REPLY in ... esac`          | `switch ($REPLY) { ... }`            | `switch "$REPLY"; case ...; end`   |
| 参数传递         | `"$@"`                              | `$args`                              | `$argv`                            |
| 错误返回         | `\|\| return 1`                     | `if (-not $?) { return }`            | `\|\| return 1`                    |
| Source 文件      | `source ~/cctokenrc.zsh`            | `. ~/cctokenrc.ps1`                  | `source ~/.config/fish/cctokenrc.fish` |

### 7.4 生成示例

#### zsh 输出（与现有文件格式兼容）

```zsh
#!/bin/zsh
# 由 CCland 自动生成，请勿手动编辑
# 生成时间: 2026-03-29 15:30:00

# ============================================================
# Providers: 环境变量
# ============================================================

# GLM (智谱 AI)
export GLM_ANTHROPIC_AUTH_TOKEN="bab01a51989b4d20be0b7e7fcf959029.BZj0azWR0IvN271W"
export GLM_ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"

export ANTHROPIC_AUTH_TOKEN="$GLM_ANTHROPIC_AUTH_TOKEN"

# ============================================================
# Launcher: 启动函数
# ============================================================

# 使用 GLM (智谱 AI) 模型运行 Claude Code
cc-glm5() {
  check-env-exists "GLM_ANTHROPIC_AUTH_TOKEN" "GLM_ANTHROPIC_BASE_URL" || return 1
  ANTHROPIC_AUTH_TOKEN="$GLM_ANTHROPIC_AUTH_TOKEN" \
  ANTHROPIC_BASE_URL="$GLM_ANTHROPIC_BASE_URL" \
  ANTHROPIC_MODEL="glm-5.1" \
  ANTHROPIC_DEFAULT_OPUS_MODEL="glm-5.1" \
  ANTHROPIC_DEFAULT_SONNET_MODEL="glm-5.1" \
  ANTHROPIC_DEFAULT_HAIKU_MODEL="glm-5.1" \
  API_TIMEOUT_MS=300000 \
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
  claude "$@"
}

cc() {
  local _opts=(
      "glm5:GLM-5 (智谱AI, GLM Coding Plan)"
      "minimax:MiniMax-M-2.5 (MiniMax)"
  )
  prompt-select "Claude Code 模型选择" "${_opts[@]}" || return 0
  case $REPLY in
    glm5)    cc-glm5 "$@" ;;
    minimax) cc-minimax "$@" ;;
  esac
}
```

#### PowerShell 输出

```powershell
# 由 CCland 自动生成，请勿手动编辑
# 生成时间: 2026-03-29 15:30:00

# ============================================================
# Providers: 环境变量
# ============================================================

# GLM (智谱 AI)
$env:GLM_ANTHROPIC_AUTH_TOKEN = "bab01a51989b4d20be0b7e7fcf959029.BZj0azWR0IvN271W"
$env:GLM_ANTHROPIC_BASE_URL = "https://open.bigmodel.cn/api/anthropic"

$env:ANTHROPIC_AUTH_TOKEN = $env:GLM_ANTHROPIC_AUTH_TOKEN

# ============================================================
# Launcher: 启动函数
# ============================================================

# 使用 GLM (智谱 AI) 模型运行 Claude Code
function cc-glm5 {
  if (-not $env:GLM_ANTHROPIC_AUTH_TOKEN -or -not $env:GLM_ANTHROPIC_BASE_URL) {
    Write-Error "Missing env: GLM_ANTHROPIC_AUTH_TOKEN, GLM_ANTHROPIC_BASE_URL"; return
  }
  $env:ANTHROPIC_AUTH_TOKEN = $env:GLM_ANTHROPIC_AUTH_TOKEN
  $env:ANTHROPIC_BASE_URL = $env:GLM_ANTHROPIC_BASE_URL
  $env:ANTHROPIC_MODEL = "glm-5.1"
  $env:ANTHROPIC_DEFAULT_OPUS_MODEL = "glm-5.1"
  $env:ANTHROPIC_DEFAULT_SONNET_MODEL = "glm-5.1"
  $env:ANTHROPIC_DEFAULT_HAIKU_MODEL = "glm-5.1"
  $env:API_TIMEOUT_MS = "300000"
  $env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
  claude @args
}

function cc {
  $options = @(
    [System.Tuple]::Create("glm5", "GLM-5 (智谱AI, GLM Coding Plan)")
    [System.Tuple]::Create("minimax", "MiniMax-M-2.5 (MiniMax)")
  )
  # ... 选择器逻辑
}
```

## 8. 核心功能流程

### 8.1 首次启动

```
启动应用
  → 检查 settings.json
    → 不存在 → 显示引导向导
      → 选择/创建配置目录
      → 选择/创建密钥文件（输入密钥字符串）
      → 自动检测系统 Shell（可手动切换）
      → 确认输出文件路径和 profile 路径
      → 可选：从现有配置文件导入
    → 已存在 → 加载配置
      → 尝试读取密钥文件
        → 失败 → 提示密钥文件不可用（加密字段无法解密，以只读模式展示）
        → 成功 → 正常加载
```

### 8.2 从现有配置文件导入（Parser）

支持从多种 Shell 格式的配置文件导入。根据当前 Shell 类型选择对应的 Parser：

- **zsh/bash Parser**：解析 `export` 语句、`func() {}` 函数定义、`case` 语句
- **PowerShell Parser**：解析 `$env:VAR = ...`、`function name { ... }`
- **fish Parser**：解析 `set -gx VAR val`、`function name; ...; end`

导入逻辑（以 zsh 为例）：
1. `export` 语句 → 提取变量名、值、注释、启用状态
2. 函数定义 → 提取函数名、描述注释、引用的 Provider/Token、环境变量
3. `cc()` 函数 → 提取选择器配置
4. 通过变量名前缀自动归类到 Provider（如 `GLM_*` → GLM Provider）
5. `*_ANTHROPIC_AUTH_TOKEN` 归为 Token，`*_ANTHROPIC_BASE_URL` 归为 Base URL

### 8.3 应用配置（生成 Shell 文件）

```
点击"应用配置"
  → 读取 data.json
  → 读取密钥文件
  → 对所有 encrypted=true 的字段执行解密
  → 根据 shellProfile.type 获取对应 ShellGenerator
  → generator.generate() 生成配置文件内容
    → Part 1: 文件头注释
    → Part 2: Provider 环境变量
    → Part 3: 默认 ANTHROPIC_AUTH_TOKEN 映射
    → Part 4: Launcher 函数定义
    → Part 5: Selector 选择器函数
  → 写入 shellProfile.outputPath
  → 检查 shellProfile.profilePath 中 source 标记
    → 不存在 → 追加 sourceMarkers 包裹的 source 指令
    → 已存在 → 跳过
  → 提示"应用成功"
```

## 9. 跨设备同步策略

```
macOS (zsh)                          Windows (PowerShell)
┌──────────────────┐                 ┌──────────────────────┐
│ settings.json    │                 │ settings.json         │
│ (本地，不同步)    │                 │ (本地，不同步)         │
│                  │                 │                       │
│ shellProfile:    │                 │ shellProfile:         │
│  type: zsh       │                 │  type: powershell     │
│  profile: ~/.zshrc                 │  profile: $PROFILE    │
│  output: ~/cc.zsh                  │  output: ~/cc.ps1     │
│                  │                 │                       │
│ configDir →      │   iCloud /      │ configDir →           │
│  ~/Library/      │◄─ Dropbox ──►  │  D:\Sync\             │
│  Mobile Documents│                 │  CCland\              │
│  /ccland/        │                 │  └── data.json        │
│  └── data.json   │                 │                       │
│                  │                 │ keyFilePath →          │
│ keyFilePath →    │                 │  C:\Users\..\.keys\   │
│  ~/.ccland/      │                 │  └── ccland.key       │
│  └── keyfile.key │                 │                       │
└──────────────────┘                 └──────────────────────┘
```

核心要点：
- `data.json` 放在同步目录中自动同步（**数据与 Shell 无关**，同一份 JSON 在 macOS 和 Windows 通用）
- `settings.json` 是每台机器的本地配置，包含各自的 Shell 类型和路径
- 密钥文件不在同步目录中，需手动在新设备上设置（或用 1Password 等密码管理器管理）
- 新设备首次启动：指定配置目录（指向同步位置）→ 指定/创建密钥 → 自动检测 Shell → 可用

## 10. 开发阶段规划

### Phase 1: 基础框架
- Electron + React + TypeScript + Vite 项目搭建
- 模块化侧边栏导航 + 路由框架
- Shell 类型定义和注册机制
- IPC 通信基础设施

### Phase 2: 数据层 & 基础设施
- data.json 的 CRUD 操作
- 加解密服务实现
- Shell 自动检测（`shell-detector.ts`）
- zsh 生成器（首优先生成，与现有文件兼容）

### Phase 3: CC 启动配置模块 — UI
- Provider 管理页
- Launcher 管理页
- Selector 配置页
- FieldEditor / TokenList 组件

### Phase 4: 生成 & 导入 & 设置
- zsh 文件生成 + .zshrc source 集成
- 从现有 zsh 文件导入的 Parser
- Shell 预览组件（多 Shell Tab 切换预览）
- Settings 设置页

### Phase 5: 扩展 Shell 支持
- bash 生成器
- PowerShell 生成器
- fish 生成器
- 对应的 Parser 实现

### Phase 6: 打包与优化
- electron-builder 多平台打包（macOS .dmg、Windows .exe、Linux .AppImage）
- 代码签名和公证（可选）
- 自动更新（可选）
