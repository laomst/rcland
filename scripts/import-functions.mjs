/**
 * Import user functions from lmrc zsh functions into RCLand shell config.
 * Run: node scripts/import-functions.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

const CONFIG_PATH = '/Users/laomst/__baidu_sync_disk__/_config_/rcland/rcland.config.shell.json'

// 23 functions (pathls skipped — builtin)
const functions = [
  // === 01-fs: 文件系统操作 ===
  {
    name: 'mkcd',
    category: '文件系统',
    description: '创建目录并进入',
    body: {
      zsh: `mkcd() {\n  mkdir -p "$1" && cd "$1"\n}`,
      bash: `mkcd() {\n  mkdir -p "$1" && cd "$1"\n}`,
      powershell: `function mkcd {\n  param([string]$Path)\n  New-Item -ItemType Directory -Force -Path $Path | Out-Null\n  Set-Location $Path\n}`
    }
  },
  {
    name: 'back',
    category: '文件系统',
    description: '快速回退目录',
    body: {
      zsh: `back() {\n  local count=\${1:-1}\n  local path=""\n  repeat $count do\n    path="../$path"\n  done\n  cd "$path"\n}`,
      bash: `back() {\n  local count=\${1:-1}\n  local path=""\n  for ((i=0; i<count; i++)); do\n    path="../$path"\n  done\n  cd "$path"\n}`,
      powershell: `function back {\n  param([int]$Count = 1)\n  $path = "../" * $Count\n  Set-Location $path\n}`
    }
  },
  {
    name: 'duf',
    category: '文件系统',
    description: '查找并显示文件大小（按大小排序）',
    body: {
      zsh: `duf() {\n  du -sh "$@" 2>/dev/null | sort -rh\n}`,
      bash: `duf() {\n  du -sh "$@" 2>/dev/null | sort -rh\n}`,
      powershell: `function duf {\n  param([string[]]$Paths = @("."))\n  foreach ($p in $Paths) {\n    Get-ChildItem -Path $p -Force | ForEach-Object {\n      [PSCustomObject]@{ Size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Name = $_.Name }\n    } | Sort-Object Size -Descending | ForEach-Object { "{0,10:N0} KB  {1}" -f ($_.Size/1KB), $_.Name }\n  }\n}`
    }
  },
  {
    name: 'largest',
    category: '文件系统',
    description: '显示当前目录最大的文件/目录',
    body: {
      zsh: `largest() {\n  du -h . 2>/dev/null | sort -rh | head -n "\${1:-10}"\n}`,
      bash: `largest() {\n  du -h . 2>/dev/null | sort -rh | head -n "\${1:-10}"\n}`,
      powershell: `function largest {\n  param([int]$Count = 10)\n  Get-ChildItem -Force | ForEach-Object {\n    [PSCustomObject]@{ Size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; Name = $_.Name }\n  } | Sort-Object Size -Descending | Select-Object -First $Count | ForEach-Object { "{0,10:N0} KB  {1}" -f ($_.Size/1KB), $_.Name }\n}`
    }
  },

  // === 02-network: 网络操作 ===
  {
    name: 'myip',
    category: '网络',
    description: '获取本机 IP 地址',
    body: {
      zsh: `myip() {\n  if command -v ipconfig &>/dev/null; then\n    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null\n  else\n    hostname -I 2>/dev/null | awk '{print $1}'\n  fi\n}`,
      bash: `myip() {\n  if command -v ipconfig &>/dev/null; then\n    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null\n  else\n    hostname -I 2>/dev/null | awk '{print $1}'\n  fi\n}`,
      powershell: `function myip {\n  (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "Loopback*" } | Select-Object -First 1).IPAddress\n}`
    }
  },
  {
    name: 'publicip',
    category: '网络',
    description: '获取公网 IP',
    body: {
      zsh: `publicip() {\n  curl -s https://api.ipify.org\n}`,
      bash: `publicip() {\n  curl -s https://api.ipify.org\n}`,
      powershell: `function publicip {\n  (Invoke-RestMethod -Uri "https://api.ipify.org")\n}`
    }
  },
  {
    name: 'testport',
    category: '网络',
    description: '测试端口连通性',
    body: {
      zsh: `testport() {\n  local host=$1 port=$2\n  if timeout 3 zsh -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then\n    echo "Port $port is open"\n  else\n    echo "Port $port is closed"\n  fi\n}`,
      bash: `testport() {\n  local host=$1 port=$2\n  if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then\n    echo "Port $port is open"\n  else\n    echo "Port $port is closed"\n  fi\n}`,
      powershell: `function testport {\n  param([string]$Host_, [int]$Port)\n  try {\n    $tcp = New-Object System.Net.Sockets.TcpClient\n    $tcp.Connect($Host_, $Port)\n    Write-Output "Port $Port is open"\n    $tcp.Close()\n  } catch {\n    Write-Output "Port $Port is closed"\n  }\n}`
    }
  },

  // === 03-git: Git 操作 ===
  {
    name: 'gitlog',
    category: 'Git',
    description: 'Git 日志美化（单行）',
    body: {
      zsh: `gitlog() {\n  git log --oneline --graph --decorate --all "$@"\n}`,
      bash: `gitlog() {\n  git log --oneline --graph --decorate --all "$@"\n}`,
      powershell: `function gitlog {\n  git log --oneline --graph --decorate --all @args\n}`
    }
  },
  {
    name: 'gitgraph',
    category: 'Git',
    description: 'Git 查看分支图',
    body: {
      zsh: `gitgraph() {\n  git log --graph --oneline --all --decorate "$@"\n}`,
      bash: `gitgraph() {\n  git log --graph --oneline --all --decorate "$@"\n}`,
      powershell: `function gitgraph {\n  git log --graph --oneline --all --decorate @args\n}`
    }
  },
  {
    name: 'gbn',
    category: 'Git',
    description: '快速创建并切换到新分支',
    body: {
      zsh: `gbn() {\n  git checkout -b "$1"\n}`,
      bash: `gbn() {\n  git checkout -b "$1"\n}`,
      powershell: `function gbn {\n  param([string]$Branch)\n  git checkout -b $Branch\n}`
    }
  },

  // === 04-search: 搜索操作 ===
  {
    name: 'fif',
    category: '搜索',
    description: '递归搜索文件内容',
    body: {
      zsh: `fif() {\n  grep -r "$1" . --exclude-dir=".git" --exclude-dir="node_modules" \\\n    --exclude-dir="__pycache__" --color=always 2>/dev/null\n}`,
      bash: `fif() {\n  grep -r "$1" . --exclude-dir=".git" --exclude-dir="node_modules" \\\n    --exclude-dir="__pycache__" --color=always 2>/dev/null\n}`,
      powershell: `function fif {\n  param([string]$Pattern)\n  Get-ChildItem -Recurse -File -Exclude .git,node_modules,__pycache__ | Select-String -Pattern $Pattern\n}`
    }
  },
  {
    name: 'fn',
    category: '搜索',
    description: '搜索文件名',
    body: {
      zsh: `fn() {\n  find . -name "*$1*" 2>/dev/null\n}`,
      bash: `fn() {\n  find . -name "*$1*" 2>/dev/null\n}`,
      powershell: `function fn {\n  param([string]$Pattern)\n  Get-ChildItem -Recurse -Name "*$Pattern*" -ErrorAction SilentlyContinue\n}`
    }
  },

  // === 05-process: 进程操作 ===
  {
    name: 'psgrep',
    category: '进程',
    description: '按名称查找进程',
    body: {
      zsh: `psgrep() {\n  ps aux | grep -i "$1" | grep -v grep\n}`,
      bash: `psgrep() {\n  ps aux | grep -i "$1" | grep -v grep\n}`,
      powershell: `function psgrep {\n  param([string]$Name)\n  Get-Process | Where-Object { $_.ProcessName -like "*$Name*" } | Format-Table Id, ProcessName, CPU, WorkingSet -AutoSize\n}`
    }
  },
  {
    name: 'pskill',
    category: '进程',
    description: '按名称杀死进程',
    body: {
      zsh: `pskill() {\n  local pid\n  pid=$(psgrep "$1" | awk '{print $2}' | head -n 1)\n  if [[ -n "$pid" ]]; then\n    kill "$pid"\n    echo "Killed process $pid"\n  else\n    echo "No process found matching: $1"\n  fi\n}`,
      bash: `pskill() {\n  local pid\n  pid=$(psgrep "$1" | awk '{print $2}' | head -n 1)\n  if [[ -n "$pid" ]]; then\n    kill "$pid"\n    echo "Killed process $pid"\n  else\n    echo "No process found matching: $1"\n  fi\n}`,
      powershell: `function pskill {\n  param([string]$Name)\n  $procs = Get-Process | Where-Object { $_.ProcessName -like "*$Name*" }\n  if ($procs) {\n    $procs | Stop-Process -Force\n    Write-Output "Killed $($procs.Count) process(es) matching: $Name"\n  } else {\n    Write-Output "No process found matching: $Name"\n  }\n}`
    }
  },

  // === 06-dev: 开发工具 ===
  {
    name: 'server',
    category: '开发',
    description: '快速启动 HTTP 服务器',
    body: {
      zsh: `server() {\n  local port=\${1:-8000}\n  if command -v python3 &>/dev/null; then\n    echo "Starting HTTP server on port $port..."\n    python3 -m http.server "$port"\n  elif command -v python &>/dev/null; then\n    echo "Starting HTTP server on port $port..."\n    python -m SimpleHTTPServer "$port"\n  else\n    echo "Python not found"\n    return 1\n  fi\n}`,
      bash: `server() {\n  local port=\${1:-8000}\n  if command -v python3 &>/dev/null; then\n    echo "Starting HTTP server on port $port..."\n    python3 -m http.server "$port"\n  elif command -v python &>/dev/null; then\n    echo "Starting HTTP server on port $port..."\n    python -m SimpleHTTPServer "$port"\n  else\n    echo "Python not found"\n    return 1\n  fi\n}`,
      powershell: `function server {\n  param([int]$Port = 8000)\n  if (Get-Command python3 -ErrorAction SilentlyContinue) {\n    Write-Output "Starting HTTP server on port $Port..."\n    python3 -m http.server $Port\n  } elseif (Get-Command python -ErrorAction SilentlyContinue) {\n    Write-Output "Starting HTTP server on port $Port..."\n    python -m http.server $Port\n  } else {\n    Write-Output "Python not found"\n  }\n}`
    }
  },
  {
    name: 'jsonfmt',
    category: '开发',
    description: '显示 JSON 格式化',
    body: {
      zsh: `jsonfmt() {\n  if command -v jq &>/dev/null; then\n    jq '.' "$1"\n  elif command -v python3 &>/dev/null; then\n    python3 -m json.tool "$1"\n  else\n    echo "Neither jq nor python3 found"\n    return 1\n  fi\n}`,
      bash: `jsonfmt() {\n  if command -v jq &>/dev/null; then\n    jq '.' "$1"\n  elif command -v python3 &>/dev/null; then\n    python3 -m json.tool "$1"\n  else\n    echo "Neither jq nor python3 found"\n    return 1\n  fi\n}`,
      powershell: `function jsonfmt {\n  param([string]$File)\n  if ($File) {\n    Get-Content $File | ConvertFrom-Json | ConvertTo-Json -Depth 10\n  } else {\n    $input | ConvertFrom-Json | ConvertTo-Json -Depth 10\n  }\n}`
    }
  },

  // === 07-system: 系统信息与工具 (pathls skipped) ===
  {
    name: 'diskusage',
    category: '系统',
    description: '显示磁盘使用情况',
    body: {
      zsh: `diskusage() {\n  df -h | grep -E "Filesystem|/dev/"\n}`,
      bash: `diskusage() {\n  df -h | grep -E "Filesystem|/dev/"\n}`,
      powershell: `function diskusage {\n  Get-PSDrive -PSProvider FileSystem | Format-Table Name, @{N="Used(GB)";E={[math]::Round($_.Used/1GB,1)}}, @{N="Free(GB)";E={[math]::Round($_.Free/1GB,1)}}, @{N="Total(GB)";E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} -AutoSize\n}`
    }
  },
  {
    name: 'memusage',
    category: '系统',
    description: '显示内存使用情况',
    body: {
      zsh: `memusage() {\n  if [[ "$OSTYPE" == darwin* ]]; then\n    vm_stat | perl -ne '/page size of (\\d+)/ and $ps=$1; /Pages\\s+(.+):\\s+(\\d+)/ and printf("%-16s % 16s MB\\n", "$1:", $2*$ps/1048576);'\n  else\n    free -h\n  fi\n}`,
      bash: `memusage() {\n  if [[ "$OSTYPE" == darwin* ]]; then\n    vm_stat | perl -ne '/page size of (\\d+)/ and $ps=$1; /Pages\\s+(.+):\\s+(\\d+)/ and printf("%-16s % 16s MB\\n", "$1:", $2*$ps/1048576);'\n  else\n    free -h\n  fi\n}`,
      powershell: `function memusage {\n  $os = Get-CimInstance Win32_OperatingSystem\n  $total = [math]::Round($os.TotalVisibleMemorySize/1MB, 1)\n  $free = [math]::Round($os.FreePhysicalMemory/1MB, 1)\n  $used = [math]::Round($total - $free, 1)\n  Write-Output "Total: $total GB  Used: $used GB  Free: $free GB"\n}`
    }
  },
  {
    name: 'colors256',
    category: '系统',
    description: '显示 256 色测试',
    body: {
      zsh: `colors256() {\n  for c in {0..255}; do\n    printf "\\033[38;5;%cm %3s \\033[0m" "$c" "$c"\n    ((c % 16 == 15)) && echo\n  done\n}`,
      bash: `colors256() {\n  for c in $(seq 0 255); do\n    printf "\\033[38;5;%cm %3s \\033[0m" "$c" "$c"\n    (( c % 16 == 15 )) && echo\n  done\n}`,
      powershell: `function colors256 {\n  0..255 | ForEach-Object {\n    Write-Host -NoNewline (" {0,3} " -f $_) -ForegroundColor ($_ % 16)\n    if ($_ % 16 -eq 15) { Write-Host }\n  }\n}`
    }
  },
  {
    name: 'histgrep',
    category: '系统',
    description: '搜索命令历史',
    body: {
      zsh: `histgrep() {\n  history | grep -i "$1"\n}`,
      bash: `histgrep() {\n  history | grep -i "$1"\n}`,
      powershell: `function histgrep {\n  param([string]$Pattern)\n  Get-History | Where-Object { $_.CommandLine -match $Pattern }\n}`
    }
  },
  {
    name: 'stopwatch',
    category: '系统',
    description: '秒表（Ctrl+C 停止）',
    body: {
      zsh: `stopwatch() {\n  local begin_date=$(date +%s)\n  while true; do\n    local now=$(date +%s)\n    local elapsed=$((now - begin_date))\n    local minutes=$((elapsed / 60))\n    local seconds=$((elapsed % 60))\n    printf "\\r%02d:%02d" "$minutes" "$seconds"\n    sleep 1\n  done\n}`,
      bash: `stopwatch() {\n  local begin_date=$(date +%s)\n  while true; do\n    local now=$(date +%s)\n    local elapsed=$((now - begin_date))\n    local minutes=$((elapsed / 60))\n    local seconds=$((elapsed % 60))\n    printf "\\r%02d:%02d" "$minutes" "$seconds"\n    sleep 1\n  done\n}`,
      powershell: `function stopwatch {\n  $sw = [System.Diagnostics.Stopwatch]::StartNew()\n  try {\n    while ($true) {\n      $elapsed = $sw.Elapsed\n      Write-Host -NoNewline (\"\\r{0:d2}:{1:d2}\" -f $elapsed.Minutes, $elapsed.Seconds)\n      Start-Sleep -Seconds 1\n    }\n  } finally {\n    $sw.Stop()\n    Write-Host\n  }\n}`
    }
  },

  // === 08-archive: 压缩/解压 ===
  {
    name: 'extract',
    category: '压缩',
    description: '智能解压任意格式文件',
    body: {
      zsh: `extract() {\n  if [[ -f "$1" ]]; then\n    case "$1" in\n      *.tar.bz2)   tar xjf "$1" ;;\n      *.tar.gz)    tar xzf "$1" ;;\n      *.bz2)       bunzip2 "$1" ;;\n      *.rar)       unrar x "$1" ;;\n      *.gz)        gunzip "$1" ;;\n      *.tar)       tar xf "$1" ;;\n      *.tbz2)      tar xjf "$1" ;;\n      *.tgz)       tar xzf "$1" ;;\n      *.zip)       unzip "$1" ;;\n      *.Z)         uncompress "$1" ;;\n      *.7z)        7z x "$1" ;;\n      *)           echo "'$1' cannot be extracted via extract()" ;;\n    esac\n  else\n    echo "'$1' is not a valid file"\n  fi\n}`,
      bash: `extract() {\n  if [[ -f "$1" ]]; then\n    case "$1" in\n      *.tar.bz2)   tar xjf "$1" ;;\n      *.tar.gz)    tar xzf "$1" ;;\n      *.bz2)       bunzip2 "$1" ;;\n      *.rar)       unrar x "$1" ;;\n      *.gz)        gunzip "$1" ;;\n      *.tar)       tar xf "$1" ;;\n      *.tbz2)      tar xjf "$1" ;;\n      *.tgz)       tar xzf "$1" ;;\n      *.zip)       unzip "$1" ;;\n      *.Z)         uncompress "$1" ;;\n      *.7z)        7z x "$1" ;;\n      *)           echo "'$1' cannot be extracted via extract()" ;;\n    esac\n  else\n    echo "'$1' is not a valid file"\n  fi\n}`,
      powershell: `function extract {\n  param([string]$File)\n  if (-not (Test-Path $File)) { Write-Error "'$File' is not a valid file"; return }\n  switch -Wildcard ($File) {\n    "*.zip"    { Expand-Archive -Path $File -DestinationPath . }\n    "*.tar.gz" { tar xzf $File }\n    "*.tar.bz2" { tar xjf $File }\n    "*.tar"    { tar xf $File }\n    "*.tgz"    { tar xzf $File }\n    "*.gz"     { & gzip -d $File }\n    "*.7z"     { & 7z x $File }\n    default    { Write-Error "'$File' cannot be extracted via extract" }\n  }\n}`
    }
  },
  {
    name: 'targz',
    category: '压缩',
    description: '创建 tar.gz 压缩包',
    body: {
      zsh: `targz() {\n  tar -czf "\${1}.tar.gz" "\${1}"\n}`,
      bash: `targz() {\n  tar -czf "\${1}.tar.gz" "\${1}"\n}`,
      powershell: `function targz {\n  param([string]$Path)\n  tar -czf "$Path.tar.gz" $Path\n}`
    }
  }
]

// Read existing config
const raw = readFileSync(CONFIG_PATH, 'utf-8')
const config = JSON.parse(raw)

// Get existing function names to avoid duplicates
const existingNames = new Set(config.functions.map(f => f.name))

let added = 0
for (const fn of functions) {
  if (existingNames.has(fn.name)) {
    console.log(`SKIP: ${fn.name} (already exists)`)
    continue
  }

  const order = config.functions.length
  config.functions.push({
    id: randomUUID(),
    name: fn.name,
    category: fn.category,
    description: fn.description,
    body: fn.body,
    funcNames: { zsh: fn.name, bash: fn.name, powershell: fn.name },
    enabled: true,
    order,
    shells: ['zsh', 'bash', 'powershell']
  })
  added++
  console.log(`ADD: ${fn.name} (${fn.category})`)
}

writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
console.log(`\nDone: ${added} functions added, ${functions.length - added} skipped`)
console.log(`File size: ${(Buffer.byteLength(JSON.stringify(config, null, 2)) / 1024).toFixed(1)} KB`)
