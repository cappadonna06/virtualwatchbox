import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ensureWatchAssetDirs,
  inboxDir,
  intakeCsvPath,
  parseCsv,
  rawDir,
} from './watch-image-pipeline'

function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function destinationFilename(suggestedRawFilename: string, originalFilename: string) {
  const safeBase = path.basename(suggestedRawFilename.trim())
  if (!safeBase) return ''
  return path.extname(safeBase) ? safeBase : `${safeBase}${path.extname(originalFilename).toLowerCase()}`
}

async function exists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  ensureWatchAssetDirs()

  const force = hasFlag('--force')
  const keepOriginals = hasFlag('--keep-originals')
  const content = await fs.readFile(intakeCsvPath, 'utf8')
  const rows = parseCsv(content)

  let moved = 0
  let copied = 0
  let skipped = 0
  let conflicted = 0

  for (const row of rows) {
    if (row.status.trim().toLowerCase() !== 'approved') {
      skipped += 1
      continue
    }

    const originalPath = path.join(inboxDir, path.basename(row.originalFilename))
    const filename = destinationFilename(row.suggestedRawFilename, row.originalFilename)
    if (!filename) {
      skipped += 1
      console.warn(`Skipped ${row.originalFilename}: missing suggestedRawFilename`)
      continue
    }

    const rawPath = path.join(rawDir, filename)
    if (!(await exists(originalPath))) {
      skipped += 1
      console.warn(`Skipped ${row.originalFilename}: inbox file not found`)
      continue
    }

    if (!force && await exists(rawPath)) {
      conflicted += 1
      console.warn(`Conflict ${filename}: raw file exists; pass --force to replace`)
      continue
    }

    if (force) {
      await fs.rm(rawPath, { force: true })
    }

    if (keepOriginals) {
      await fs.copyFile(originalPath, rawPath)
      copied += 1
    } else {
      await fs.rename(originalPath, rawPath)
      moved += 1
    }
  }

  console.log(`Apply intake complete: moved ${moved}, copied ${copied}, skipped ${skipped}, conflicted ${conflicted}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
