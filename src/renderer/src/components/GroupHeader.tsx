import { Button, Typography } from 'antd'
import { PlusOutlined, DownOutlined, RightOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

interface GroupHeaderProps {
  title: string
  count: number
  collapsed?: boolean
  onToggle?: () => void
  onAdd?: () => void
  style?: React.CSSProperties
}

export function GroupHeader({ title, count, collapsed, onToggle, onAdd, style }: GroupHeaderProps): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: collapsed ? 0 : 8, ...style }}>
      <Text
        strong
        style={{ fontSize: 14, cursor: onToggle ? 'pointer' : undefined, userSelect: 'none' }}
        onClick={onToggle}
      >
        {onToggle && (collapsed ? <RightOutlined style={{ fontSize: 10, marginRight: 6 }} /> : <DownOutlined style={{ fontSize: 10, marginRight: 6 }} />)}
        {title} ({count})
      </Text>
      {onAdd && !collapsed && (
        <Button type="link" size="small" icon={<PlusOutlined />} onClick={onAdd} style={{ marginLeft: 8 }}>
          {t('common.add')}
        </Button>
      )}
    </div>
  )
}
