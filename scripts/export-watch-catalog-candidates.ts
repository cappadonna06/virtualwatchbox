import fs from 'node:fs/promises'
import {
  catalogCandidatesPath,
  ensureWatchAssetDirs,
  intakeCsvPath,
  parseCsv,
} from './watch-image-pipeline'

function numberOrNull(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function main() {
  ensureWatchAssetDirs()

  const rows = parseCsv(await fs.readFile(intakeCsvPath, 'utf8'))
  const candidates = rows
    .filter(row => row.status.trim().toLowerCase() === 'approved')
    .filter(row => row.catalogAction === 'new-catalog-candidate')
    .map(row => ({
      id: row.suggestedWatchId,
      brand: row.brand,
      model: row.model,
      reference: row.reference,
      caseSizeMm: numberOrNull(row.caseSizeMm),
      lugWidthMm: numberOrNull(row.lugWidthMm),
      caseMaterial: row.caseMaterial,
      dialColor: row.dialColor,
      movement: row.movement,
      complications: [],
      estimatedValue: numberOrNull(row.estimatedValue),
      dialConfig: null,
      watchType: row.watchType,
      sourceImage: row.suggestedRawFilename,
      notes: row.notes,
    }))

  await fs.writeFile(catalogCandidatesPath, JSON.stringify(candidates, null, 2) + '\n', 'utf8')
  console.log(`Exported ${candidates.length} catalog candidate${candidates.length === 1 ? '' : 's'} to public/watch-assets/catalog-candidates.json`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
