import { useOCLandStore } from '@renderer/stores/useOCLandStore'
import { SelectorTab as SharedSelectorTab } from '@renderer/modules/shared/launcher/SelectorTab'

export function SelectorTab(): React.ReactElement {
  const selector = useOCLandStore((s) => s.selector)
  const updateSelector = useOCLandStore((s) => s.updateSelector)

  return (
    <SharedSelectorTab
      selector={selector}
      onChange={updateSelector}
      i18nPrefix="ocLaunch"
      defaults={{ funcName: 'oc', promptTitle: '选择 opencode 供应商', localFuncName: 'ocl', kanbanFuncName: 'show-oc-usage' }}
    />
  )
}
