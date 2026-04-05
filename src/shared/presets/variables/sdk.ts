import type { ShellType } from '../../shell'
import type { VariablePreset } from '../types'

/**
 * SDK 环境变量
 */
export const sdkVariablePresets: VariablePreset[] = [
  {
    type: 'variable',
    key: 'sdk-home-dir',
    name: 'SDK_HOME_DIR',
    category: 'sdk',
    description: '定义 SDK 根目录',
    tags: ['sdk', 'path'],
    varKey: 'SDK_HOME_DIR',
    value: '/Library',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'variable',
    key: 'java8-home',
    name: 'JAVA8_HOME',
    category: 'sdk',
    description: 'Java 8 SDK 路径',
    tags: ['java', 'sdk'],
    varKey: 'JAVA8_HOME',
    value: '$SDK_HOME_DIR/Java/JavaVirtualMachines/jdk-1.8.jdk/Contents/Home',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'variable',
    key: 'java21-home',
    name: 'JAVA21_HOME',
    category: 'sdk',
    description: 'Java 21 SDK 路径',
    tags: ['java', 'sdk'],
    varKey: 'JAVA21_HOME',
    value: '$SDK_HOME_DIR/Java/JavaVirtualMachines/jdk-21.jdk/Contents/Home',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'variable',
    key: 'java-home',
    name: 'JAVA_HOME',
    category: 'sdk',
    description: '当前使用的 Java 路径（默认 Java 21）',
    tags: ['java', 'sdk'],
    varKey: 'JAVA_HOME',
    value: '$JAVA21_HOME',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'variable',
    key: 'maven-home',
    name: 'MAVEN_HOME',
    category: 'sdk',
    description: 'Maven 安装路径',
    tags: ['maven', 'sdk', 'build'],
    varKey: 'MAVEN_HOME',
    value: '$SDK_HOME_DIR/apache-maven-3.6.3',
    shells: ['zsh', 'bash'] as ShellType[]
  },
  {
    type: 'variable',
    key: 'python-home',
    name: 'PYTHON_HOME',
    category: 'sdk',
    description: 'Python 安装路径',
    tags: ['python', 'sdk'],
    varKey: 'PYTHON_HOME',
    value: '/Library/Frameworks/Python.framework/Versions/3.13',
    shells: ['zsh', 'bash'] as ShellType[]
  }
]
