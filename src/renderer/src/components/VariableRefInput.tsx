import { useState, useRef, useCallback } from 'react'
import { Input, Popover, Typography, Button, Space } from 'antd'
import { FunctionOutlined } from '@ant-design/icons'
import type { ShellVariable, PathVariable } from '@shared/shell-types'
import { VariableRefDisplay } from './VariableRefDisplay'

const VAR_REF_RE = /\{\{[A-Za-z_][A-Za-z0-9_]*\}\}/

const { Text } = Typography

interface VariableRefInputProps {
  value: string
  onChange: (value: string) => void
  variables: (ShellVariable | PathVariable)[]
  placeholder?: string
  password?: boolean
  addonAfter?: React.ReactNode
}

export function VariableRefInput({
  value,
  onChange,
  variables,
  placeholder,
  password,
  addonAfter
}: VariableRefInputProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<any>(null)

  const availableVars = variables
    .filter((v) => v.key.trim() && v.enabled)
    .sort((a, b) => a.key.localeCompare(b.key))

  const insertRef = useCallback((key: string) => {
    const inputEl = inputRef.current?.input as HTMLInputElement | undefined
    const cursorPos = inputEl?.selectionStart ?? value.length
    const before = value.slice(0, cursorPos)
    const after = value.slice(cursorPos)
    onChange(before + `{{${key}}}` + after)
    setOpen(false)
    requestAnimationFrame(() => {
      if (inputEl) {
        const newPos = cursorPos + key.length + 4
        inputEl.setSelectionRange(newPos, newPos)
        inputEl.focus()
      }
    })
  }, [value, onChange])

  const content = (
    <div style={{ maxHeight: 200, overflow: 'auto', minWidth: 150 }}>
      {availableVars.length === 0 ? (
        <Text type="secondary" style={{ fontSize: 12 }}>暂无可引用的变量</Text>
      ) : (
        availableVars.map((v) => (
          <div
            key={v.id}
            onClick={() => insertRef(v.key)}
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              borderRadius: 4,
              fontSize: 13,
              fontFamily: 'monospace'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0f0')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {v.key}
          </div>
        ))
      )}
    </div>
  )

  const InputComponent = password ? Input.Password : Input
  const hasRefs = VAR_REF_RE.test(value)

  return (
    <div>
      <Space.Compact style={{ width: '100%' }}>
        <InputComponent
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ fontFamily: 'monospace' }}
        />
        <Popover
          open={open}
          onOpenChange={setOpen}
          content={content}
          title="选择变量"
          trigger="click"
          placement="bottomRight"
        >
          <Button icon={<FunctionOutlined />} />
        </Popover>
        {addonAfter}
      </Space.Compact>
      {hasRefs && (
        <div style={{ marginTop: 4, padding: '4px 0', fontSize: 12, color: '#666', lineHeight: '20px' }}>
          <span style={{ marginRight: 4 }}>预览:</span>
          <VariableRefDisplay text={value} />
        </div>
      )}
    </div>
  )
}
