import { Typography } from 'antd'
import { HolderOutlined } from '@ant-design/icons'

const { Text } = Typography

export interface ItemRowProps {
  /** Optional row index number displayed outside the card */
  index?: number
  /** Whether the item is currently being dragged */
  isDragging?: boolean
  /** Whether the item is enabled (affects opacity and background) */
  enabled?: boolean
  /** Border accent color (default: '#d9d9d9') */
  borderColor?: string
  /** Custom background override */
  background?: string
  /** Drag handle props from dnd-kit or similar */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  /** Whether to show the drag handle (default: true) */
  showDragHandle?: boolean
  /** Left/center flexible content area */
  children: React.ReactNode
  /** Right-side pinned actions area (buttons, switches, selects) */
  actions: React.ReactNode
}

export function ItemRow({
  index,
  isDragging,
  enabled = true,
  borderColor = '#d9d9d9',
  background,
  dragHandleProps,
  showDragHandle = true,
  children,
  actions
}: ItemRowProps): React.ReactElement {
  const bg = background ?? (enabled ? '#f6f8fa' : '#f0f0f0')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      {index !== undefined && (
        <Text type="secondary" style={{ width: 24, textAlign: 'right', flexShrink: 0, fontSize: 12 }}>
          {index}.
        </Text>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        background: bg,
        border: `1.5px solid ${borderColor}40`,
        borderRadius: 6,
        padding: '8px 12px',
        opacity: isDragging ? 0.5 : enabled ? 1 : 0.6
      }}>
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            {...dragHandleProps}
            style={{ cursor: dragHandleProps ? 'grab' : 'default', color: '#999', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          >
            <HolderOutlined />
          </div>
        )}

        {/* Flexible content area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          {children}
        </div>

        {/* Pinned right actions */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          {actions}
        </div>
      </div>
    </div>
  )
}
