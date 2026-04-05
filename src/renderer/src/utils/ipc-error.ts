/** 从 IPC 错误消息中提取用户友好的错误信息 */
export function extractIpcErrorMessage(err: unknown): string {
  const rawMsg = err instanceof Error ? err.message : String(err)
  return rawMsg.replace(/^Error invoking remote method '[^']+': Error: /, '')
}

/** 判断是否为解密失败错误 */
export function isDecryptFailedError(err: unknown): boolean {
  return extractIpcErrorMessage(err).includes('DECRYPT_FAILED')
}

/** 判断是否为密钥缺失错误 */
export function isKeyNotFoundError(err: unknown): boolean {
  return extractIpcErrorMessage(err).includes('Key file not found')
}
