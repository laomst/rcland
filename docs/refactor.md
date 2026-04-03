# 重构设计：Provider 与 ConfigSet 拆分

## 1. 背景

原有数据模型中 `Provider` 内嵌 `configs: ConfigSet[]`，供应商和配置是嵌套的父子关系。这导致：

- UI 中必须先选定供应商才能操作配置项
- 配置项无法自由切换所属供应商
- Store 中 Config CRUD 需要同时传递 `providerId` + `configId`
- 删除供应商时需要递归处理嵌套数组

## 2. 目标

将供应商管理和配置管理拆分为两个独立模块：

1. Provider 独立管理，不包含 configs 数组
2. ConfigSet 独立管理，通过 `providerId` 外键关联 Provider
3. 添加配置时选择供应商，已有配置可切换供应商
4. UI 使用双 Tab 布局（供应商管理 / 配置管理）

## 3. 新数据模型

### 3.1 类型定义 (`src/shared/types.ts`)

```typescript
// CCLaunchData (v3)
interface CCLaunchData {
  version: 3
  providers: Provider[]       // Provider 不再包含 configs
  configs: ConfigSet[]        // ConfigSet 顶层平铺
  selector: { enabled, funcName, promptTitle }
}

// Provider — 移除 configs 字段
interface Provider {
  id: string
  name: string
  enabled: boolean
  baseUrl: string
  color?: string
}

// ConfigSet — 新增 providerId 外键
interface ConfigSet {
  id: string
  providerId: string          // 外键关联 Provider
  funcName: string
  description: string
  enabled: boolean
  token: string
  tokenComment: string
  envVars: EnvVarsMap
}
```

### 3.2 数据迁移

v2 → v3 自动迁移在主进程 `loadData()` 中完成：

```typescript
// src/shared/migration.ts
function migrateV2ToV3(data: CCLaunchDataV2): CCLaunchData {
  const providers = data.providers.map(({ configs: _, ...fields }) => fields)
  const configs = data.providers.flatMap((p) =>
    p.configs.map((c) => ({ ...c, providerId: p.id }))
  )
  return { version: 3, providers, configs, selector: data.selector }
}
```

## 4. UI 结构

### 4.1 整体布局

主页面使用 Ant Design `Tabs` 组件，双 Tab：

- **Tab 1 — 供应商管理**：Provider 独立列表（添加/编辑/删除/启禁用）
- **Tab 2 — 配置管理**：ConfigSet 列表，每条配置带 Provider Select 可切换

### 4.2 组件拆分

```
components/
  ProviderTab.tsx          供应商管理 Tab
  ProviderCard.tsx         供应商卡片（名称、URL、关联配置数、操作按钮）
  ProviderFormModal.tsx    供应商新建/编辑弹窗
  ConfigTab.tsx            配置管理 Tab
  ConfigCard.tsx           配置卡片（含 Provider 选择器）
  ConfigFormModal.tsx      配置新建/编辑弹窗（含 Provider Select）
  EnvVarEditor.tsx         环境变量编辑器（可复用）
  TokenEditModal.tsx       Token 明文编辑弹窗（可复用）
pages/
  CCConfigPage.tsx         主页面 Tabs 壳
```

### 4.3 ConfigCard 核心交互

配置卡片左侧使用 Ant Design `Select` 组件显示所属供应商（带颜色标记），切换时直接调用 `updateConfig(configId, { providerId: newId })`。

## 5. Store 改造 (`src/renderer/src/stores/useAppStore.ts`)

### 状态结构

```typescript
interface AppState {
  providers: Provider[]
  configs: ConfigSet[]           // 新增：独立数组
  dataLoaded: boolean
  settings: AppSettings | null
  // ...
}
```

### CRUD 方法变化

| 旧方法 | 新方法 | 变化 |
|--------|--------|------|
| `addConfig(providerId, config, insertAt)` | `addConfig(config)` | 移除 providerId 和 insertAt |
| `updateConfig(providerId, configId, patch)` | `updateConfig(configId, patch)` | 移除 providerId |
| `removeConfig(providerId, configId)` | `removeConfig(configId)` | 移除 providerId |
| `removeProvider(id)` | `removeProvider(id)` | 增加级联删除关联 configs |

## 6. Shell 生成器适配

所有 4 个生成器的改动一致：

```typescript
// 旧：双层嵌套循环
for (const provider of data.providers.filter(p => p.enabled)) {
  for (const config of provider.configs.filter(c => c.enabled)) { ... }
}

// 新：构建 providerMap + 扁平遍历 configs
const providerMap = new Map(data.providers.map(p => [p.id, p]))
const enabledProviderIds = new Set(data.providers.filter(p => p.enabled).map(p => p.id))
const enabledConfigs = data.configs.filter(c => c.enabled && enabledProviderIds.has(c.providerId))

for (const config of enabledConfigs) {
  const provider = providerMap.get(config.providerId)
  if (provider) this.writeFunction(lines, provider, config, values)
}
```

## 7. IPC 层

无需新增或修改 IPC 通道。`data:load` 和 `data:save` 传输完整 JSON，结构变化对 IPC 透明。

`buildDecryptedMap()` 从双层循环改为遍历 `data.configs`。

## 8. 变更文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/shared/types.ts` | 修改 | 新增 v3 类型，保留 v2 用于迁移 |
| `src/shared/migration.ts` | 新增 | v2→v3 迁移函数 |
| `src/main/services/config.ts` | 修改 | loadData 自动迁移 |
| `src/main/ipc.ts` | 修改 | buildDecryptedMap 适配 |
| `src/main/services/generators/*.ts` | 修改 | 4 个生成器适配扁平结构 |
| `src/renderer/src/stores/useAppStore.ts` | 修改 | 新状态结构 + CRUD |
| `src/renderer/src/modules/cc-launch/components/*.tsx` | 新增 | 8 个独立组件 |
| `src/renderer/src/modules/cc-launch/pages/CCConfigPage.tsx` | 重写 | Tabs 壳 |

## 9. 向后兼容

- 启动时自动检测 data.json 的 version 字段
- v2 数据自动迁移为 v3 格式并写回磁盘
- 迁移是一次性的，后续启动直接读取 v3 数据
- 保留 V2 类型定义用于迁移代码
