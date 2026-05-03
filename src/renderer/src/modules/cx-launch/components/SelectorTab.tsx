import { useCXLandStore } from '@renderer/stores/useCXLandStore'
import { SelectorTab as SharedSelectorTab } from '@renderer/modules/shared/launcher/SelectorTab'

export function SelectorTab(): React.ReactElement {
  const selector = useCXLandStore((s) => s.selector)
  const updateSelector = useCXLandStore((s) => s.updateSelector)

  return (
    <SharedSelectorTab
      selector={selector}
      onChange={updateSelector}
      i18nPrefix="cxLaunch"
      defaults={{ funcName: 'cx', promptTitle: '选择 Codex 供应商', localFuncName: 'cxl', kanbanFuncName: 'show-cx-usage' }}
    />
  )
}
