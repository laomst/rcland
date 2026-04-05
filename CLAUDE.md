# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RCLand (Run Configuration Land) is an Electron desktop app for managing shell runtime configurations. It manages environment variables, PATH entries, shell functions, aliases, and Claude Code launch configurations (Providers, ConfigSets with tokens and env vars), generating shell config files for zsh/bash/PowerShell.

## Build & Dev Commands

```bash
npm run dev       # Start dev server with hot reload (electron-vite dev)
npm run build     # Build all (main + preload + renderer) to out/
npm run preview   # Preview production build
npm run pack      # Package without installer (electron-builder --dir)
npm run dist      # Build distributable (dmg/zip/nsis/AppImage/deb)
```

No test framework is configured yet.

## Architecture

### Three-Process Electron Structure

- **Main process** (`src/main/`): Node.js backend — IPC handlers, file I/O, crypto, shell config generation
- **Preload** (`src/preload/index.ts`): `contextBridge` exposing `window.electronAPI` with typed IPC methods
- **Renderer** (`src/renderer/`): React 19 + Ant Design 5 + Zustand — the full UI

### Data Flow

```
Renderer (React/Zustand)
  → window.electronAPI.* (IPC calls)
    → Main process handlers (src/main/ipc.ts)
      → Services (config.ts, crypto.ts, generators/*)
        → File system (data.json, settings.json, key file, shell profiles)
```

All data CRUD goes through Zustand store → `electronAPI` IPC → main process services. The store calls `saveData()` after every mutation.

### Path Aliases

- `@shared/*` → `src/shared/*` (available in all three processes)
- `@renderer/*` → `src/renderer/src/*` (renderer only)

### Data Model (v3)

Stored in `{configDir}/data.json`. Key types in `src/shared/types.ts`:

- **`CCLaunchData`**: Top-level container with `providers[]`, `configs[]`, and `selector`
- **`Provider`**: API supplier (name, baseUrl, color, optional template)
- **`ConfigSet`**: Launch config with `providerId` foreign key, `funcName`, `token`, `envVars`
- **`AppSettings`**: Per-device settings in Electron `userData` — `configDir`, `keyFilePath`, `shellProfiles`

v2→v3 migration is in `src/shared/migration.ts` — providers and configs were separated from nested to flat structure.

### Shell Generator System (Strategy Pattern)

`src/main/services/generators/`:

- `base.ts` — `ShellGenerator` interface + `BaseShellGenerator` abstract class
- `index.ts` — Registry with `getGenerator(shellType)` factory
- `zsh.ts`, `bash.ts`, `powershell.ts`, `fish.ts` — Per-shell implementations

Each generator converts `CCLaunchData` + decrypted values into shell-specific config file content.

### Encryption

AES-256-GCM via `src/main/services/crypto.ts`. Encrypted values prefixed with `enc:v1:`. Key file path stored in settings (not in sync directory). Encryption/decryption happens in main process only.

### Renderer Structure

- `src/renderer/src/App.tsx` — Root layout with sidebar nav, content area, footer action bar, settings modal
- `src/renderer/src/stores/useAppStore.ts` — Single Zustand store for all state + CRUD actions
- `src/renderer/src/modules/cc-launch/` — Main feature module:
  - `pages/CCConfigPage.tsx` — Tab layout (ConfigTab + ProviderTab)
  - `components/` — ProviderCard, ConfigCard, ProviderTab, ConfigTab, ProviderFormModal, ConfigFormModal, TokenEditModal, EnvVarEditor

### IPC Channels

Defined in `src/main/ipc.ts`, exposed via `src/preload/index.ts`:

| Channel | Purpose |
|---------|---------|
| `config:getDir/setDir` | Config directory management |
| `data:load/save` | Read/write data.json |
| `settings:load/save` | Read/write settings.json |
| `crypto:initKey/encrypt/decrypt` | Key management and AES operations |
| `shell:detect/generate/apply` | Shell detection, preview, and file writing |
| `dialog:open/save` | Native file dialogs |
