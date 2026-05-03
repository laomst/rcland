import type { ClaudeEnvDictItem } from '../../types/claude-env-dict'

/**
 * 内置 Claude Code 环境变量预制。
 * 数据来源：https://code.claude.com/docs/en/env-vars
 *
 * 描述文本走 i18n key（type='i18n'），实际文本写在
 * `src/renderer/src/i18n/locales/{lang}/claude-env-dict.ts` 的 `desc.<KEY>` 下。
 *
 * defaultInTemplate=true 表示创建新 Provider 时默认填入模板。
 */
export const BUILT_IN_CLAUDE_ENV_DICT: ClaudeEnvDictItem[] = [
  // model
  {
    key: 'ANTHROPIC_MODEL',
    category: 'model',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: 'claude-opus-4-7',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_MODEL' }
  },
  {
    key: 'ANTHROPIC_DEFAULT_OPUS_MODEL',
    category: 'model',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: 'claude-opus-4-7',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_DEFAULT_OPUS_MODEL' }
  },
  {
    key: 'ANTHROPIC_DEFAULT_SONNET_MODEL',
    category: 'model',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: 'claude-sonnet-4-7',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_DEFAULT_SONNET_MODEL' }
  },
  {
    key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL',
    category: 'model',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: 'claude-haiku-4-5',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_DEFAULT_HAIKU_MODEL' }
  },
  // thinking
  {
    key: 'MAX_THINKING_TOKENS',
    category: 'thinking',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: '8192',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.MAX_THINKING_TOKENS' }
  },
  {
    key: 'CLAUDE_CODE_DISABLE_THINKING',
    category: 'thinking',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: '1',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.CLAUDE_CODE_DISABLE_THINKING' }
  },
  {
    key: 'CLAUDE_CODE_EFFORT_LEVEL',
    category: 'thinking',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: 'medium',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.CLAUDE_CODE_EFFORT_LEVEL' }
  },
  // request
  {
    key: 'API_TIMEOUT_MS',
    category: 'request',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: '600000',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.API_TIMEOUT_MS' }
  },
  {
    key: 'ANTHROPIC_BETAS',
    category: 'request',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: 'prompt-caching-2024-07-31',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_BETAS' }
  },
  {
    key: 'ANTHROPIC_CUSTOM_HEADERS',
    category: 'request',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: 'X-Org-Id: my-org',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.ANTHROPIC_CUSTOM_HEADERS' }
  },
  // privacy
  {
    key: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
    category: 'privacy',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: '1',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC' }
  },
  {
    key: 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS',
    category: 'privacy',
    builtIn: true,
    defaultInTemplate: true,
    exampleValue: '1',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS' }
  },
  // cache
  {
    key: 'DISABLE_PROMPT_CACHING',
    category: 'cache',
    builtIn: true,
    defaultInTemplate: false,
    exampleValue: '1',
    description: { type: 'i18n', key: 'claudeEnvDict.desc.DISABLE_PROMPT_CACHING' }
  }
]
