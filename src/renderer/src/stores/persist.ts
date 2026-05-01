export interface PersistQueue {
  enqueue: (save: () => Promise<void>) => Promise<void>
  getLastError: () => Error | null
  clearLastError: () => void
}

export function createPersistQueue(): PersistQueue {
  let tail = Promise.resolve()
  let lastError: Error | null = null

  return {
    enqueue(save) {
      const run = tail.then(async () => {
        try {
          await save()
          lastError = null
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err))
          throw lastError
        }
      })
      tail = run.catch(() => undefined)
      return run
    },
    getLastError() {
      return lastError
    },
    clearLastError() {
      lastError = null
    }
  }
}

export function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
