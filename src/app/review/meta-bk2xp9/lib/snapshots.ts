import { readFile } from 'fs/promises'
import { join } from 'path'

export type SnapshotFile = {
  captured_at: string
  endpoint: string
  merchant: string
  http_status?: number
  response: unknown
}

const SNAPSHOT_DIR = join(
  process.cwd(),
  'src',
  'app',
  'review',
  'meta-bk2xp9',
  'fallback-snapshots',
)

export async function loadSnapshot(
  permission: string,
): Promise<SnapshotFile | null> {
  try {
    const raw = await readFile(join(SNAPSHOT_DIR, `${permission}.json`), 'utf8')
    return JSON.parse(raw) as SnapshotFile
  } catch {
    return null
  }
}
