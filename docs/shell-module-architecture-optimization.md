# Shell 模块架构优化设计

> 基于 `shell-module-design.md` 的架构优化方案，解决原设计中的安全性、可维护性、数据一致性等问题。

---

## 1. 设计背景

### 1.1 原设计存在的问题

| 类别 | 问题 | 影响 |
|------|------|------|
| 安全 | 环境变量值未做 shell 转义 | 特殊字符导致语法错误或命令注入 |
| 安全 | 环境变量中的敏感信息无加密 | 同步时泄露 API Key 等 |
| 架构 | 生成器职责过重 | 单个类包含所有模块的生成逻辑，难以维护 |
| 架构 | Shell 配置与 CC 配置生成耦合 | 生成器需同时感知两个数据源 |
| 数据 | 缺少冲突检测 | 重名变量、别名覆盖系统命令等问题无预警 |
| 数据 | 缺少跨 shell 差异化能力 | 不同 shell 下的配置无法独立控制 |
| 体验 | 无备份/回滚机制 | 误操作导致 shell 环境损坏无法恢复 |
| 体验 | 无预制数据 | 用户需从零手动录入所有配置 |
| 体验 | source 注入方式未定义 | 功能闭环缺失 |
| 设计 | 补全模块设计过于简略 | 实际补全配置复杂度远超当前设计 |

### 1.2 优化目标

- 全面解决上述所有问题
- 支持 zsh、bash、PowerShell 三种 shell（移除 Fish）
- 模块化 SectionGenerator 架构，每个模块独立可测
- 预制数据内置，一键导入常用工具
- 应用前自动备份，支持回滚
- 暂不做补全模块和 rc 文件导入功能

### 1.3 决策记录

| 决策项 | 选择 | 理由 |
|--------|------|------|
| Shell 支持范围 | zsh + bash + PowerShell | 覆盖主流，Fish 用户少且语法差异大 |
| 数据存储 | 双文件（shell.json + claudecode.json） | Shell 配置可安全同步，CC 配置含 Token 需隔离 |
| 生成器架构 | SectionGenerator + Orchestrator | 每个模块一个生成器，职责清晰 |
| 输出方式 | 单文件合并输出 | 只需 source 一次，加载更快 |
| 备份策略 | 应用前自动备份 | 用户会配合云同步服务使用 |
| 补全模块 | 移除 | 复杂度高，后续单独设计 |
| rc 文件导入 | 暂不做 | 预留接口，手动录入即可 |

---

## 2. 数据模型

### 2.1 ShellConfigData（rcland.config.shell.json）

```typescript
// src/shared/types.ts

type ShellType = 'zsh' | 'bash' | 'powershell'

interface ShellConfigData {
  version: 1

  // 环境变量模块
  variables: ShellVariable[]

  // PATH 模块
  pathEntries: PathEntry[]

  // 函数模块
  functions: ShellFunction[]

  // 别名模块
  aliases: ShellAlias[]

  // 提示符模块
  prompt: PromptConfig

  // 输出配置
  output: OutputConfig
}
```

### 2.2 环境变量

```typescript
interface ShellVariable {
  id: string
  key: string              // 变量名，如 JAVA_HOME
  value: string            // 值，支持 "enc:v1:..." 加密格式
  encrypted: boolean       // 标记是否加密存储
  description?: string
  enabled: boolean
  order: number
  shells?: ShellType[]     // 适用的 shell，空/undefined = 所有
}
```

**加密支持**：复用现有的 AES-256-GCM 加密机制（`enc:v1:` 前缀）。当 `encrypted: true` 时，`value` 字段存储加密后的值，生成 shell 脚本时先解密再写入。

### 2.3 PATH 条目

```typescript
interface PathEntry {
  id: string
  path: string             // 路径，支持变量引用如 $MAVEN_HOME/bin
  description?: string
  enabled: boolean
  order: number
  shells?: ShellType[]     // 适用的 shell
}
```

### 2.4 函数

```typescript
interface ShellFunction {
  id: string
  name: string             // 函数名
  category: string         // 分类：git, fs, network, dev, system, archive, custom
  description?: string

  // 按 shell 类型存储函数体代码
  // 函数体是 shell 代码，不同 shell 语法差异大，必须分别存储
  body: {
    zsh?: string
    bash?: string
    powershell?: string
  }

  enabled: boolean
  order: number
}
```

**为什么 body 按 shell 分？**
- 函数体本身就是 shell 代码，zsh/bash/powershell 语法不可互换
- 环境变量、PATH、别名是「数据」，生成器自动转换语法
- 函数是「代码」，必须用户分别提供

**UI 简化**：zsh 和 bash 大部分简单函数语法兼容，UI 提供「bash/zsh 共用」选项。

### 2.5 别名

```typescript
interface ShellAlias {
  id: string
  alias: string            // 别名
  command: string          // 实际命令
  description?: string
  enabled: boolean
  order: number
  shells?: ShellType[]     // 适用的 shell
}
```

### 2.6 提示符

```typescript
interface PromptConfig {
  type: 'simple' | 'git' | 'custom'

  // simple 模式
  simpleFormat?: string

  // git 模式（包含 git 分支信息）
  gitFormat?: string

  // custom 模式（自定义模板，按 shell 分别存储）
  customTemplate?: {
    zsh?: string
    bash?: string
    powershell?: string
  }
}
```

### 2.7 输出配置

```typescript
interface OutputConfig {
  profiles: {
    [shell in ShellType]?: {
      outputPath: string      // 生成的配置文件路径
      rcPath: string          // RC 文件路径（用于注入 source）
      autoSource: boolean     // 是否自动 source
    }
  }
}
```

### 2.8 Shell 作用域说明

`shells?: ShellType[]` 字段适用于环境变量、PATH、别名：

- `shells` 为空或 `undefined` → 所有 shell 都生效（默认）
- `shells: ['zsh', 'bash']` → 只在 zsh 和 bash 中生效
- 生成器生成特定 shell 配置时，自动过滤不适用的条目
- UI 中默认不展开此选项，仅在用户需要差异化时设置

---

## 3. 生成器架构

### 3.1 架构概览

从「按 shell 类型组织」重构为「按模块 x shell 的双维度组织」：

```
                    zsh              bash             powershell
                 ──────────       ──────────       ──────────────
环境变量          VarZshGen        VarBashGen       VarPSGen
PATH             PathZshGen       PathBashGen      PathPSGen
函数             FuncZshGen       FuncBashGen      FuncPSGen
别名             AliasZshGen      AliasBashGen     AliasPSGen
提示符           PromptZshGen     PromptBashGen    PromptPSGen
CCland           CCZshGen         CCBashGen        CCPSGen
```

每个格子是一个 **SectionGenerator**，只负责生成一个模块在一种 shell 下的脚本片段。由 **ShellOrchestrator** 按顺序组装最终文件。

### 3.2 核心接口

```typescript
// src/main/services/generators/types.ts

/** Section Generator 接口 */
interface SectionGenerator<TData = unknown> {
  readonly sectionName: string     // "variables", "path", "functions", "aliases", "prompt", "ccland"
  readonly shellType: ShellType

  /**
   * 生成该模块在该 shell 下的脚本片段
   * 返回空字符串表示该模块无内容（跳过）
   */
  generate(data: TData, ctx: GenerateContext): string
}

/** 生成上下文 — 提供跨模块共享服务 */
interface GenerateContext {
  shellType: ShellType
  decrypt(value: string): string       // 解密 "enc:v1:..." 值
  escapeValue(value: string): string   // shell-safe 值转义
  timestamp: string                     // 生成时间戳
}
```

### 3.3 Orchestrator

```typescript
// src/main/services/generators/orchestrator.ts

class ShellOrchestrator {
  private sectionRegistry: Map<string, Map<ShellType, SectionGenerator>>

  /**
   * 注册 section generator
   */
  register(generator: SectionGenerator): void

  /**
   * 生成完整的 shell 配置文件
   * 按固定顺序组装：header → variables → path → functions → aliases → prompt → ccland → footer
   */
  generate(
    shellType: ShellType,
    shellConfig: ShellConfigData,
    ccConfig: CCLaunchData,
    ctx: GenerateContext
  ): string
}
```

**生成顺序**（固定，不可调整）：

```
1. Header（shebang、生成时间、警告注释）
2. 环境变量 (variables)
3. PATH 配置 (pathEntries)
4. 函数 (functions)
5. 别名 (aliases)
6. 提示符 (prompt)
7. CCland（Claude Code 配置）
8. Footer（清理临时变量等）
```

### 3.4 值转义策略

```typescript
// src/main/services/generators/context.ts

// zsh/bash: 双引号内转义 $, `, \, ", !
function escapeForBashLike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/!/g, '\\!')
}

// powershell: 单引号包裹，内部单引号用 '' 转义
function escapeForPowerShell(value: string): string {
  return value.replace(/'/g, "''")
}
```

**适用范围**：
- 环境变量值 → 转义
- PATH 条目 → 转义
- 别名的 command → 转义
- 函数 body → **不转义**（本身就是 shell 代码）

### 3.5 目录结构

```
src/main/services/generators/
├── orchestrator.ts                 # ShellOrchestrator 组装器
├── context.ts                      # GenerateContext 实现 + 转义函数
├── types.ts                        # SectionGenerator 接口定义
├── sections/
│   ├── variables/
│   │   ├── zsh.ts
│   │   ├── bash.ts
│   │   └── powershell.ts
│   ├── path/
│   │   ├── zsh.ts
│   │   ├── bash.ts
│   │   └── powershell.ts
│   ├── functions/
│   │   ├── zsh.ts
│   │   ├── bash.ts
│   │   └── powershell.ts
│   ├── aliases/
│   │   ├── zsh.ts
│   │   ├── bash.ts
│   │   └── powershell.ts
│   ├── prompt/
│   │   ├── zsh.ts
│   │   ├── bash.ts
│   │   └── powershell.ts
│   └── ccland/
│       ├── zsh.ts                  # 从现有 generators/zsh.ts 迁移
│       ├── bash.ts                 # 从现有 generators/bash.ts 迁移
│       └── powershell.ts           # 从现有 generators/powershell.ts 迁移
└── legacy/                         # 过渡期保留旧生成器
    ├── base.ts
    ├── index.ts
    ├── zsh.ts
    ├── bash.ts
    └── powershell.ts
```

---

## 4. 预制数据管理

### 4.1 概念

预制数据（Preset）= 应用内置的常用函数、别名、环境变量模板。用户可浏览并一键导入到自己的配置中，导入后成为普通用户数据，可自由编辑。

### 4.2 数据结构

```typescript
// src/shared/presets/types.ts

/** 预制数据条目 */
interface PresetItem {
  id: string                     // 唯一标识，如 "fn:extract", "alias:git-shortcuts"
  type: 'variable' | 'path' | 'function' | 'alias'
  category: string               // 分类
  name: string                   // 显示名
  description: string
  tags?: string[]                // 搜索标签

  // 具体数据（根据 type 不同，取对应字段）
  variable?: Omit<ShellVariable, 'id' | 'order'>
  path?: Omit<PathEntry, 'id' | 'order'>
  function?: Omit<ShellFunction, 'id' | 'order'>
  alias?: Omit<ShellAlias, 'id' | 'order'>
}

/** 预制数据包（一组相关预制项） */
interface PresetPack {
  id: string                     // 如 "git-essentials"
  name: string                   // "Git 常用工具"
  description: string
  items: PresetItem[]
}
```

### 4.3 存储方式

预制数据作为静态资源打包在应用中：

```
src/shared/presets/
├── index.ts                    # 注册表，导出所有 PresetPack
├── types.ts                    # 类型定义
├── functions/
│   ├── git.ts                  # Git 工具函数包
│   ├── filesystem.ts           # 文件系统工具包（extract, mkcd 等）
│   ├── network.ts              # 网络工具包（myip, httpcode 等）
│   └── archive.ts              # 压缩/解压函数包
├── aliases/
│   ├── git.ts                  # Git 别名包（gs, ga, gc, gp 等）
│   ├── common.ts               # 常用别名（ll, la, l 等）
│   └── navigation.ts           # 目录导航别名（.., ..., ~ 等）
└── variables/
    └── common.ts               # 常用环境变量模板（EDITOR, LANG 等）
```

### 4.4 使用流程

1. 每个模块页面提供 **「从预制导入」** 按钮
2. 弹出预制数据浏览面板，按分类和标签筛选
3. 用户选择条目 → 复制到用户配置中，生成新 id，设置默认 order
4. 导入后用户可自由编辑/删除，不影响原始预制数据

### 4.5 版本更新

预制数据随应用版本更新。已导入的数据不受影响（是副本）。

---

## 5. 备份与安全机制

### 5.1 应用前自动备份

```typescript
// src/main/services/backup.ts

interface BackupService {
  /** 应用前备份当前的 shell 配置输出文件 */
  backupBeforeApply(shellType: ShellType, filePath: string): Promise<string>

  /** 获取备份列表 */
  listBackups(shellType: ShellType): Promise<BackupEntry[]>

  /** 从备份恢复 */
  restoreFromBackup(backupId: string): Promise<void>

  /** 清理旧备份（保留最近 N 个） */
  pruneBackups(keepCount: number): Promise<void>
}

interface BackupEntry {
  id: string
  shellType: ShellType
  timestamp: string           // ISO 格式
  filePath: string            // 备份文件路径
  originalPath: string        // 原文件路径
  sizeBytes: number
}
```

**备份存储位置**：

```
{configDir}/backups/
├── zsh/
│   ├── 2026-04-03T21-00-00.zsh.bak
│   └── 2026-04-03T22-30-00.zsh.bak
├── bash/
│   └── ...
└── powershell/
    └── ...
```

**策略**：
- 每次「应用」前自动备份当前输出文件
- 默认保留最近 10 个备份，可在设置中调整
- UI 提供备份列表查看和一键恢复功能

### 5.2 Source 注入机制

复用现有的 marker 注释机制：

```zsh
# >>> CCland >>>
source ~/.ccland/ccland.zsh
# <<< CCland <<<
```

**注入逻辑**：
1. 读取用户的 rc 文件（如 `~/.zshrc`）
2. 查找 `>>> CCland >>>` 和 `<<< CCland <<<` 标记
3. 标记存在 → 替换中间的 source 行
4. 标记不存在 → 追加到文件末尾
5. `autoSource: false` → 移除标记块（如果存在）

### 5.3 冲突检测

```typescript
// src/main/services/conflict-checker.ts

interface ConflictCheckResult {
  warnings: ConflictWarning[]
  errors: ConflictError[]
}

interface ConflictWarning {
  type: 'alias-shadows-command' | 'duplicate-path' | 'unused-variable-ref'
  message: string
  itemIds: string[]
}

interface ConflictError {
  type: 'duplicate-var-key' | 'alias-func-conflict' | 'duplicate-alias'
  message: string
  itemIds: string[]
}
```

**检测规则**：

| 类型 | 级别 | 说明 |
|------|------|------|
| 环境变量 key 重名 | Error | 同一 shell 作用域下不能有重复 key |
| 别名重名 | Error | 同一 shell 作用域下不能有重复 alias |
| 别名与函数名冲突 | Error | 别名和函数不能同名 |
| 别名覆盖系统命令 | Warning | ls, cd, rm, mv, cp 等常见命令 |
| PATH 条目重复 | Warning | 相同路径多次出现 |
| 变量引用未定义 | Warning | PATH 中引用了 $VAR 但该变量未定义 |

**触发时机**：保存时校验，Error 阻止保存，Warning 允许保存但 UI 高亮提示。

### 5.4 数据版本迁移

```typescript
// src/shared/shell-migration.ts

function migrateShellConfig(data: unknown): ShellConfigData {
  let version = (data as any)?.version ?? 0

  if (version < 1) {
    data = migrateShellV0ToV1(data)
  }
  // 未来扩展：
  // if (version < 2) data = migrateShellV1ToV2(data)

  return data as ShellConfigData
}
```

复用现有 `migration.ts` 的模式，Shell 配置有独立的迁移链。

---

## 6. 数据层与 Store

### 6.1 独立的 ShellConfigStore

新建独立的 Zustand store，不扩展现有 `useAppStore`：

```typescript
// src/renderer/src/stores/useShellConfigStore.ts

interface ShellConfigState {
  // 数据
  shellConfig: ShellConfigData | null
  dataLoaded: boolean

  // 加载/保存
  loadShellConfig(): Promise<void>
  saveShellConfig(): Promise<void>

  // 变量 CRUD
  addVariable(variable: ShellVariable): void
  updateVariable(id: string, patch: Partial<ShellVariable>): void
  removeVariable(id: string): void
  reorderVariables(activeId: string, overId: string): void

  // PATH CRUD
  addPathEntry(entry: PathEntry): void
  updatePathEntry(id: string, patch: Partial<PathEntry>): void
  removePathEntry(id: string): void
  reorderPathEntries(activeId: string, overId: string): void

  // 函数 CRUD
  addFunction(fn: ShellFunction): void
  updateFunction(id: string, patch: Partial<ShellFunction>): void
  removeFunction(id: string): void
  reorderFunctions(activeId: string, overId: string): void

  // 别名 CRUD
  addAlias(alias: ShellAlias): void
  updateAlias(id: string, patch: Partial<ShellAlias>): void
  removeAlias(id: string): void
  reorderAliases(activeId: string, overId: string): void

  // 提示符
  updatePrompt(config: PromptConfig): void

  // 输出配置
  updateOutput(config: OutputConfig): void

  // 冲突检测
  checkConflicts(): ConflictCheckResult

  // 预制数据导入
  importPresetItems(items: PresetItem[]): void
}
```

**所有 mutation 自动触发 `saveShellConfig()` 持久化。**

### 6.2 IPC 通道扩展

```typescript
// src/main/ipc.ts 新增通道

// Shell 配置数据
'shell-config:load'                // → ShellConfigData JSON
'shell-config:save'                // ← ShellConfigData JSON

// 备份
'backup:create'                    // (shellType, filePath) → backupId
'backup:list'                      // (shellType) → BackupEntry[]
'backup:restore'                   // (backupId) → void
'backup:prune'                     // (keepCount) → void

// 统一生成（替代现有 shell:generate）
'shell:generateAll'                // (shellType) → string  生成合并后的完整脚本
'shell:applyAll'                   // (shellTypes[]) → { appliedShells, count }
```

### 6.3 Preload API 扩展

```typescript
// src/preload/index.ts 新增方法

interface ElectronAPI {
  // ...existing methods

  // Shell 配置
  loadShellConfig(): Promise<string | null>
  saveShellConfig(json: string): Promise<void>

  // 备份
  createBackup(shellType: ShellType, filePath: string): Promise<string>
  listBackups(shellType: ShellType): Promise<BackupEntry[]>
  restoreBackup(backupId: string): Promise<void>
  pruneBackups(keepCount: number): Promise<void>

  // 统一生成
  generateAllConfig(shellType: ShellType): Promise<string>
  applyAllConfig(shellTypes: ShellType[]): Promise<{ appliedShells: string[]; count: number }>
}
```

---

## 7. UI 架构

### 7.1 侧边栏 + 路由

```
App
├── Sidebar（左侧导航）
│   ├── 📦 环境变量    → /env
│   ├── 🔀 PATH       → /path
│   ├── ⚡ 函数        → /functions
│   ├── 📝 别名        → /aliases
│   ├── 🎨 提示符      → /prompt
│   └── ⚡ CCland      → /ccland（现有 CCConfigPage）
├── Content（右侧路由出口）
└── Footer
    ├── 左：设置按钮
    └── 右：预览 + 应用按钮
```

### 7.2 模块页面组件结构

每个模块页面遵循统一模式：

```
ModulePage
├── Header（标题 + 添加按钮 + 从预制导入按钮）
├── ItemList（支持拖拽排序的条目列表）
│   └── ItemCard（单个条目卡片，含启用/禁用、编辑、删除）
├── FormModal（添加/编辑表单弹窗）
└── PresetBrowser（预制数据浏览面板）
```

### 7.3 生成与应用流程

```
用户点击「应用」
  │
  ├─ 冲突检测
  │   ├─ 有 Error → 弹窗提示，阻止应用
  │   └─ 有 Warning → 弹窗提示，用户确认后继续
  │
  ├─ 对每个启用的 shell：
  │   ├─ 备份当前输出文件
  │   ├─ ShellOrchestrator.generate(shellType, shellConfig, ccConfig, ctx)
  │   ├─ 写入输出文件
  │   └─ 注入/更新 source 行（如果 autoSource）
  │
  ├─ 清理旧备份（超过保留数量的）
  │
  └─ 显示结果（成功/失败、应用了哪些 shell）
```

---

## 8. 文件存储结构

### 8.1 配置目录（可同步）

```
{configDir}/                              # 默认 ~/.ccland/
├── rcland.config.claudecode.json         # CC 配置（现有，含加密 Token）
├── rcland.config.shell.json              # Shell 配置（新增）
├── ccland.zsh                            # 生成的 zsh 配置
├── ccland.sh                             # 生成的 bash 配置
├── ccland.ps1                            # 生成的 PowerShell 配置
└── backups/                              # 备份目录
    ├── zsh/
    │   └── {timestamp}.zsh.bak
    ├── bash/
    │   └── {timestamp}.sh.bak
    └── powershell/
        └── {timestamp}.ps1.bak
```

### 8.2 设备本地（不同步）

```
{userData}/                               # Electron userData
├── settings.json                         # 设备设置（现有）
└── ...

{keyFilePath}/                            # 加密密钥（可配置路径）
└── keyfile.key
```

---

## 9. 生成输出示例

生成的 `~/.ccland/ccland.zsh`：

```zsh
#!/bin/zsh
# ============================================
# CCland Shell Configuration
# Generated: 2026-04-04 10:00:00
# Shell: zsh
# WARNING: This file is auto-generated by CCland.
# Do not edit manually — changes will be overwritten.
# ============================================

# === 环境变量 ===
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"
export MAVEN_HOME="/Library/apache-maven-3.6.3"
export PYTHON_HOME="/Library/Frameworks/Python.framework/Versions/3.13"

# === PATH 配置 ===
export PATH="$MAVEN_HOME/bin:$JAVA_HOME/bin:$HOME/bin:$PATH"

# === 函数 ===

# --- Git ---
gitlog() {
  git log --oneline --graph --decorate --all "$@"
}

gitgraph() {
  git log --graph --oneline --all --decorate "$@"
}

# --- 文件系统 ---
extract() {
  case "$1" in
    *.tar.bz2) tar xjf "$1" ;;
    *.tar.gz)  tar xzf "$1" ;;
    *.bz2)     bunzip2 "$1" ;;
    *.rar)     unrar x "$1" ;;
    *.gz)      gunzip "$1" ;;
    *.tar)     tar xf "$1" ;;
    *.tbz2)    tar xjf "$1" ;;
    *.tgz)     tar xzf "$1" ;;
    *.zip)     unzip "$1" ;;
    *.Z)       uncompress "$1" ;;
    *.7z)      7z x "$1" ;;
    *)         echo "'$1' cannot be extracted via extract()" ;;
  esac
}

# === 别名 ===
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'

# === 提示符 ===
setopt PROMPT_SUBST
PROMPT='%F{green}%n@%m%f:%F{blue}%~%f%F{yellow}$(git branch --show-current 2>/dev/null | sed "s/^/ (/;s/$/)/")%f$ '

# === Claude Code 配置 ===
# >>> CCland CC >>>
claude-opus() {
  ANTHROPIC_AUTH_TOKEN="sk-xxx" \
  ANTHROPIC_BASE_URL="https://api.anthropic.com" \
  claude "$@"
}
# <<< CCland CC <<<
```

---

## 10. 实现计划

### Phase 0: 基础架构（预计 1-2 天）

1. [ ] 定义 ShellConfigData 类型及所有子类型
2. [ ] 实现 shell.json 读写服务（IPC + preload + store）
3. [ ] 实现 shell 配置版本迁移框架
4. [ ] 恢复左侧侧边栏 + 路由结构

### Phase 1: 生成器重构（预计 2-3 天）

1. [ ] 定义 SectionGenerator 接口和 GenerateContext
2. [ ] 实现 ShellOrchestrator
3. [ ] 实现值转义函数（bash-like + PowerShell）
4. [ ] 迁移现有 CC 生成逻辑到 sections/ccland/
5. [ ] 实现 variables section generators（zsh/bash/ps）
6. [ ] 实现 path section generators
7. [ ] 实现 functions section generators
8. [ ] 实现 aliases section generators
9. [ ] 实现 prompt section generators

### Phase 2: 安全与备份（预计 1-2 天）

1. [ ] 实现 BackupService
2. [ ] 实现冲突检测服务
3. [ ] 环境变量加密存储支持
4. [ ] Source 注入逻辑（marker 机制）

### Phase 3: 基础模块 UI（预计 3-4 天）

1. [ ] 环境变量模块页面
2. [ ] PATH 模块页面
3. [ ] 别名模块页面
4. [ ] 通用组件抽取（ItemList、ItemCard、FormModal 模式）

### Phase 4: 高级模块 UI（预计 2-3 天）

1. [ ] 函数模块页面（含代码编辑器、多 shell tab）
2. [ ] 提示符模块页面（含实时预览）

### Phase 5: 预制数据（预计 1-2 天）

1. [ ] 定义预制数据结构和注册表
2. [ ] 编写内置预制数据（Git 工具、常用别名、文件系统工具等）
3. [ ] 预制数据浏览 UI 和导入功能

### Phase 6: 整合与优化（预计 1-2 天）

1. [ ] CCland 模块整合到新架构
2. [ ] 统一的生成/预览/应用流程
3. [ ] 备份管理 UI
4. [ ] 端到端测试
