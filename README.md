# RCLand

[中文文档](README.zh-CN.md)

A desktop application for managing [Claude Code](https://claude.ai/code) CLI and [Codex](https://github.com/openai/codex) CLI shell configurations. Manage multiple API providers, encrypted API keys, environment variables, PATH entries, shell functions, aliases, and system proxy — all from a single GUI with multi-shell support.

![Overview](docs/images/overview.png)

## Features

- **Multi-Shell Support** — Zsh, Bash, and PowerShell with automatic OS detection
- **CC Launch Configs** — Create named launch configurations for Claude Code with different API providers and models, each generating a dedicated shell function (e.g., `cc-sonnet`, `cc-opus`)
- **CX Launch Configs** — Same workflow for Codex CLI, supporting both OpenAI official and third-party compatible APIs
- **Interactive Selector** — Optional `cc` / `ccl` shell functions that present an interactive terminal menu to pick from your launch configs
- **Claude Env Dictionary** — Built-in catalog of 13 Claude Code environment variables with descriptions, categories, and per-provider defaults
- **Variable References** — Use `{{VAR_NAME}}` syntax to reference variables across env vars, PATH entries, and path variables with automatic topological sorting and circular reference detection
- **Path Variables** — Define reusable path variables (e.g., `JAVA_HOME`) that resolve at generation time without exporting as shell variables
- **System Proxy** — Read OS-level proxy settings and generate shell functions to toggle proxy on/off
- **Encrypted Key Storage** — API keys encrypted with AES-256-GCM + PBKDF2; decrypted only at config generation time
- **Environment Variables** — Manage shell environment variables with per-shell targeting, encryption, and drag-to-reorder
- **PATH Management** — Add, reorder, and toggle PATH entries with descriptions and variable references
- **Shell Functions** — Define multi-shell functions with per-shell body variants; includes built-in utilities (`pathls`, `check-env-exists`, `prompt-select`)
- **Shell Aliases** — Quick command aliases with per-shell targeting and descriptions
- **Preset System** — Built-in preset packs for common aliases, Git shortcuts, and SDK paths
- **Internationalization** — English and Simplified Chinese UI with language switcher
- **Conflict Detection** — Warnings for duplicate variables, alias-function conflicts, undefined references, and shadowed system commands
- **Backup & Restore** — Automatic shell config backups before each apply (up to 10 per shell)
- **Cloud Sync Friendly** — Local-only flag on any item to exclude from cloud sync
- **Live Preview** — Preview generated shell scripts before applying

## Installation

### Pre-built Binaries

<!-- TODO: Add download links when releases are published -->

Download the latest release for your platform:

| Platform | Format |
|----------|--------|
| macOS | `.zip` |
| Windows | `.exe` (NSIS installer) |
| Linux | `.AppImage` / `.deb` |

### Build from Source

Prerequisites: Node.js 18+, npm 9+

```bash
git clone https://github.com/laomst/ccland.git
cd ccland
npm install
npm run dist    # Build platform installer
```

## Quick Start

### 1. Launch RCLand

Open the application. The sidebar contains seven modules:

<!-- 📸 Screenshot: sidebar navigation -->
![Sidebar](docs/images/sidebar.png)

| Module | Description |
|--------|-------------|
| **System Proxy** | Read and manage OS proxy settings |
| **Env** | Environment variables |
| **PATH** | PATH entries and path variables |
| **Functions** | Shell functions |
| **Aliases** | Shell aliases |
| **CCLand** | Claude Code launch configurations |
| **CXLand** | Codex launch configurations |

### 2. Configure Shell Profiles

Click the **gear icon** at the bottom of the sidebar to open Settings:

<!-- 📸 Screenshot: settings modal -->
![Settings](docs/images/settings.png)

- Enable the shells you use (Zsh/Bash on macOS/Linux, PowerShell on Windows)
- Set your encryption key file path (for API key encryption)
- Choose your preferred language (English / 简体中文)
- Choose your default landing page

### 3. Set Up a Provider (CC Launch)

Navigate to **CCLand** → **Providers** tab:

<!-- 📸 Screenshot: CC provider form -->
![CC Provider](docs/images/cc-provider.png)

1. Click **Add Provider**
2. Enter a name (e.g., "Anthropic", "OpenRouter", "GLM")
3. Add one or more **Endpoints** (API base URLs)
4. Add one or more **API Keys** (encrypted automatically)
5. Optionally configure a **Template** with default environment variables for new configs
6. Optionally set a **Kanban URL** (usage dashboard link)

### 4. Create a Launch Config

Switch to the **Configs** tab:

<!-- 📸 Screenshot: CC config form -->
![CC Config](docs/images/cc-config.png)

1. Click **Add Config**
2. Select a provider, endpoint, and API key
3. Set a **function name** (becomes a shell function, e.g., `cc-sonnet`)
4. Configure Claude-specific env vars (or use the **Env Dictionary** for built-in variables)
5. Optionally enable **Passthrough mode** (runs `claude` directly without provider credentials)
6. Save

### 5. Enable the Selector (Optional)

Switch to the **Selector** tab to configure interactive menu functions:

<!-- 📸 Screenshot: selector configuration -->
![Selector](docs/images/selector.png)

| Function | Description |
|----------|-------------|
| `cc` | Interactive selector for synced configs |
| `ccd` | Shorthand for `cc --dangerously-skip-permissions` |
| `ccl` | Interactive selector for local-only configs |
| `ccld` | Shorthand for `ccl --dangerously-skip-permissions` |

### 6. Preview & Apply

Use the bottom action bar:

1. Click a shell name button (e.g., **Zsh**) to preview the generated script
2. Click **Apply** to write configs to your shell profiles

<!-- 📸 Screenshot: preview modal -->
![Preview](docs/images/preview.png)

RCLand writes to `~/.rcland/{shell}rc` and injects a `source` line into your shell profile (e.g., `~/.zshrc`):

```bash
# >>> RCLand >>>
source ~/.rcland/zshrc
# <<< RCLand <<<
```

Restart your terminal or run `source ~/.zshrc` to activate.

## Module Guide

### System Proxy

<!-- 📸 Screenshot: system proxy page -->
![System Proxy](docs/images/system-proxy.png)

Reads OS-level proxy settings (macOS: `scutil --proxy`, Windows: Registry, Linux: `gsettings`) and displays HTTP/HTTPS/SOCKS/NO_PROXY values. Generates three configurable shell functions:

| Function | Default Name | Description |
|----------|-------------|-------------|
| Proxy on | `proxy-on` | Export proxy environment variables |
| Proxy off | `proxy-off` | Unset proxy environment variables |
| Proxy status | `proxy-status` | Show current proxy settings |

### Environment Variables

<!-- 📸 Screenshot: env var page -->
![Env Variables](docs/images/env-vars.png)

Manage shell environment variables:

- Per-shell targeting (Zsh, Bash, PowerShell)
- Enable/disable toggle
- Optional encryption for sensitive values
- Local-only flag (excluded from cloud sync)
- `{{VAR}}` references to other variables (resolved at generation time)
- Drag-to-reorder
- Items grouped into **Synced** and **Local** collapsible sections

### PATH Management

<!-- 📸 Screenshot: PATH page -->
![PATH Page](docs/images/path-page.png)

Two sub-tabs:

**PATH Entries** — Add directories to `$env:PATH`:
- Description field for documentation
- Per-shell targeting and enable/disable toggle
- Drag-to-reorder (order determines PATH priority)
- `{{VAR}}` references from Path Variables
- Local-only flag

**Path Variables** — Define reusable path variables:

<!-- 📸 Screenshot: path variables tab -->
![Path Variables](docs/images/path-variables.png)

- Define variables like `JAVA_HOME=/usr/lib/jvm/java-17` that resolve at generation time
- Not exported as shell variables (only used for `{{VAR}}` expansion)
- Supports inter-references with topological sorting and circular reference detection
- Local-only flag

### Shell Functions

<!-- 📸 Screenshot: functions page -->
![Functions](docs/images/functions.png)

Define custom shell functions:

- Per-shell body variants (write Zsh, Bash, and PowerShell versions of the same function)
- Automatic function name extraction from the code body
- Category grouping (e.g., `custom`, `builtin`)
- Built-in read-only functions:
  - `set_main_task_name` — Set terminal tab/window title (iTerm2 OSC 1337 or standard OSC 0)
  - `pathls` — Display PATH entries; `-i` flag shows RCLand-managed paths vs full PATH
  - `check-env-exists` — Verify required env vars are set; prints missing ones
  - `prompt-select` — Interactive terminal menu with arrow keys and number shortcuts

### Shell Aliases

<!-- 📸 Screenshot: aliases page -->
![Aliases](docs/images/aliases.png)

Create command aliases:

- Simple `alias name='command'` definitions
- Per-shell targeting
- Description field
- Enable/disable toggle, local-only flag, drag-to-reorder

### CC Launch

The core feature — manage multiple Claude Code CLI configurations with four sub-tabs:

**Providers** define API services:
- Name and color tag
- Multiple endpoints (API base URLs, with optional system proxy per endpoint)
- Multiple API keys (encrypted)
- Template with default env vars for new configs
- Kanban URL for usage dashboard

**Configs** combine provider + endpoint + key + env vars into a launch function:

```bash
# Example generated function (Zsh/Bash)
cc-sonnet() {
  ANTHROPIC_AUTH_TOKEN="sk-..."
  ANTHROPIC_BASE_URL="https://api.anthropic.com"
  ANTHROPIC_MODEL="claude-sonnet-4-20250514"
  claude "$@"
}
```

```powershell
# Example generated function (PowerShell)
function cc-sonnet {
  $env:ANTHROPIC_AUTH_TOKEN = "sk-..."
  $env:ANTHROPIC_BASE_URL = "https://api.anthropic.com"
  $env:ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
  claude @args
}
```

Supports **Passthrough mode** — runs `claude` directly without injecting provider credentials, useful for configs that only set model preferences.

**Env Dictionary** — A curated catalog of Claude Code environment variables:

<!-- 📸 Screenshot: env dictionary page -->
![Env Dictionary](docs/images/env-dict.png)

- 13 built-in entries across categories: `model`, `thinking`, `request`, `privacy`, `cache`
- Users can add custom entries
- Each entry has a `defaultInTemplate` toggle (auto-fills when creating new providers)
- Built-in entries are read-only but their `defaultInTemplate` can be overridden

Notable built-in variables: `ANTHROPIC_MODEL`, `MAX_THINKING_TOKENS`, `CLAUDE_CODE_DISABLE_THINKING`, `CLAUDE_CODE_EFFORT_LEVEL`, `API_TIMEOUT_MS`, `ANTHROPIC_BETAS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_PROMPT_CACHING`

**Selector** — Configure interactive menu functions (see Quick Start step 5).

### CX Launch

<!-- 📸 Screenshot: CX provider form -->
![CX Provider](docs/images/cx-provider.png)

<!-- 📸 Screenshot: CX config form -->
![CX Config](docs/images/cx-config.png)

Same workflow as CC Launch but for [Codex CLI](https://github.com/openai/codex). Key differences:

- Generates functions that pass config via `-c key="value"` TOML-style arguments
- Supports two `wireApi` modes:
  - `responses` — OpenAI official API
  - `chat` — Third-party compatible (e.g., using OpenAI-compatible endpoints)
- Three sub-tabs: **Configs**, **Providers**, **Selector**

```bash
# Example generated function (Zsh/Bash)
cx-gpt4o() {
  codex -c "api_key=sk-..." -c "api_base=https://api.openai.com/v1" \
        -c "model=gpt-4o" "$@"
}
```

## Variable References

<!-- 📸 Screenshot: variable reference syntax hints -->
![Variable Reference Syntax](docs/images/var-ref-syntax.png)

RCLand supports `{{VAR_NAME}}` syntax in environment variable values and PATH entries:

- **Topological sorting** — Variables are generated in dependency order
- **Circular reference detection** — Warns if variables form a cycle
- **Delete protection** — Prevents deleting a variable that is referenced by others
- **Visual tags** — References are rendered as clickable tags in the UI with syntax hints
- **Cross-module** — Env vars can reference Path Variables and vice versa

## Presets

Built-in preset packs for quick setup:

| Preset | Contents |
|--------|----------|
| **Common Aliases** | `ls` variants, navigation shortcuts, Python helpers |
| **Git Aliases** | `gst`, `gco`, `gbr`, `glg`, etc. |
| **SDK Variables** | Java `JAVA_HOME`, Maven `MAVEN_HOME`, Python paths |

Import presets via the **Import** button on each module page.

## Encryption

RCLand uses **AES-256-GCM** encryption for sensitive data (API keys/tokens):

- Key derived via **PBKDF2** (SHA-256, 100,000 iterations, 16-byte random salt)
- Encrypted values stored as `enc:v1:{base64}` (salt + IV + auth tag + ciphertext)
- Decryption happens on-demand during config generation
- **Temporary key mode** — Use a one-time passphrase for a single apply operation
- Full **re-encryption** support when changing keys

**First-time setup:** When you click Apply for the first time, RCLand will prompt you to initialize an encryption key.

## Conflict Detection

RCLand checks for six types of conflicts before applying:

| Severity | Check |
|----------|-------|
| Error | Duplicate environment variable keys |
| Error | Duplicate alias names |
| Error | Alias-function name conflicts |
| Warning | Aliases shadowing system commands (ls, cd, rm, mv, cp, etc.) |
| Warning | Duplicate PATH entries |
| Warning | Undefined `{{VAR}}` references |

## Data Storage

| File | Content | Syncable |
|------|---------|----------|
| `rcland.config.claudecode.json` | CC Launch providers, configs, selector | Yes |
| `rcland.config.codex.json` | CX Launch providers, configs, selector | Yes |
| `rcland.config.shell.json` | Variables, PATH, functions, aliases | Yes |
| `rcland.claude-env-dict.json` | Claude Env Dictionary (user items + overrides) | Yes |
| `local/` subdirectory | Local-only data for each config type | No |
| `backups/` subdirectory | Shell config backups (up to 10 per shell) | No |
| Electron `userData` | App settings (window state, key path, language) | No |
| `~/.rcland/` | Generated shell scripts (`zshrc`, `bashrc`, `powershellrc.ps1`) | No |

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server (Electron + Vite HMR)
npm run build     # Compile TypeScript and bundle
npm run preview   # Preview built app
npm run pack      # Package as directory (unsigned)
npm run dist      # Build platform installer
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 35 |
| UI | React 19 + Ant Design 5 |
| Language | TypeScript 5.8 |
| State | Zustand 5 |
| Drag & Drop | @dnd-kit |
| i18n | i18next + react-i18next |
| Build | electron-vite 3 |
| Package | electron-builder 25 |

### Architecture

```
┌─────────────────────────────────────────────┐
│                  Renderer                    │
│   React 19 + Ant Design + Zustand Stores    │
│   (src/renderer/src/)                        │
├─────────────────────────────────────────────┤
│              Preload (Context Bridge)        │
│   Type-safe IPC bridge → window.electronAPI  │
│   (src/preload/)                             │
├─────────────────────────────────────────────┤
│                    Main                      │
│   App lifecycle, File I/O, Crypto, Shell     │
│   generators (Zsh/Bash/PowerShell)           │
│   (src/main/)                                │
└─────────────────────────────────────────────┘
```

### Testing

Tests use Node.js built-in test runner with esbuild bundling:

```bash
npm test          # Run all tests
```

17 test files covering: Claude env dict, config updates, CX builders, crypto, generator escaping, IPC contracts, local config, sync logic, OS proxy reader, shell apply, and system proxy generation.

## License

<!-- TODO: Add license information -->
