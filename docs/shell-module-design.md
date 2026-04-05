# Shell 配置管理工具设计方案

## 1. 产品定位

CCland 是一个 **Shell 配置管理工具**，将 Shell 配置拆分为独立的模块，每个模块对应侧边栏的一个入口，用户可以分别配置，最后统一生成一个合并的配置文件，解决多文件 source 导致的启动缓慢问题。

---

## 2. 整体架构

### 2.1 侧边栏模块

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CCland                                      │
├────────┬────────────────────────────────────────────────────────────┤
│        │                                                            │
│  📦     │                                                            │
│  环境变量│   管理环境变量 (JAVA_HOME, MAVEN_HOME 等)                  │
│        │                                                            │
│  🔀     │                                                            │
│  PATH   │   管理 PATH 条目                                           │
│        │                                                            │
│  ⚡     │                                                            │
│  函数   │   管理自定义函数 (Git, 文件系统, 网络等)                     │
│        │                                                            │
│  📝     │                                                            │
│  别名   │   管理命令别名 (ll, la, gs 等)                              │
│        │                                                            │
│  🎨     │                                                            │
│  提示符 │   配置 Shell 提示符样式                                     │
│        │                                                            │
│  ⚙️     │                                                            │
│  补全   │   配置自动补全                                              │
│        │                                                            │
│  ⚡     │                                                            │
│  CCland │   Claude Code 配置 (特殊模块)                               │
│        │                                                            │
├────────┴────────────────────────────────────────────────────────────┤
│  [⚙ 设置]                                    [预览] [应用]          │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块定义

| 图标 | 路由 | 模块名称 | 说明 | 数据存储 |
|------|------|----------|------|----------|
| 📦 | `/env` | 环境变量 | SDK 路径、应用配置等 | `variables[]` |
| 🔀 | `/path` | PATH | PATH 条目管理 | `pathEntries[]` |
| ⚡ | `/functions` | 函数 | 自定义函数（可分类） | `functions[]` |
| 📝 | `/aliases` | 别名 | 命令别名 | `aliases[]` |
| 🎨 | `/prompt` | 提示符 | PS1/PS2 配置 | `prompt` |
| ⚙️ | `/completion` | 补全 | 补全配置 | `completion` |
| ⚡ | `/ccland` | CCland | Claude Code CLI 配置 | `providers[]`, `configs[]` |

### 2.3 数据结构

```typescript
// src/shared/types.ts

/** Shell 配置数据 (存储在 rcland.config.shell.json) */
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
  
  // 补全模块
  completion: CompletionConfig
  
  // 输出配置
  output: OutputConfig
}

/** 环境变量 */
interface ShellVariable {
  id: string
  key: string           // 变量名，如 JAVA_HOME
  value: string         // 变量值
  description?: string  // 描述
  enabled: boolean      // 是否启用
  order: number         // 排序
}

/** PATH 条目 */
interface PathEntry {
  id: string
  path: string          // 路径，支持变量如 $MAVEN_HOME/bin
  description?: string
  enabled: boolean
  order: number
}

/** Shell 函数 */
interface ShellFunction {
  id: string
  name: string          // 函数名
  category: string      // 分类：git, fs, network, dev, system, archive, custom
  description?: string
  
  // 多 shell 模板
  body: {
    zsh?: string
    bash?: string
    fish?: string
    powershell?: string
  }
  
  enabled: boolean
  order: number
}

/** 命令别名 */
interface ShellAlias {
  id: string
  alias: string         // 别名
  command: string       // 实际命令
  description?: string
  enabled: boolean
  order: number
}

/** 提示符配置 */
interface PromptConfig {
  type: 'simple' | 'git' | 'custom'
  
  // simple 模式
  simpleFormat?: string
  
  // git 模式（包含 git 分支信息）
  gitFormat?: string
  
  // custom 模式（自定义模板）
  customTemplate?: {
    zsh?: string
    bash?: string
    fish?: string
  }
}

/** 补全配置 */
interface CompletionConfig {
  enabled: boolean
  // zsh 补全配置
  zsh?: {
    compinit: boolean
    fpath: string[]
  }
  // bash 补全配置
  bash?: {
    // ...
  }
}

/** 输出配置 */
interface OutputConfig {
  shellType: 'zsh' | 'bash' | 'fish' | 'powershell'
  
  // 各 shell 的输出配置
  profiles: {
    [shell: string]: {
      outputPath: string     // 生成的配置文件路径
      rcPath: string         // RC 文件路径
      autoSource: boolean    // 是否自动 source
    }
  }
}
```

---

## 3. 各模块详细设计

### 3.1 环境变量模块 (`/env`)

**页面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  环境变量                                          [+ 添加变量]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1  ☑  JAVA_HOME                                           │  │
│  │       /Library/Java/JavaVirtualMachines/jdk-21.jdk/...    │  │
│  │       Java 21 SDK 路径                        [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2  ☑  MAVEN_HOME                                          │  │
│  │       /Library/apache-maven-3.6.3                         │  │
│  │       Maven 安装路径                          [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ... 支持拖拽排序 ...                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**生成内容示例：**
```zsh
# === 环境变量 ===
export JAVA_HOME="/Library/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home"
export MAVEN_HOME="/Library/apache-maven-3.6.3"
```

---

### 3.2 PATH 模块 (`/path`)

**页面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  PATH 配置                                          [+ 添加]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  提示：路径支持变量引用，如 $MAVEN_HOME/bin                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1  ☑  $MAVEN_HOME/bin                                     │  │
│  │       Maven 命令路径                           [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2  ☑  $JAVA_HOME/bin                                      │  │
│  │       Java 命令路径                           [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 3  ☑  ~/bin                                               │  │
│  │       用户自定义脚本                          [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**生成内容示例：**
```zsh
# === PATH 配置 ===
export PATH="$MAVEN_HOME/bin:$JAVA_HOME/bin:$HOME/bin:$PATH"
```

---

### 3.3 函数模块 (`/functions`)

**页面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  函数管理                            [+ 添加] [导入] [导出]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  分类筛选: [全部 ▼] [Git] [文件系统] [网络] [开发] [系统] [自定义]│
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1  ☑  📂 文件系统                                         │  │
│  │       extract - 智能解压（支持多种格式）        [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2  ☑  🔀 Git                                              │  │
│  │       gitlog - 美化的 git 日志                 [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 3  ☑  🔀 Git                                              │  │
│  │       gitgraph - 分支图                        [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**函数编辑弹窗：**
```
┌─────────────────────────────────────────────────────────────────┐
│  编辑函数                                                 [×]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  函数名:   [gitlog___________________________________]          │
│  分类:     [Git ▼]                                              │
│  描述:     [美化的 git 日志_________________________]           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ zsh / bash:                                   [语法高亮]   ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ gitlog() {                                                  ││
│  │   git log --oneline --graph --decorate --all "$@"           ││
│  │ }                                                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ fish: (可选)                                               ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ function gitlog                                             ││
│  │   git log --oneline --graph --decorate --all $argv          ││
│  │ end                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                          [取消]              [保存]              │
└─────────────────────────────────────────────────────────────────┘
```

**生成内容示例：**
```zsh
# === 函数 ===

# --- 文件系统 ---
extract() {
  case "$1" in
    *.tar.bz2) tar xjf "$1" ;;
    *.tar.gz)  tar xzf "$1" ;;
    # ...
  esac
}

# --- Git ---
gitlog() {
  git log --oneline --graph --decorate --all "$@"
}

gitgraph() {
  git log --graph --oneline --all --decorate "$@"
}
```

---

### 3.4 别名模块 (`/aliases`)

**页面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  命令别名                                          [+ 添加]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 1  ☑  ll      →  ls -alF                      [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 2  ☑  la      →  ls -A                       [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 3  ☑  gs      →  git status                  [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 4  ☑  gp      →  git push                    [编辑] [删除]│  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**生成内容示例：**
```zsh
# === 别名 ===
alias ll='ls -alF'
alias la='ls -A'
alias gs='git status'
alias gp='git push'
```

---

### 3.5 提示符模块 (`/prompt`)

**页面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  提示符配置                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  提示符类型:                                                     │
│  ○ 简洁模式                                                     │
│  ● Git 模式（推荐）- 包含 git 分支信息                           │
│  ○ 自定义                                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 预览:                                                       ││
│  │ user@host:~/project (main) $                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  颜色配置:                                                       │
│  用户名: [🟢 绿色 ▼]   主机名: [🟢 绿色 ▼]   路径: [🔵 蓝色 ▼]   │
│  Git 分支: [🟡 黄色 ▼]                                         │
│                                                                 │
│  高级选项:                                                       │
│  ☑ 显示时间  ☑ 显示退出码（非零时）                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.6 CCland 模块 (`/ccland`)

**这是现有的 Claude Code 配置模块**，作为 Shell 配置的一个特殊模块，生成的函数会包含在最终配置文件中。

**生成内容示例：**
```zsh
# === Claude Code 配置 ===

# --- claude-opus ---
claude-opus() {
  ANTHROPIC_AUTH_TOKEN="sk-xxx" \
  ANTHROPIC_BASE_URL="https://api.anthropic.com" \
  claude "$@"
}
```

---

## 4. 生成流程

### 4.1 生成顺序

```
┌─────────────────────────────────────────────────────────────┐
│  1. Header（shebang、注释头）                                │
├─────────────────────────────────────────────────────────────┤
│  2. 环境变量 (variables)                                    │
│     export JAVA_HOME="..."                                  │
├─────────────────────────────────────────────────────────────┤
│  3. PATH 配置 (pathEntries)                                 │
│     export PATH="..."                                       │
├─────────────────────────────────────────────────────────────┤
│  4. 函数 (functions)                                        │
│     func1() { ... }                                         │
│     func2() { ... }                                         │
├─────────────────────────────────────────────────────────────┤
│  5. 别名 (aliases)                                          │
│     alias ll='ls -alF'                                      │
├─────────────────────────────────────────────────────────────┤
│  6. 补全 (completion)                                       │
│     autoload -Uz compinit && compinit                       │
├─────────────────────────────────────────────────────────────┤
│  7. 提示符 (prompt)                                         │
│     PROMPT='...'                                            │
├─────────────────────────────────────────────────────────────┤
│  8. CCland (Claude Code 配置)                               │
│     claude-opus() { ... }                                   │
├─────────────────────────────────────────────────────────────┤
│  9. Footer（清理临时变量等）                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 生成器架构

```typescript
// src/main/services/generators/shell-config/

interface ShellConfigGenerator {
  shellType: ShellType
  
  // 生成各部分
  generateHeader(): string
  generateVariables(vars: ShellVariable[]): string
  generatePath(entries: PathEntry[]): string
  generateFunctions(funcs: ShellFunction[]): string
  generateAliases(aliases: ShellAlias[]): string
  generateCompletion(config: CompletionConfig): string
  generatePrompt(config: PromptConfig): string
  generateCCland(data: CCLaunchData): string  // 复用现有逻辑
  generateFooter(): string
  
  // 主生成方法
  generate(data: ShellConfigData, ccData: CCLaunchData): string
}
```

---

## 5. 数据存储

### 5.1 文件结构

```
{configDir}/
├── rcland.config.claudecode.json   # Claude Code 配置（现有）
├── rcland.config.shell.json        # Shell 配置（新增）
└── .key                             # 加密密钥
```

### 5.2 分离原因

- **Shell 配置** (`shell.json`): 可同步到 iCloud/Git，机器无关
- **CCland 配置** (`claudecode.json`): 包含敏感 Token，可选同步

---

## 6. 实现步骤

### Phase 0: 侧边栏架构 (1天)
1. [ ] 恢复左侧侧边栏
2. [ ] 实现模块化菜单（环境变量、PATH、函数、别名、提示符、CCland）
3. [ ] 调整路由结构

### Phase 1: 数据模型 (1天)
1. [ ] 定义 ShellConfigData 类型
2. [ ] 实现 shell.json 读写
3. [ ] 迁移现有 zsh 框架脚本为初始数据

### Phase 2: 基础模块 UI (3天)
1. [ ] 环境变量模块页面
2. [ ] PATH 模块页面
3. [ ] 别名模块页面

### Phase 3: 高级模块 UI (3天)
1. [ ] 函数模块页面（含编辑器）
2. [ ] 提示符模块页面
3. [ ] 补全模块页面

### Phase 4: 生成器 (2天)
1. [ ] 实现 ShellConfigGenerator
2. [ ] 预览功能
3. [ ] 应用功能

### Phase 5: 整合优化 (1-2天)
1. [ ] CCland 模块整合
2. [ ] 测试和优化

---

## 7. 示例输出

生成的 `~/.ccland/shell/zshrc`:

```zsh
#!/bin/zsh
# ============================================
# CCland Shell Configuration
# Generated: 2026-04-03 21:00:00
# Shell: zsh
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

# === 补全 ===
autoload -Uz compinit && compinit

# === 提示符 ===
setopt PROMPT_SUBST
PROMPT='%F{green}%n@%m%f:%F{blue}%~%f%F{yellow}$(git branch --show-current 2>/dev/null | sed "s/^/ (/;s/$/)/")%f$ '

# === Claude Code 配置 ===
# >>> CCland >>>
claude-opus() {
  ANTHROPIC_AUTH_TOKEN="sk-xxx" \
  ANTHROPIC_BASE_URL="https://api.anthropic.com" \
  claude "$@"
}
# <<< CCland <<<

# 清理临时变量
# (如有)
```

---

## 8. 扩展性

### 8.1 内置函数库
- 预置常用函数（从 lmrc/zsh 迁移）
- 用户可导入/修改

### 8.2 模块扩展
- 未来可添加更多模块：`exports`（自动导出）、`hooks`（钩子函数）等
- 支持自定义模块

### 8.3 配置同步
- Shell 配置可跨机器同步
- 变量值可机器特定
