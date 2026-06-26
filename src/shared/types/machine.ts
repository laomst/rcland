export interface Machine {
  /** = 本机 machineId（同步后其他机器据此识别这台） */
  id: string
  /** 用户可编辑显示名，默认取 hostname */
  name: string
  os: 'darwin' | 'win32' | 'linux'
  hostname: string
  /** 首次初始化时间（epoch ms） */
  createdAt: number
  /** 每次启动更新（epoch ms） */
  lastSeenAt: number
}

export interface MachinesData {
  version: 1
  machines: Machine[]
}

export function createEmptyMachinesData(): MachinesData {
  return { version: 1, machines: [] }
}
