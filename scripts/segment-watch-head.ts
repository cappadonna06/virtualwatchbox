import sharp from 'sharp'

const SAM3_VERSION = '1bf97763d5dfd3a1584adca913a8ef4b43c684fca97e04e39e4c50a3a5e09650'
const API = 'https://api.replicate.com/v1/predictions'

interface Prediction {
  id: string
  status: string
  output?: { results?: string[] }
  error?: string
}

interface SamResult {
  boxes: number[][]
  scores: number[]
  masks: number[][][][]
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(65_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  return response.json() as Promise<T>
}

export async function segmentWatchHead(image: Buffer, token: string): Promise<{ cutout: Buffer; confidence: number }> {
  const { data: pixels, info: { width, height } } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const middle = Math.round(height / 2)
  let left = 0
  let right = width - 1
  while (left < right && pixels[(middle * width + left) * 4 + 3] < 100) left += 1
  while (right > left && pixels[(middle * width + right) * 4 + 3] < 100) right -= 1
  const bodyWidth = right - left + 1
  if (bodyWidth < width * 0.4) throw new Error('Source has no wide, front-facing watch body near the center')
  const centerX = (left + right) / 2 / width
  const expectedHeight = Math.min(0.83, bodyWidth * 1.14 / height)
  const box = [centerX, 0.49, Math.min(0.98, bodyWidth * 1.04 / width), expectedHeight]
  const negative_points = [[centerX, 0.10], [centerX, 0.89]]
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const png = await sharp(image).png().toBuffer()
  const input = {
    image: `data:image/png;base64,${png.toString('base64')}`,
    prompts: [
      { text: 'watch case', positive_boxes: [box], negative_points },
      { text: 'watch head', positive_boxes: [box], negative_points },
      { positive_boxes: [box], positive_points: [[centerX, 0.49], [0.20, 0.48], [0.75, 0.48]], negative_points },
      { positive_boxes: [box], positive_points: [[centerX, 0.49]],
        negative_boxes: [[centerX, 0.10, 0.4, 0.18], [centerX, 0.90, 0.4, 0.18]] },
    ].map(prompt => JSON.stringify(prompt)),
    confidence_threshold: 0.35,
  }
  let prediction = await fetchJson<Prediction>(API, {
    method: 'POST',
    headers: { ...headers, Prefer: 'wait=45' },
    body: JSON.stringify({ version: process.env.REPLICATE_SEGMENT_VERSION || SAM3_VERSION, input }),
  })
  const deadline = Date.now() + 120_000
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    if (Date.now() > deadline) throw new Error('SAM 3 prediction timed out')
    await new Promise(resolve => setTimeout(resolve, 2000))
    prediction = await fetchJson<Prediction>(`${API}/${prediction.id}`, { headers })
  }
  if (prediction.status !== 'succeeded' || !prediction.output?.results?.length) {
    throw new Error(prediction.error || `SAM 3 returned ${prediction.status} without masks`)
  }
  const results = await Promise.all(prediction.output.results.map(url => fetchJson<SamResult>(url)))
  return applyWatchHeadMasks(image, results)
}

export async function applyWatchHeadMasks(image: Buffer, results: SamResult[]): Promise<{ cutout: Buffer; confidence: number }> {
  const { data: pixels, info: { width, height } } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const midRow = pixels.subarray(Math.floor(height / 2) * width * 4, (Math.floor(height / 2) + 1) * width * 4)
  const bodyWidth = Array.from({ length: width }, (_, x) => midRow[x * 4 + 3]).filter(alpha => alpha > 100).length
  const candidates = results.flatMap(result => result.boxes.map(([x1, y1, x2, y2], index) => ({
    x1, y1, x2, y2, confidence: result.scores[index], mask: result.masks[index]?.[0],
  }))).filter(({ x1, y1, x2, y2, mask }) =>
    mask?.length === height && mask[0]?.length === width &&
    x2 - x1 >= bodyWidth * 0.75 && y2 - y1 >= bodyWidth * 0.7 &&
    y1 >= height * 0.12 && y2 <= height * 0.87,
  )
  const ranked = candidates.map(candidate => {
    const alpha = Buffer.from(candidate.mask.flat().map(value => value ? 255 : 0))
    const exterior = findExterior(alpha, width, height)
    const centerX = (candidate.x1 + candidate.x2) / 2
    const centerY = (candidate.y1 + candidate.y2) / 2
    const centerRow = Math.round(centerY)
    const centerColumn = Math.round(centerX)
    const probe = Math.round(bodyWidth * 0.35)
    const gaps = [
      exterior[(centerRow - probe) * width + centerColumn],
      exterior[(centerRow + probe) * width + centerColumn],
      exterior[centerRow * width + centerColumn],
    ].reduce((sum, value) => sum + (value ?? 1), 0)
    return { ...candidate, centerX, centerY, exterior, rank: candidate.confidence - gaps * 0.22 }
  })
  const selected = ranked.sort((a, b) => b.rank - a.rank)[0]
  if (!selected) throw new Error('SAM 3 found no case-sized mask that excluded the ends of the band')

  const { centerX, centerY, exterior } = selected
  const halfHeight = (selected.y2 - selected.y1) / 2
  const dialRadius = bodyWidth * 0.39

  // Restore the real dial through openings in a bezel-only mask. Only the
  // narrow center strip restores the full silhouette, including the crown.
  for (let y = 0; y < height; y += 1) {
    if (Math.abs(y - centerY) <= halfHeight * 0.44) continue
    const dialHalfWidth = Math.sqrt(Math.max(0, dialRadius ** 2 - (y - centerY) ** 2))
    for (let x = 0; x < width; x += 1) {
      if (exterior[y * width + x] && Math.abs(x - centerX) >= dialHalfWidth) {
        pixels[(y * width + x) * 4 + 3] = 0
      }
    }
  }
  const cutout = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer()
  return { cutout, confidence: selected.confidence }
}

function findExterior(mask: Buffer, width: number, height: number): Uint8Array {
  const visited = new Uint8Array(mask.length)
  const queue = new Uint32Array(mask.length)
  let length = 0
  const visit = (index: number) => {
    if (visited[index] || mask[index] > 127) return
    visited[index] = 1
    queue[length] = index
    length += 1
  }
  for (let x = 0; x < width; x += 1) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(y * width)
    visit(y * width + width - 1)
  }
  for (let read = 0; read < length; read += 1) {
    const index = queue[read]
    if (index % width > 0) visit(index - 1)
    if (index % width < width - 1) visit(index + 1)
    if (index >= width) visit(index - width)
    if (index < mask.length - width) visit(index + width)
  }
  return visited
}
