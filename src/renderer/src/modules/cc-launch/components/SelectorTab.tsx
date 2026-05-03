import { useCCLaunchStore } from '@renderer/stores/useCCLaunchStore'
import { SelectorTab as SharedSelectorTab } from '@renderer/modules/shared/launcher/SelectorTab'

export function SelectorTab(): React.ReactElement {
  const selector = useCCLaunchStore((s) => s.selector)
  const updateSelector = useCCLaunchStore((s) => s.updateSelector)

  return (
    <SharedSelectorTab
      selector={selector}
      onChange={updateSelector}
      i18nPrefix="ccLaunch"
      defaults={{ funcName: 'cc', promptTitle: '选择启动器', localFuncName: 'ccl', kanbanFuncName: 'show-cc-usage' }}
    />
  )
}
