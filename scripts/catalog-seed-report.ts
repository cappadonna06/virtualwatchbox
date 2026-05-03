import fs from 'node:fs/promises'
import path from 'node:path'
import { parseCsv, repoRoot } from './watch-image-pipeline'

const seedPath = path.join(repoRoot, 'data', 'catalog-seed-200.csv')

async function main() {
  const rows = parseCsv(await fs.readFile(seedPath, 'utf8')) as Array<Record<string, string>>
  const uniqueIds = new Set(rows.map(row => row.id))
  const withSources = rows.filter(row => row.sourceUrl).length
  const folderImageCandidates = rows.filter(row => row.communitySignal === 'folder_image_candidate').length
  const partial = rows.filter(row => row.verificationStatus === 'identity_seeded_specs_partial').length
  const pending = rows.filter(row => row.verificationStatus === 'identity_seeded_specs_pending').length

  console.log(`Seed rows: ${rows.length}`)
  console.log(`Unique ids: ${uniqueIds.size}`)
  console.log(`Rows with source URLs: ${withSources}`)
  console.log(`Folder image candidates: ${folderImageCandidates}`)
  console.log(`Partially verified rows: ${partial}`)
  console.log(`Specs pending rows: ${pending}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
