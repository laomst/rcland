import { Modal } from 'antd'
import { useState } from 'react'
import { SHELL_LABELS, type ShellType } from '@shared/shell'
import { useTranslation } from 'react-i18next'

export function usePreview() {
  const { t } = useTranslation()
  const [previewShell, setPreviewShell] = useState<ShellType | null>(null)
  const [previewContent, setPreviewContent] = useState('')

  const handlePreview = async (shell: ShellType) => {
    setPreviewShell(shell)
    setPreviewContent(t('preview.loading'))
    try {
      const content = await window.electronAPI.generateAllConfig(shell)
      setPreviewContent(content)
    } catch (err) {
      setPreviewContent(t('preview.generateFailed', { error: err instanceof Error ? err.message : String(err) }))
    }
  }

  const closePreview = () => setPreviewShell(null)

  return { previewShell, previewContent, handlePreview, closePreview }
}

export interface PreviewModalProps {
  shell: ShellType | null
  content: string
  onClose: () => void
}

export function PreviewModal({ shell, content, onClose }: PreviewModalProps): React.ReactElement {
  const { t } = useTranslation()
  return (
    <Modal
      title={shell ? t('preview.title', { shell: SHELL_LABELS[shell] }) : t('preview.titleGeneric')}
      open={shell !== null}
      onCancel={onClose}
      width={720}
      footer={null}
    >
      <pre style={{
        background: '#1e1e1e',
        color: '#d4d4d4',
        padding: 16,
        borderRadius: 6,
        fontSize: 13,
        maxHeight: 480,
        overflow: 'auto'
      }}>
        {content}
      </pre>
    </Modal>
  )
}
