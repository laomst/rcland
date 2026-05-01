export type Localable = { localOnly?: boolean }

export function markLocalItems<T extends Localable>(items: T[]): T[] {
  return items.map((item) => ({ ...item, localOnly: true }))
}

export function stripLocalOnly<T extends Localable>(item: T): Omit<T, 'localOnly'> {
  const { localOnly: _localOnly, ...rest } = item
  return rest
}

export function splitLocalItems<T extends Localable>(items: T[]): { synced: Omit<T, 'localOnly'>[]; local: T[] } {
  const synced: Omit<T, 'localOnly'>[] = []
  const local: T[] = []

  for (const item of items) {
    if (item.localOnly) {
      local.push(item)
    } else {
      synced.push(stripLocalOnly(item))
    }
  }

  return { synced, local }
}
