import type {
  ShellConfigData,
  ShellVariable,
  PathVariable,
  PathEntry,
  ShellFunction,
  ShellAlias,
  LocalShellConfigData
} from './shell-types'

// ============================================================
// Factory Helpers
// ============================================================

/** Generate a UUID v4 (compatible with both Node.js and browser environments) */
function generateUUID(): string {
  // Try native crypto.randomUUID first (available in Node.js 16.7+ and modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function createEmptyShellConfig(): ShellConfigData {
  return {
    version: 1,
    variables: [],
    pathVariables: [],
    pathEntries: [],
    functions: [],
    aliases: [],
    prompt: { type: 'simple' },
    output: { profiles: {} }
  }
}

export function createEmptyLocalShellConfig(): LocalShellConfigData {
  return { version: 1, variables: [], pathVariables: [], pathEntries: [], functions: [], aliases: [] }
}

export function createEmptyVariable(): ShellVariable {
  return {
    id: generateUUID(),
    key: '',
    value: '',
    encrypted: false,
    enabled: true
  }
}

export function createEmptyPathEntry(): PathEntry {
  return {
    id: generateUUID(),
    path: '',
    enabled: true
  }
}

export function createEmptyPathVariable(): PathVariable {
  return {
    id: generateUUID(),
    key: '',
    value: '',
    enabled: true
  }
}

export function createEmptyFunction(): ShellFunction {
  return {
    id: generateUUID(),
    name: '',
    category: 'custom',
    body: {},
    enabled: true
  }
}

export function createEmptyAlias(): ShellAlias {
  return {
    id: generateUUID(),
    alias: '',
    command: '',
    enabled: true
  }
}

// ============================================================
// Built-in Functions (不可删除，只能停用)
// ============================================================

export const BUILTIN_FUNCTIONS: ShellFunction[] = [
  {
    id: 'builtin:set-main-task-name',
    name: 'set_main_task_name',
    category: 'builtin',
    description: '设置终端标签页/窗口标题。iTerm2 使用 OSC 1337 SetUserVar，其他终端使用标准 OSC 0',
    body: {
      zsh: `set_main_task_name() {
  if [[ "\$TERM_PROGRAM" == "iTerm.app" ]]; then
    command -v base64 >/dev/null 2>&1 || return 0
    printf "\\033]1337;SetUserVar=mainTask=%s\\007" "\$(printf '%s' "\$*" | base64 | tr -d '\\n')"
  else
    printf '\\033]0;%s\\007' "\$*"
  fi
}`,
      bash: `set_main_task_name() {
  if [[ "\$TERM_PROGRAM" == "iTerm.app" ]]; then
    command -v base64 >/dev/null 2>&1 || return 0
    printf "\\033]1337;SetUserVar=mainTask=%s\\007" "\$(printf '%s' "\$*" | base64 | tr -d '\\n')"
  else
    printf '\\033]0;%s\\007' "\$*"
  fi
}`,
      powershell: `function set_main_task_name {
    [Console]::Write([char]27 + "]0;\$args" + [char]7)
}`
    },
    funcNames: { zsh: 'set_main_task_name', bash: 'set_main_task_name', powershell: 'set_main_task_name' },
    enabled: true,
    builtIn: true
  },
  {
    id: 'builtin:pathls',
    name: 'pathls',
    category: 'builtin',
    description: '显示 PATH 列表，-i/--info 显示 RCLand 管理的路径和完整 PATH',
    body: {
      zsh: `pathls() {
  local show_info=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -i|--info) show_info=true; shift ;;
      *) echo "Usage: pathls [-i|--info]" >&2; return 1 ;;
    esac
  done
  if [[ "$show_info" == true ]]; then
    echo "\\033[1;34m=== _RCLAND_MANAGED_PATH ===\\033[0m"
    if [[ -n "$_RCLAND_MANAGED_PATH" ]]; then echo "\${(j:\\n:)\${(@s/:/)_RCLAND_MANAGED_PATH}}"; else echo "(empty)"; fi
    echo "\\n\\033[1;34m=== PATH ===\\033[0m"
    echo "\${(j:\\n:)\${(@s/:/)PATH}}"
  else
    echo "\${(j:\\n:)\${(@s/:/)PATH}}"
  fi
}`,
      bash: `pathls() {
  local show_info=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -i|--info) show_info=true; shift ;;
      *) echo "Usage: pathls [-i|--info]" >&2; return 1 ;;
    esac
  done
  if [[ "$show_info" == true ]]; then
    echo -e "\\033[1;34m=== _RCLAND_MANAGED_PATH ===\\033[0m"
    if [[ -n "$_RCLAND_MANAGED_PATH" ]]; then echo "$_RCLAND_MANAGED_PATH" | tr ':' '\\n'; else echo "(empty)"; fi
    echo -e "\\n\\033[1;34m=== PATH ===\\033[0m"
    echo "$PATH" | tr ':' '\\n'
  else
    echo "$PATH" | tr ':' '\\n'
  fi
}`,
      powershell: `function pathls {
  param([switch]$Info)
  if ($Info) {
    Write-Host "=== _RCLAND_MANAGED_PATH ===" -ForegroundColor Blue
    if ($env:_RCLAND_MANAGED_PATH) { $env:_RCLAND_MANAGED_PATH -split ';' | ForEach-Object { Write-Host $_ } } else { Write-Host "(empty)" }
    Write-Host ""; Write-Host "=== PATH ===" -ForegroundColor Blue
    $env:PATH -split ';' | ForEach-Object { Write-Host $_ }
  } else {
    $env:PATH -split ';' | ForEach-Object { Write-Host $_ }
  }
}`
    },
    funcNames: { zsh: 'pathls', bash: 'pathls', powershell: 'pathls' },
    enabled: true,
    builtIn: true
  },
  {
    id: 'builtin:check-env-exists',
    name: 'check-env-exists',
    category: 'builtin',
    description: '检测环境变量是否存在值',
    body: {
      zsh: `check-env-exists() {
  local missing=()
  for name in "$@"; do
    if [[ -z "\${(P)name}" ]]; then missing+=("$name"); fi
  done
  if [[ \${#missing[@]} -eq 0 ]]; then return 0; fi
  for name in "\${missing[@]}"; do
    printf '\\033[1;31m环境变量未设置: %s\\033[0m\\n' "$name"
  done
  return 1
}`,
      bash: `check-env-exists() {
  local missing=()
  for name in "$@"; do
    if [[ -z "\${!name}" ]]; then missing+=("$name"); fi
  done
  if [[ \${#missing[@]} -eq 0 ]]; then return 0; fi
  for name in "\${missing[@]}"; do
    printf '\\033[1;31m环境变量未设置: %s\\033[0m\\n' "$name"
  done
  return 1
}`,
      powershell: `function check-env-exists {
  param([string[]]$Names)
  $missing = @()
  foreach ($name in $Names) {
    if (-not [System.Environment]::GetEnvironmentVariable($name)) { $missing += $name }
  }
  if ($missing.Count -eq 0) { return 0 }
  foreach ($name in $missing) { Write-Host "环境变量未设置: $name" -ForegroundColor Red }
  return 1
}`
    },
    funcNames: { zsh: 'check-env-exists', bash: 'check-env-exists', powershell: 'check-env-exists' },
    enabled: true,
    builtIn: true
  },
  {
    id: 'builtin:prompt-select',
    name: 'prompt-select',
    category: 'builtin',
    description: '通用交互式选择菜单',
    body: {
      zsh: `prompt-select() {
  local title=\$1
  shift
  local options=("\$@" "quit:退出")

  local _sm_old_xtrace=\$([[ \$- == *x* ]] && echo "on" || echo "off")
  local _sm_old_ps4=\$PS4
  set +xv
  PS4=''
  unsetopt XTRACE VERBOSE 2>/dev/null

  local _sm_old_stty=\$(stty -g 2>/dev/null)
  stty -echo 2>/dev/null

  local keys=() descs=()
  for opt in "\${options[@]}"; do
    keys+=("\${opt%%:*}")
    descs+=("\${opt#*:}")
  done

  local selected=0
  local num_options=\${#options[@]}
  local _num_buf=""
  local _menu_lines=\$((num_options + 4))
  local _menu_drawn=""

  _sm_cleanup() {
    [[ -n "\$_menu_drawn" ]] && printf '\\033[%dA\\033[J' "\$_menu_lines"
    tput cnorm 2>/dev/null
    stty "\$_sm_old_stty" 2>/dev/null
    unfunction _sm_draw _sm_cleanup 2>/dev/null
    trap - INT
  }
  trap '_sm_cleanup; [[ "\$_sm_old_xtrace" == "on" ]] && set -x && setopt XTRACE VERBOSE 2>/dev/null; PS4=\$_sm_old_ps4; return 130' INT

  tput civis 2>/dev/null

  _sm_draw() {
    [[ -n "\$_menu_drawn" ]] && printf '\\033[%dA' "\$_menu_lines"
    _menu_drawn=1
    printf '\\033[K\\n'
    printf '\\033[1;36m  === %s ===\\033[0m\\033[K\\n' "\$title"
    if [[ -n "\$_num_buf" ]]; then
      if (( _num_buf >= 1 && _num_buf <= num_options )); then
        printf '\\033[38;2;160;205;255m  [跳转到: \\033[1;33m%s\\033[0;38;2;160;205;255m | 回车跳转 | 退格修改 | Esc清空]\\033[0m\\033[K\\n' "\$_num_buf"
      else
        printf '\\033[38;2;160;205;255m  [跳转到: \\033[1;31m%s (无效，范围 1-%d)\\033[0;38;2;160;205;255m | 退格修改 | Esc清空]\\033[0m\\033[K\\n' "\$_num_buf" "\$num_options"
      fi
    else
      printf '\\033[38;2;160;205;255m  [↑↓ 选择 | 数字快选 | 回车确认 | Esc退出]\\033[0m\\033[K\\n'
    fi
    printf '\\033[K\\n'
    for i in {1..\$num_options}; do
      if [[ \$i -eq \$((selected + 1)) ]]; then
        printf '\\033[1;34m> %d. %s\\033[0m\\033[K\\n' "\$i" "\${descs[\$i]}"
      else
        printf '\\033[90m  %d. %s\\033[0m\\033[K\\n' "\$i" "\${descs[\$i]}"
      fi
    done
  }

  _sm_draw

  local input seq selected_key
  while true; do
    input=''
    read -sk 1 input 2>/dev/null
    case \$input in
      \$'\\x1b')
        seq=''
        read -sk 2 -t 0.001 seq 2>/dev/null
        if [[ -n "\$_num_buf" ]]; then
          if [[ -z "\$seq" ]]; then
            _num_buf=""
            _sm_draw
          fi
        else
          case \$seq in
            '[A') ((selected--)); ((selected < 0)) && selected=\$((num_options - 1)); _sm_draw ;;
            '[B') ((selected++)); ((selected >= num_options)) && selected=0; _sm_draw ;;
            '') selected_key="quit"; break ;;
          esac
        fi
        ;;
      ''|\$'\\x0d'|\$'\\x0a')
        if [[ -n "\$_num_buf" ]]; then
          if (( _num_buf >= 1 && _num_buf <= num_options )); then
            selected=\$((_num_buf - 1))
          fi
          _num_buf=""
          _sm_draw
        else
          selected_key="\${keys[\$((selected + 1))]}"
          break
        fi
        ;;
      \$'\\x7f'|\$'\\x08')
        if [[ -n "\$_num_buf" ]]; then
          _num_buf="\${_num_buf%?}"
          _sm_draw
        fi
        ;;
      [0-9])
        _num_buf="\${_num_buf}\${input}"
        _sm_draw
        ;;
      *) continue ;;
    esac
  done

  _sm_cleanup

  [[ "\$_sm_old_xtrace" == "on" ]] && set -x
  [[ "\$_sm_old_xtrace" == "on" ]] && setopt XTRACE VERBOSE 2>/dev/null
  PS4=\$_sm_old_ps4

  [[ "\$selected_key" == "quit" ]] && { printf '\\033[1;31m已取消选择\\033[0m\\n'; return 1; }
  printf '\\033[1;32m已选择 => %s\\033[0m\\n' "\${descs[\$((selected + 1))]}"
  REPLY=\$selected_key
}`,
      bash: `prompt-select() {
  local title="\$1"; shift
  local options=("\$@" "quit:退出")
  local _sm_old_stty; _sm_old_stty=\$(stty -g 2>/dev/null); stty -echo 2>/dev/null
  local keys=() descs=()
  for opt in "\${options[@]}"; do keys+=("\${opt%%:*}"); descs+=("\${opt#*:}"); done
  local selected=0 num_options=\${#options[@]} _num_buf="" _menu_anchor_saved=""
  _sm_cleanup() {
    [[ -n "\$_menu_anchor_saved" ]] && printf '\\0338\\033[J'
    tput cnorm 2>/dev/null; stty "\$_sm_old_stty" 2>/dev/null; trap - INT
  }
  trap '_sm_cleanup; return 130' INT
  tput civis 2>/dev/null
  _sm_draw() {
    if [[ -z "\$_menu_anchor_saved" ]]; then
      printf '\\0337'
      _menu_anchor_saved=1
    else
      printf '\\0338\\033[J'
    fi
    printf '\\033[K\\n\\033[1;36m  === %s ===\\033[0m\\033[K\\n' "\$title"
    if [[ -n "\$_num_buf" ]]; then
      if (( _num_buf >= 1 && _num_buf <= num_options )); then
        printf '\\033[38;2;160;205;255m  [跳转到: \\033[1;33m%s\\033[0;38;2;160;205;255m | 回车跳转 | 退格修改 | Esc清空]\\033[0m\\033[K\\n' "\$_num_buf"
      else
        printf '\\033[38;2;160;205;255m  [跳转到: \\033[1;31m%s (无效，范围 1-%d)\\033[0;38;2;160;205;255m | 退格修改 | Esc清空]\\033[0m\\033[K\\n' "\$_num_buf" "\$num_options"
      fi
    else
      printf '\\033[38;2;160;205;255m  [↑↓ 选择 | 数字快选 | 回车确认 | Esc退出]\\033[0m\\033[K\\n'
    fi
    printf '\\033[K\\n'; local i
    for (( i=0; i<num_options; i++ )); do
      if [[ \$i -eq \$selected ]]; then
        printf '\\033[1;34m> %d. %s\\033[0m\\033[K\\n' "\$((i+1))" "\${descs[\$i]}"
      else
        printf '\\033[90m  %d. %s\\033[0m\\033[K\\n' "\$((i+1))" "\${descs[\$i]}"
      fi
    done
  }
  _sm_draw
  local input seq selected_key
  while true; do
    input=''; IFS= read -rsn 1 input 2>/dev/null
    case "\$input" in
      \$'\\x1b')
        seq=''; IFS= read -rsn 2 -t 0.01 seq 2>/dev/null
        if [[ -n "\$_num_buf" ]]; then
          if [[ -z "\$seq" ]]; then _num_buf=""; _sm_draw; fi
        else
          case "\$seq" in
            '[A') ((selected--)); ((selected < 0)) && selected=\$((num_options - 1)); _sm_draw ;;
            '[B') ((selected++)); ((selected >= num_options)) && selected=0; _sm_draw ;;
            '') selected_key="quit"; break ;;
          esac
        fi ;;
      ''|\$'\\x0d'|\$'\\x0a')
        if [[ -n "\$_num_buf" ]]; then
          if (( _num_buf >= 1 && _num_buf <= num_options )); then selected=\$((_num_buf - 1)); fi
          _num_buf=""; _sm_draw
        else
          selected_key="\${keys[\$selected]}"; break
        fi ;;
      \$'\\x7f'|\$'\\x08') if [[ -n "\$_num_buf" ]]; then _num_buf="\${_num_buf%?}"; _sm_draw; fi ;;
      [0-9]) _num_buf="\${_num_buf}\${input}"; _sm_draw ;;
      *) continue ;;
    esac
  done
  _sm_cleanup
  [[ "\$selected_key" == "quit" ]] && { printf '\\033[1;31m已取消选择\\033[0m\\n'; return 1; }
  printf '\\033[1;32m已选择 => %s\\033[0m\\n' "\${descs[\$selected]}"
  REPLY="\$selected_key"
}`,
      powershell: `function prompt-select {
  param(
    [Parameter(Mandatory)][string]\$Title,
    [string[]]\$Options
  )
  \$Options = @(\$Options) + @("quit:退出")
  \$keys = @(); \$descs = @()
  foreach (\$opt in \$Options) {
    \$parts = \$opt -split ':', 2
    \$keys += \$parts[0]; \$descs += \$parts[1]
  }
  \$script:_ps_selected = 0; \$numOptions = \$Options.Count; \$script:_ps_numBuf = ""
  [Console]::CursorVisible = \$false
  \$script:_ps_menuDrawn = \$false
  function Draw-Menu{
    if(\$script:_ps_menuDrawn){[Console]::SetCursorPosition(0,[Console]::CursorTop-(\$numOptions+3))}
    \$script:_ps_menuDrawn=\$true
    Write-Host ""
    Write-Host "  === \$Title ===" -ForegroundColor Cyan
    if(\$script:_ps_numBuf -ne ""){
      if([int]\$script:_ps_numBuf -ge 1 -and [int]\$script:_ps_numBuf -le \$numOptions){
        Write-Host "  [跳转到: \$(\$script:_ps_numBuf) | 回车跳转 | 退格修改 | Esc清空]" -ForegroundColor DarkCyan
      }else{
        Write-Host "  [跳转到: \$(\$script:_ps_numBuf) (无效，范围 1-\$numOptions) | 退格修改 | Esc清空]" -ForegroundColor DarkCyan
      }
    }else{Write-Host "  [↑↓ 选择 | 数字快选 | 回车确认 | Esc退出]" -ForegroundColor DarkCyan}
    for(\$i=0;\$i -lt \$numOptions;\$i++){
      if(\$i -eq \$script:_ps_selected){Write-Host "> \$(\$i+1). \$(\$descs[\$i])" -ForegroundColor Blue}
      else{Write-Host "  \$(\$i+1). \$(\$descs[\$i])" -ForegroundColor DarkGray}
    }
  }
  try{
    Draw-Menu
    while(\$true){
      \$key = [Console]::ReadKey(\$true)
      switch(\$key.Key){
        'UpArrow'{if(\$script:_ps_numBuf -eq ""){\$script:_ps_selected=(\$script:_ps_selected-1+\$numOptions)%\$numOptions;Draw-Menu}}
        'DownArrow'{if(\$script:_ps_numBuf -eq ""){\$script:_ps_selected=(\$script:_ps_selected+1)%\$numOptions;Draw-Menu}}
        'Enter'{
          if(\$script:_ps_numBuf -ne ""){
            \$n=[int]\$script:_ps_numBuf
            if(\$n -ge 1 -and \$n -le \$numOptions){\$script:_ps_selected=\$n-1}
            \$script:_ps_numBuf="";Draw-Menu
          }else{\$selectedKey=\$keys[\$script:_ps_selected];break}
        }
        'Escape'{if(\$script:_ps_numBuf -ne ""){\$script:_ps_numBuf="";Draw-Menu}else{\$selectedKey="quit";break}}
        'Backspace'{if(\$script:_ps_numBuf.Length -gt 0){\$script:_ps_numBuf=\$script:_ps_numBuf.Substring(0,\$script:_ps_numBuf.Length-1);Draw-Menu}}
        default{\$ch=\$key.KeyChar;if(\$ch -match '[0-9]'){\$script:_ps_numBuf+=\$ch;Draw-Menu}}
      }
      if(\$null -ne \$selectedKey){break}
    }
  }finally{
    [Console]::CursorVisible=\$true
    if(\$script:_ps_menuDrawn){
      [Console]::Write([char]27 + "[\$(\$numOptions+3)A" + [char]27 + "[J")
    }
    \$script:_ps_numBuf=""
    \$script:_ps_selected=0
    \$script:_ps_menuDrawn=\$false
  }
  if(\$selectedKey -eq "quit"){Write-Host "已取消选择" -ForegroundColor Red;return \$false}
  Write-Host "已选择 => \$(\$descs[\$script:_ps_selected])" -ForegroundColor Green
  \$global:REPLY = \$selectedKey
  return \$true
}`
    },
    funcNames: { zsh: 'prompt-select', bash: 'prompt-select', powershell: 'prompt-select' },
    enabled: true,
    builtIn: true
  }
]
