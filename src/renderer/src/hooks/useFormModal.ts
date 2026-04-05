import { useState, useEffect } from 'react'

interface UseFormModalOptions<T> {
  initialState: T
  editingValues?: Partial<T>
  open: boolean
}

export function useFormModal<T extends Record<string, any>>({
  initialState,
  editingValues,
  open
}: UseFormModalOptions<T>) {
  const [formState, setFormState] = useState<T>(initialState)

  useEffect(() => {
    if (open) {
      setFormState(editingValues ? { ...initialState, ...editingValues } : { ...initialState })
    }
  }, [open])

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }))
  }

  const toggleShell = (shell: string, shellsField: keyof T = 'shells' as keyof T) => {
    setFormState((prev) => {
      const current = (prev[shellsField] as string[]) || []
      const next = current.includes(shell)
        ? current.filter((s) => s !== shell)
        : [...current, shell]
      return { ...prev, [shellsField]: next }
    })
  }

  const reset = () => setFormState({ ...initialState })

  return { formState, setFormState, setField, toggleShell, reset }
}
