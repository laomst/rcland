# Final Review Fix Report — F1 (Silent Mis-Scoping)

## Bug

`useMachinesStore` was only hydrated when `MachinesPage` mounted. If the app opened on any other page (e.g. `/ccland`, `/cxland`), `currentMachineId` remained `null` and `machines` stayed `[]`. In `MachineScopeSelect`, picking "limited to this machine" executed `onChange(currentId ? [currentId] : [])`, which wrote `applicableMachines: []`. Because `appliesToMachine` treats an empty array as "all machines", the user silently got a global item instead of a machine-scoped one.

## Fix — Approach (a)

Added `useMachinesStore.getState().loadMachines()` inside the existing gate useEffect in `AppLayout` (`src/renderer/src/App.tsx`), called immediately when `machineStatus()` resolves with `s.claimed === true`.

Call site:
```ts
useEffect(() => {
  window.electronAPI.machineStatus().then((s) => {
    if (s.claimed) {
      useMachinesStore.getState().loadMachines()
    }
    setNeedClaim(!s.claimed)
    setClaimChecked(true)
  })
}, [])
```

This reuses the existing `machineStatus` round-trip timing and avoids adding a new hook dependency (imperative call via `.getState()`, matching the file's existing pattern for `useConfigDirtyStore.getState()`).

## Data-Flow Reasoning

On every normal startup (already-claimed machine): `machineStatus()` returns `claimed: true` → `loadMachines()` fires → store is populated with `currentMachineId` and `machines` before any route renders → `MachineScopeSelect` "limited" path writes `[currentId]` (real id) → `appliesToMachine` correctly scopes the item to this machine only.

On first-run claim: `claimed: false` → `loadMachines()` is skipped → `MachineClaimDialog` is shown → after claim, `window.location.reload()` triggers a full restart → next startup `claimed: true` → `loadMachines()` fires. Correct.

`MachinesPage`'s own `loadMachines()` call is untouched — `loadMachines` is idempotent, so double-calling on the machines page is harmless.

## Verification

- `npm run typecheck`: 0 errors
- `npm test`: 169 pass / 0 fail
