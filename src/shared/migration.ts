import type {
  CCLaunchData,
  CCLaunchDataV2,
  CCLaunchDataV3,
  CCLaunchDataV4,
  ProviderKey
} from './types'

export function migrateV2ToV3(data: CCLaunchDataV2): CCLaunchData {
  const providers = data.providers.map(({ configs: _, ...providerFields }) => providerFields)
  const configs = data.providers.flatMap((p) =>
    p.configs.map((c) => ({ ...c, providerId: p.id }))
  )

  // v3 result — will be immediately migrated to v5 below
  const v3: CCLaunchDataV3 = {
    version: 3,
    providers,
    configs,
    selector: data.selector,
  }

  return migrateV3ToV4(v3)
}

export function migrateV3ToV4(data: CCLaunchDataV3): CCLaunchData {
  const providers = data.providers.map((p) => {
    const { baseUrl, ...rest } = p
    const defaultEndpointId = crypto.randomUUID()
    return {
      ...rest,
      endpoints: [{ id: defaultEndpointId, label: '默认', url: baseUrl }]
    }
  })

  // Build a map from providerId → first endpoint id
  const defaultEndpointMap = new Map(
    providers.map((p) => [p.id, p.endpoints[0]?.id ?? ''])
  )

  const configs = data.configs.map((c) => ({
    ...c,
    endpointId: defaultEndpointMap.get(c.providerId) ?? ''
  }))

  // Immediately migrate to v5
  const v4: CCLaunchDataV4 = {
    version: 4,
    providers,
    configs,
    selector: data.selector,
  }

  return migrateV4ToV5(v4)
}

export function migrateV4ToV5(data: CCLaunchDataV4): CCLaunchData {
  // Step 1: Collect unique tokens per provider
  const providerTokenMap = new Map<string, Map<string, ProviderKey>>()

  for (const config of data.configs) {
    const providerId = config.providerId
    const token = config.token || ''

    if (!providerTokenMap.has(providerId)) {
      providerTokenMap.set(providerId, new Map())
    }

    const tokenMap = providerTokenMap.get(providerId)!
    if (token && !tokenMap.has(token)) {
      // Create a new key for this unique token
      const newKey: ProviderKey = {
        id: crypto.randomUUID(),
        label: config.tokenComment || 'Key',
        token: token,
        comment: config.tokenComment || undefined
      }
      tokenMap.set(token, newKey)
    }
  }

  // Step 2: Build providers with keys
  const providers = data.providers.map((p) => {
    const tokenMap = providerTokenMap.get(p.id)
    const keys = tokenMap ? Array.from(tokenMap.values()) : []
    return {
      ...p,
      keys
    }
  })

  // Step 3: Build token → keyId map
  const tokenToKeyId = new Map<string, string>()
  for (const provider of providers) {
    for (const key of provider.keys) {
      tokenToKeyId.set(key.token, key.id)
    }
  }

  // Step 4: Update configs with keyId and name (from description)
  const configs = data.configs.map((c) => {
    const { token, tokenComment, description, ...rest } = c
    return {
      ...rest,
      keyId: tokenToKeyId.get(token || '') ?? '',
      name: description || ''
    }
  })

  return {
    version: 5,
    providers,
    configs,
    selector: data.selector,
  }
}
