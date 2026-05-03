const claudeEnvDict = {
  // Tab 与字典管理 UI
  tabTitle: '环境变量字典',
  builtInLabel: '内置',
  customLabel: '自定义',
  defaultInTemplate: '默认模板',
  exampleValue: '示例值',
  variableName: '变量名',
  descriptionLabel: '说明',
  category: '分类',
  searchPlaceholder: '搜索变量名或说明',
  addCustom: '添加自定义变量',
  editCustom: '编辑自定义变量',
  deleteCustomConfirm: '确认删除自定义变量 "{{key}}"？',
  pickerTitle: '选择环境变量',
  pickerOk: '添加所选',
  builtInReadOnlyHint: '内置变量的名称、说明、示例值不可修改；可切换"默认模板"。',
  invalidKey: '变量名只能包含字母、数字、下划线，且不能以数字开头',
  keyConflictBuiltIn: '不能与内置变量同名',
  keyConflictUser: '已存在同名自定义变量',

  // 分类标签
  categories: {
    model: '模型',
    thinking: '思考/推理',
    request: '请求',
    privacy: '隐私/遥测',
    cache: '缓存',
    custom: '自定义',
  },

  // 13 条内置说明
  desc: {
    ANTHROPIC_MODEL: '主模型 ID。Claude Code 主对话使用的模型名称，如 claude-opus-4-7。',
    ANTHROPIC_DEFAULT_OPUS_MODEL: '覆盖 Opus 默认模型别名。指定 opus 这一别名解析到的具体模型 ID。',
    ANTHROPIC_DEFAULT_SONNET_MODEL: '覆盖 Sonnet 默认模型别名。指定 sonnet 这一别名解析到的具体模型 ID。',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: '覆盖 Haiku 默认模型别名。指定 haiku 这一别名解析到的具体模型 ID。',
    MAX_THINKING_TOKENS: '扩展思考的 token 预算上限。最大值为模型最大输出 token 减一。设为 0 完全关闭思考。在支持自适应推理的模型上，需先通过 CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING 关闭自适应才会生效。',
    CLAUDE_CODE_DISABLE_THINKING: '设为 1 强制关闭扩展思考，无视模型支持或其它设置。比 MAX_THINKING_TOKENS=0 更直接。',
    CLAUDE_CODE_EFFORT_LEVEL: '为支持的模型设置努力等级。可选 low/medium/high/xhigh/max/auto，具体可用等级取决于模型。优先级高于 /effort 命令和 effortLevel 设置。',
    API_TIMEOUT_MS: 'API 请求超时（毫秒），默认 600000（10 分钟），最大 2147483647。慢网络或经代理路由时调大。',
    ANTHROPIC_BETAS: '逗号分隔的额外 anthropic-beta 头列表。用于在 Claude Code 原生支持前提前启用某项 Beta 能力。适用于所有认证方式（含 Claude.ai 订阅）。',
    ANTHROPIC_CUSTOM_HEADERS: '添加到请求中的自定义头，格式 Name: Value，多条用换行分隔。',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '一键关闭非必要流量，等价于同时设置 DISABLE_AUTOUPDATER、DISABLE_FEEDBACK_COMMAND、DISABLE_ERROR_REPORTING、DISABLE_TELEMETRY。',
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: '设为 1 时剥离 anthropic-beta 请求头及 Beta 工具 schema 字段（如 defer_loading、eager_input_streaming）。在网关拒收（"Unexpected value(s) for the anthropic-beta header"、"Extra inputs are not permitted"）时使用。',
    DISABLE_PROMPT_CACHING: '设为 1 关闭所有模型的 Prompt 缓存（优先级高于按模型的设置）。',
  },

  // 渲染降级标签：当 ConfigSet.envVars 中出现字典里没有的 key 时显示
  unknownVariable: '未知变量',
}

export default claudeEnvDict
