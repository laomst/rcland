const claudeEnvDict = {
  tabTitle: 'Env Variable Dictionary',
  builtInLabel: 'Built-in',
  customLabel: 'Custom',
  defaultInTemplate: 'Default in Template',
  exampleValue: 'Example',
  variableName: 'Variable Name',
  descriptionLabel: 'Description',
  category: 'Category',
  searchPlaceholder: 'Search variable name or description',
  addCustom: 'Add Custom Variable',
  editCustom: 'Edit Custom Variable',
  deleteCustomConfirm: 'Delete custom variable "{{key}}"?',
  pickerTitle: 'Select Environment Variables',
  pickerOk: 'Add Selected',
  builtInReadOnlyHint: 'Built-in variable name, description, and example are read-only; "Default in Template" can be toggled.',
  invalidKey: 'Variable name must match [A-Za-z_][A-Za-z0-9_]*',
  keyConflictBuiltIn: 'Cannot collide with a built-in variable name',
  keyConflictUser: 'Custom variable with this name already exists',

  categories: {
    model: 'Model',
    thinking: 'Thinking',
    request: 'Request',
    privacy: 'Privacy',
    cache: 'Cache',
    custom: 'Custom',
  },

  desc: {
    ANTHROPIC_MODEL: 'Name of the model to use for the primary model. See Model configuration.',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'Override the default Opus model alias. See Model configuration.',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'Override the default Sonnet model alias. See Model configuration.',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'Override the default Haiku model alias. See Model configuration.',
    MAX_THINKING_TOKENS: "Override the extended thinking token budget. The ceiling is the model's max output tokens minus one. Set to 0 to disable thinking entirely. On models with adaptive reasoning, the budget is ignored unless adaptive reasoning is disabled via CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING.",
    CLAUDE_CODE_DISABLE_THINKING: 'Set to 1 to force-disable extended thinking regardless of model support or other settings. More direct than MAX_THINKING_TOKENS=0.',
    CLAUDE_CODE_EFFORT_LEVEL: 'Set the effort level for supported models. Values: low, medium, high, xhigh, max, or auto. Available levels depend on the model. Takes precedence over /effort and the effortLevel setting.',
    API_TIMEOUT_MS: 'Timeout for API requests in milliseconds (default: 600000 / 10 minutes; max: 2147483647). Increase when requests time out on slow networks or when routing through a proxy.',
    ANTHROPIC_BETAS: 'Comma-separated list of additional anthropic-beta header values. Use this to opt into an Anthropic API beta before Claude Code adds native support. Works with all auth methods including Claude.ai subscription.',
    ANTHROPIC_CUSTOM_HEADERS: 'Custom headers to add to requests (Name: Value format, newline-separated for multiple headers).',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: 'Equivalent of setting DISABLE_AUTOUPDATER, DISABLE_FEEDBACK_COMMAND, DISABLE_ERROR_REPORTING, and DISABLE_TELEMETRY.',
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: 'Set to 1 to strip Anthropic-specific anthropic-beta request headers and beta tool-schema fields (such as defer_loading and eager_input_streaming) from API requests. Use when a proxy gateway rejects requests with errors like "Unexpected value(s) for the anthropic-beta header" or "Extra inputs are not permitted".',
    DISABLE_PROMPT_CACHING: 'Set to 1 to disable prompt caching for all models (takes precedence over per-model settings).',
  },

  unknownVariable: 'Unknown Variable',
}

export default claudeEnvDict
