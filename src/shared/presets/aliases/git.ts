import type { ShellType } from '../../shell'
import type { AliasPreset } from '../types'

/**
 * Git 别名
 */
export const gitAliasPresets: AliasPreset[] = [
  {
    type: 'alias',
    key: 'alias-gs',
    name: 'gs',
    category: 'git',
    description: '查看状态',
    tags: ['git', 'status'],
    alias: 'gs',
    command: 'git status',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-ga',
    name: 'ga',
    category: 'git',
    description: '添加文件',
    tags: ['git', 'add'],
    alias: 'ga',
    command: 'git add',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gc',
    name: 'gc',
    category: 'git',
    description: '提交更改',
    tags: ['git', 'commit'],
    alias: 'gc',
    command: 'git commit',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gp',
    name: 'gp',
    category: 'git',
    description: '推送到远程',
    tags: ['git', 'push'],
    alias: 'gp',
    command: 'git push',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gl',
    name: 'gl',
    category: 'git',
    description: '拉取更新',
    tags: ['git', 'pull'],
    alias: 'gl',
    command: 'git pull',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gco',
    name: 'gco',
    category: 'git',
    description: '切换分支',
    tags: ['git', 'checkout'],
    alias: 'gco',
    command: 'git checkout',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gb',
    name: 'gb',
    category: 'git',
    description: '查看分支',
    tags: ['git', 'branch'],
    alias: 'gb',
    command: 'git branch',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-gd',
    name: 'gd',
    category: 'git',
    description: '查看差异',
    tags: ['git', 'diff'],
    alias: 'gd',
    command: 'git diff',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'alias',
    key: 'alias-glog',
    name: 'glog',
    category: 'git',
    description: '美化日志（单行）',
    tags: ['git', 'log'],
    alias: 'glog',
    command: 'git log --oneline --graph --decorate',
    shells: ['zsh', 'bash'] as ShellType[]
  }
]
