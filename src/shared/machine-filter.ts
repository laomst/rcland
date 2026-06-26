/** 项是否适用于本机：空/未设置 = 全适用 */
export function appliesToMachine(item: { applicableMachines?: string[] }, machineId: string): boolean {
  const m = item.applicableMachines
  return !m || m.length === 0 || m.includes(machineId)
}

/** 项是否为"本机独占"：非空、仅含本机（用于本机适用项选择器） */
export function isMachineExclusive(item: { applicableMachines?: string[] }, machineId: string): boolean {
  const m = item.applicableMachines
  return !!m && m.length > 0 && m.every((id) => id === machineId)
}
