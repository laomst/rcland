import { Tag } from 'antd'

const VAR_REF_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g

interface VariableRefDisplayProps {
  text: string
  maxLength?: number
  style?: React.CSSProperties
}

export function VariableRefDisplay({ text, maxLength, style }: VariableRefDisplayProps): React.ReactElement {
  const truncated = maxLength && text.length > maxLength
    ? text.slice(0, maxLength) + '...'
    : text

  const parts = splitWithRefs(truncated)

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap', overflow: 'hidden', ...style }}>
      {parts.map((part, i) =>
        part.type === 'ref'
          ? <Tag key={i} color="blue" style={{ fontSize: 11, lineHeight: '18px', padding: '0 4px', margin: 0 }}>{part.text}</Tag>
          : <span key={i}>{part.text}</span>
      )}
    </span>
  )
}

interface TextPart {
  type: 'text' | 'ref'
  text: string
}

function splitWithRefs(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  const re = new RegExp(VAR_REF_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ type: 'text', text: text.slice(last, match.index) })
    }
    parts.push({ type: 'ref', text: match[1] })
    last = re.lastIndex
  }
  if (last < text.length) {
    parts.push({ type: 'text', text: text.slice(last) })
  }
  if (parts.length === 0) {
    parts.push({ type: 'text', text: '' })
  }
  return parts
}
