import fs from 'node:fs'
import path from 'node:path'

export const repoRoot = process.cwd()
export const watchAssetsDir = path.join(repoRoot, 'public', 'watch-assets')
export const inboxDir = path.join(watchAssetsDir, 'inbox')
export const rawDir = path.join(watchAssetsDir, 'raw')
export const processedDir = path.join(watchAssetsDir, 'processed')
export const processedWebpDir = path.join(processedDir, 'webp')
export const intakeCsvPath = path.join(watchAssetsDir, 'intake-review.csv')
export const catalogCandidatesPath = path.join(watchAssetsDir, 'catalog-candidates.json')
export const manifestPath = path.join(processedDir, 'manifest.json')

export const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif'])

export type IntakeStatus = 'needs-review' | 'approved' | 'rejected' | 'skipped'

export type Confidence = 'high' | 'medium' | 'low' | 'unmatched'

export type IntakeRow = {
  originalFilename: string
  suggestedWatchId: string
  brand: string
  model: string
  reference: string
  confidence: Confidence
  suggestedRawFilename: string
  status: IntakeStatus | string
  notes: string
  watchType: string
  dialColor: string
  caseMaterial: string
  caseSizeMm: string
  lugWidthMm: string
  movement: string
  estimatedValue: string
  identificationSource: string
  catalogAction: string
}

export const intakeColumns: Array<keyof IntakeRow> = [
  'originalFilename',
  'suggestedWatchId',
  'brand',
  'model',
  'reference',
  'confidence',
  'suggestedRawFilename',
  'status',
  'notes',
  'watchType',
  'dialColor',
  'caseMaterial',
  'caseSizeMm',
  'lugWidthMm',
  'movement',
  'estimatedValue',
  'identificationSource',
  'catalogAction',
]

export function ensureWatchAssetDirs() {
  for (const dir of [inboxDir, rawDir, processedDir, processedWebpDir]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(repoRoot, filename)
    if (!fs.existsSync(filePath)) continue

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) continue

      const key = trimmed.slice(0, equalsIndex).trim()
      const rawValue = trimmed.slice(equalsIndex + 1).trim()
      if (!key || process.env[key]) continue

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
    }
  }
}

export function isSupportedImage(filename: string) {
  return imageExtensions.has(path.extname(filename).toLowerCase())
}

export function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function toCsv(rows: IntakeRow[]) {
  return [
    intakeColumns.join(','),
    ...rows.map(row => intakeColumns.map(column => csvEscape(row[column])).join(',')),
  ].join('\n') + '\n'
}

export function parseCsv(content: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  const [headers = [], ...dataRows] = rows.filter(values => values.some(value => value.length > 0))
  return dataRows.map(values => {
    const rowObject: Record<string, string> = {}
    headers.forEach((header, index) => {
      rowObject[header] = values[index] ?? ''
    })
    return rowObject as IntakeRow
  })
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function withoutExtension(filename: string) {
  return path.basename(filename, path.extname(filename))
}
