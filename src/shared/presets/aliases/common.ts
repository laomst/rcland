import type { ShellType } from '../../shell'
import type { AliasPreset } from '../types'

/**
 * 常用别名
 */
export const commonAliasPresets: AliasPreset[] = [
  // ls 别名
  {
    type: 'alias',
    key: 'alias-lsa',
    name: 'lsa',
    category: 'ls',
    description: '显示所有文件（含隐藏）',
    tags: ['ls', 'file'],
    alias: 'lsa',
    command: 'ls -a',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-ll',
    name: 'll',
    category: 'ls',
    description: '显示详细信息（含隐藏文件）',
    tags: ['ls', 'file'],
    alias: 'll',
    command: 'ls -alF',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-la',
    name: 'la',
    category: 'ls',
    description: '显示除 . 和 .. 外的所有文件',
    tags: ['ls', 'file'],
    alias: 'la',
    command: 'ls -A',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-l',
    name: 'l',
    category: 'ls',
    description: '按类型分类显示',
    tags: ['ls', 'file'],
    alias: 'l',
    command: 'ls -CF',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  // Python 别名
  {
    type: 'alias',
    key: 'alias-python',
    name: 'python',
    category: 'python',
    description: 'Python 3 快捷方式',
    tags: ['python'],
    alias: 'python',
    command: 'python3',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-pip',
    name: 'pip',
    category: 'python',
    description: 'pip3 快捷方式',
    tags: ['python', 'pip'],
    alias: 'pip',
    command: 'pip3',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  // 目录导航
  {
    type: 'alias',
    key: 'alias-dotdot',
    name: '..',
    category: 'navigation',
    description: '返回上级目录',
    tags: ['navigation', 'cd'],
    alias: '..',
    command: 'cd ..',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-dotdotdot',
    name: '...',
    category: 'navigation',
    description: '返回上两级目录',
    tags: ['navigation', 'cd'],
    alias: '...',
    command: 'cd ../..',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-tilde',
    name: '~',
    category: 'navigation',
    description: '快速回到主目录',
    tags: ['navigation', 'cd'],
    alias: '~',
    command: 'cd ~',
    shells: ['zsh', 'bash'] as ShellType[]
  }
]
