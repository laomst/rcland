import { Modal } from 'antd'
import { useState } from 'react'
import { SHELL_LABELS, type ShellType } from '@shared/shell'

export function usePreview() {
  const [previewShell, setPreviewShell] = useState<ShellType | null>(null)
  const [previewContent, setPreviewContent] = useState('')

  const handlePreview = async (shell: ShellType) => {
    setPreviewShell(shell)
    setPreviewContent('加载中...')
    try {
      const content = await window.electronAPI.generateAllConfig(shell)
      setPreviewContent(content)
    } catch (err) {
      setPreviewContent(`生成失败: ${err instanceof Error ? err.message : String(err)}`)
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
  return (
    <Modal
      title={shell ? `配置预览 — ${SHELL_LABELS[shell]}` : '配置预览'}
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
