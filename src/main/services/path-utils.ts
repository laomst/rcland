import { homedir } from 'os'

export function resolveHomePath(path: string): string {
  return path.replace(/^~(?=$|[/\\])/, homedir())
}
