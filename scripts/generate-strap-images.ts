/**
 * generate-strap-images.ts — photorealistic strap image pipeline (Delugs catalog style)
 * ---------------------------------------------------------------------------------------
 * Produces ONE transparent 1000x1200 master PNG per strap template. The Strap Drawer uses
 * it vertically; the future Strap Studio rotates it 90deg via CSS. Output is uploaded to the
 * Supabase Storage bucket `strap-images` at `strap-templates/<name>.webp` (compact WebP; local
 * scratch stays PNG for the inpaint step) and recorded in
 * `data/strap-templates.json`.
 *
 * GENERATION BACKEND: Google Gemini 2.5 Flash Image ("Nano Banana") via the REST API, called
 * with raw fetch (matches the repo's no-SDK convention). NOTE: the image model is NOT on the
 * Gemini free tier (free limit = 0); the project must have billing enabled. Cost is ~$0.039
 * per image (~$0.78 for the 20-strap Tier 1 set).
 *
 * HYBRID REFERENCES: where a real Delugs/maker reference photo exists under public/demo-bands/
 * it is passed as inline image input so Gemini matches the exact layout, buckle and lighting;
 * the remaining straps are pure text-to-image.
 *
 * POST-PROCESS: Gemini returns an opaque white-background image (no transparent-bg option), so
 * every result is run through ML background removal (reusing lib/imageProcessing.ts), trimmed
 * to alpha bounds, given a soft contact shadow, and centered on a 1000x1200 transparent canvas.
 *
 * USAGE:
 *   npx tsx scripts/generate-strap-images.ts --tier 1           # generate + upload all Tier 1
 *   npx tsx scripts/generate-strap-images.ts --only leather-smooth-cognac --no-upload
 *   npx tsx scripts/generate-strap-images.ts --tier 1 --dry-run # print prompts, no API calls
 *   npx tsx scripts/generate-strap-images.ts --process-only     # skip gen; ingest public/strap-assets/raw/<name>.{png,jpg,webp}
 *   npx tsx scripts/generate-strap-images.ts --tier 1 --force   # re-generate even if already uploaded
 *
 * ENV (.env.local / .env):
 *   GEMINI_API_KEY (or GOOGLE_API_KEY)   — billing-enabled Gemini project key
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY (service role)
 *
 * ALTERNATIVE GENERATION APPROACHES (documented for future contributors; not built here):
 *   ALT 1 — Vendor partner photography (best quality). Reach out to Delugs / Barton /
 *           Crown & Buckle as affiliate partners; most provide product images. Real product
 *           photography always beats AI for catalog quality. Drop their PNGs into
 *           public/strap-assets/raw/ and run with --process-only.
 *   ALT 2 — Blender 3D rendering (best consistency). Model 5 base geometries (two-piece, NATO,
 *           oyster, jubilee, milanese) with parametric lug width; render each material x color x
 *           lug combo. One-time setup, infinite variants. Requires a 3D artist.
 *   ALT 3 — Physical photography (best authenticity). Photograph real straps flat on a
 *           controlled background, rembg for cutout. Best for users contributing their own
 *           strap photos (future feature). Also feeds --process-only.
 */

import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  applyMlBackgroundRemoval,
  cropToAlphaBounds,
  sampleEdgeBackground,
  removeConnectedEdgeBackground,
} from '../lib/imageProcessing'

// ---------------------------------------------------------------------------
// Env loading (mirrors scripts/watch-image-pipeline.ts loadLocalEnv)
// ---------------------------------------------------------------------------
const ROOT = process.cwd()

function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, filename)
    if (!fs.existsSync(filePath)) continue
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!key || process.env[key]) continue
      process.env[key] = val.replace(/^['"]|['"]$/g, '')
    }
  }
}
loadLocalEnv()

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const ARGV = process.argv.slice(2)
function flagValue(name: string): string | undefined {
  const i = ARGV.indexOf(name)
  return i >= 0 ? ARGV[i + 1] : undefined
}
const TIER = Number(flagValue('--tier') ?? '1')
const ONLY = flagValue('--only')
const DRY_RUN = ARGV.includes('--dry-run')
const NO_UPLOAD = ARGV.includes('--no-upload')
const PROCESS_ONLY = ARGV.includes('--process-only')
const UPLOAD_EXISTING = ARGV.includes('--upload-existing') // upload the current processed PNGs as-is, no generation
const FORCE = ARGV.includes('--force')
// 'white' (default) composites onto a solid white canvas — robust, no transparency artifacts
// inside the buckle frame / punch holes. 'transparent' uses ML background removal (for the
// future Strap Studio, where the master sits on a dark surface).
const BG = (flagValue('--bg') ?? 'white') as 'white' | 'transparent'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

const BUCKET = 'strap-images'
const DEMO_BANDS_DIR = path.join(ROOT, 'public', 'demo-bands')
const RAW_DIR = path.join(ROOT, 'public', 'strap-assets', 'raw')
const PROCESSED_DIR = path.join(ROOT, 'public', 'strap-assets', 'processed')
const MANIFEST_PATH = path.join(ROOT, 'data', 'strap-templates.json')

const OUT_W = 1000
const OUT_H = 1200
const CONTENT_W = 900 // ~5% margin each side
const CONTENT_H = 1080

// ---------------------------------------------------------------------------
// Strap taxonomy + prompt vocabulary (aligned with lib/strapDrawer/constants.ts)
// ---------------------------------------------------------------------------
const COLOR_LITERAL: Record<string, string> = {
  Black: 'deep matte black',
  'Dark Brown': 'rich dark espresso brown',
  Brown: 'medium walnut brown',
  Cognac: 'warm cognac honey brown',
  Tan: 'pale tan beige',
  Navy: 'deep midnight navy blue',
  Olive: 'muted olive military green',
  Orange: 'vibrant safety orange',
  Grey: 'neutral mid-grey',
  Burgundy: 'deep burgundy oxblood red',
  Blue: 'rich royal blue',
}

type KindKey =
  | 'leather-smooth'
  | 'leather-shell-cordovan'
  | 'leather-alligator'
  | 'leather-suede'
  | 'leather-pebbled'
  | 'fabric-sailcloth'
  | 'rubber-tropical'
  | 'rubber-tread'

type Kind = {
  descriptor: string
  texture: string
  stitch: boolean
  singlePiece: boolean
  bracelet?: boolean
  clasp?: 'pin' | 'deployant' // two-piece closure; defaults to pin buckle
}

const KINDS: Record<KindKey, Kind> = {
  'leather-smooth': {
    descriptor: 'Italian calfskin leather watch strap with a smooth grain finish and a slight natural sheen',
    texture: 'The smooth leather surface shows subtle natural grain and soft, even highlights',
    stitch: true,
    singlePiece: false,
  },
  'leather-shell-cordovan': {
    descriptor: 'shell cordovan leather watch strap with a deep glossy lustre and a smooth, tight, non-porous surface',
    texture: 'The shell cordovan shows a rich, glassy sheen with smooth tight grain and soft rolling highlights',
    stitch: true,
    singlePiece: false,
  },
  'leather-alligator': {
    descriptor:
      'genuine alligator leather watch strap with a prominent square tile scale pattern down the tongue and smaller rounded scales near the buckle end',
    texture: 'The raised alligator scales are crisp and clearly defined with soft specular highlights',
    stitch: true,
    singlePiece: false,
  },
  'leather-suede': {
    descriptor: 'suede leather watch strap with a soft, heavily napped matte surface',
    texture:
      'The surface is unmistakably suede: a soft, velvety, fuzzy matte nap with fine directional brushing and faint tonal nap-streaks, completely flat and non-reflective with absolutely no gloss or smooth grain',
    stitch: true,
    singlePiece: false,
  },
  'leather-pebbled': {
    descriptor: 'pebbled-grain leather watch strap with a soft, rounded pebble texture and a low satin sheen',
    texture: 'The pebbled grain shows soft, evenly distributed rounded bumps catching gentle highlights',
    stitch: true,
    singlePiece: false,
  },
  'fabric-sailcloth': {
    descriptor: 'woven sailcloth fabric watch strap with a fine basketweave texture and visible leather backing at the edges',
    texture: 'The technical sailcloth shows a fine, regular basketweave with a subtle matte sheen',
    stitch: true,
    singlePiece: false,
  },
  'rubber-tropical': {
    descriptor: 'molded FKM tropical-style rubber watch strap with a fine pin-grain texture and a matte finish',
    texture: 'The matte rubber shows a fine even pin-grain micro-texture, no gloss',
    stitch: false,
    singlePiece: false,
    clasp: 'deployant',
  },
  'rubber-tread': {
    descriptor: 'molded rubber watch strap with a structured tread pattern and a matte finish',
    texture: 'The rubber shows a regular structured tread/waffle pattern with a matte finish',
    stitch: false,
    singlePiece: false,
    clasp: 'deployant',
  },
}

// Demo-band reference filenames under public/demo-bands/
const REF = {
  shellBlack: 'Shell_Cordovan_Black_Slim_1_1220x1525_crop_center.webp',
  shellCognac: 'Shell_Cordovan_Cognac_Slim_1_1220x1525_crop_center.webp',
  alligatorBlack: 'AlligatorMatteBlackSignature_1_75594cf5-f087-4546-91fe-b499c8a53332_1220x1525_crop_center.webp',
  alligatorMahogany:
    'AlligatorMatteMahoganySignature_1_36c50765-d382-4694-95b1-677dc095adcb_1220x1525_crop_center.webp',
  rubberBlack: 'BlackSICTSRubberStrap_7eefbdef-74d9-48d5-88ce-ef6b6bd88bf8_1220x1525_crop_center.webp',
  rubberOlive: 'CTSRubberStrap_OliveGreen_1220x1525_crop_center.webp',
  sailclothNavy: 'Navy_Sailcloth_1220x1525_crop_center.webp',
  sailclothOlive: 'Olive_Green_Sailcloth_1220x1525_crop_center.webp',
  // matte smooth calfskin (better "smooth" ref than the glossy shell cordovan)
  buttero: 'ButteroChesnutSlim_1_203a1c8d-df19-48ed-a77a-4af98dd6a89d_1220x1525_crop_center.webp',
  nubuck: 'NubuckLightGreySlim_1_1_1220x1525_crop_center.webp', // napped suede/nubuck
  pebble: 'Tan_Pebble_Grain_Calfskin.webp',
} as const

type StrapDef = {
  name: string // slug + filename + template id
  kind: KindKey
  material: string
  subMaterial: string
  color: string
  colorHex: string
  style: string
  tier: number
  reference?: string // filename under public/demo-bands
  recolor?: boolean // reference is a different colour than this strap
  mirrorRef?: boolean // reference has its buckle-half on the LEFT; flip it so output is buckle-right
}

const STRAPS: StrapDef[] = [
  // ---- Leather: Smooth calfskin (9) ----
  { name: 'leather-smooth-black', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Black', colorHex: '#1A1410', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-dark-brown', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Dark Brown', colorHex: '#3A2418', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-brown', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Brown', colorHex: '#6A4426', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-cognac', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Cognac', colorHex: '#8A4B24', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-tan', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Tan', colorHex: '#B08552', style: 'casual', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-navy', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Navy', colorHex: '#2A3550', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-olive', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Olive', colorHex: '#44523B', style: 'casual', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-grey', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Grey', colorHex: '#6E6A63', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },
  { name: 'leather-smooth-burgundy', kind: 'leather-smooth', material: 'leather', subMaterial: 'Smooth', color: 'Burgundy', colorHex: '#5A2A2E', style: 'dressy', tier: 1, reference: REF.buttero, recolor: true },

  // ---- Leather: Shell Cordovan (4) — exact colour match on black/cognac refs ----
  { name: 'leather-shell-cordovan-black', kind: 'leather-shell-cordovan', material: 'leather', subMaterial: 'Shell Cordovan', color: 'Black', colorHex: '#1A1410', style: 'dressy', tier: 1, reference: REF.shellBlack },
  { name: 'leather-shell-cordovan-cognac', kind: 'leather-shell-cordovan', material: 'leather', subMaterial: 'Shell Cordovan', color: 'Cognac', colorHex: '#8A4B24', style: 'dressy', tier: 1, reference: REF.shellCognac },
  { name: 'leather-shell-cordovan-burgundy', kind: 'leather-shell-cordovan', material: 'leather', subMaterial: 'Shell Cordovan', color: 'Burgundy', colorHex: '#5A2A2E', style: 'dressy', tier: 1, reference: REF.shellCognac, recolor: true },
  { name: 'leather-shell-cordovan-navy', kind: 'leather-shell-cordovan', material: 'leather', subMaterial: 'Shell Cordovan', color: 'Navy', colorHex: '#2A3550', style: 'dressy', tier: 1, reference: REF.shellBlack, recolor: true },

  // ---- Leather: Alligator (7) — exact on black/dark-brown refs ----
  { name: 'leather-alligator-black', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Black', colorHex: '#1A1410', style: 'dressy', tier: 1, reference: REF.alligatorBlack },
  { name: 'leather-alligator-dark-brown', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Dark Brown', colorHex: '#3A2418', style: 'dressy', tier: 1, reference: REF.alligatorMahogany },
  { name: 'leather-alligator-brown', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Brown', colorHex: '#6A4426', style: 'dressy', tier: 1, reference: REF.alligatorMahogany, recolor: true },
  { name: 'leather-alligator-cognac', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Cognac', colorHex: '#8A4B24', style: 'dressy', tier: 1, reference: REF.alligatorMahogany, recolor: true },
  { name: 'leather-alligator-navy', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Navy', colorHex: '#2A3550', style: 'dressy', tier: 1, reference: REF.alligatorMahogany, recolor: true },
  { name: 'leather-alligator-burgundy', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Burgundy', colorHex: '#5A2A2E', style: 'dressy', tier: 1, reference: REF.alligatorMahogany, recolor: true },
  { name: 'leather-alligator-grey', kind: 'leather-alligator', material: 'leather', subMaterial: 'Alligator', color: 'Grey', colorHex: '#6E6A63', style: 'dressy', tier: 1, reference: REF.alligatorMahogany, recolor: true },

  // ---- Leather: Suede (4) — shape from a smooth ref, suede texture via prompt ----
  { name: 'leather-suede-brown', kind: 'leather-suede', material: 'leather', subMaterial: 'Suede', color: 'Brown', colorHex: '#6A4426', style: 'casual', tier: 1, reference: REF.nubuck, recolor: true },
  { name: 'leather-suede-tan', kind: 'leather-suede', material: 'leather', subMaterial: 'Suede', color: 'Tan', colorHex: '#B08552', style: 'casual', tier: 1, reference: REF.nubuck, recolor: true },
  { name: 'leather-suede-grey', kind: 'leather-suede', material: 'leather', subMaterial: 'Suede', color: 'Grey', colorHex: '#6E6A63', style: 'casual', tier: 1, reference: REF.nubuck },
  { name: 'leather-suede-navy', kind: 'leather-suede', material: 'leather', subMaterial: 'Suede', color: 'Navy', colorHex: '#2A3550', style: 'casual', tier: 1, reference: REF.nubuck, recolor: true },

  // ---- Leather: Pebbled (3) — pebble-grain texture ref (tan); ref is buckle-LEFT, so mirror it ----
  { name: 'leather-pebbled-black', kind: 'leather-pebbled', material: 'leather', subMaterial: 'Pebbled', color: 'Black', colorHex: '#1A1410', style: 'casual', tier: 1, reference: REF.pebble, recolor: true, mirrorRef: true },
  { name: 'leather-pebbled-brown', kind: 'leather-pebbled', material: 'leather', subMaterial: 'Pebbled', color: 'Brown', colorHex: '#6A4426', style: 'casual', tier: 1, reference: REF.pebble, recolor: true, mirrorRef: true },
  { name: 'leather-pebbled-navy', kind: 'leather-pebbled', material: 'leather', subMaterial: 'Pebbled', color: 'Navy', colorHex: '#2A3550', style: 'casual', tier: 1, reference: REF.pebble, recolor: true, mirrorRef: true },

  // ---- Fabric: Sailcloth (5) — exact on navy/olive refs ----
  { name: 'fabric-sailcloth-black', kind: 'fabric-sailcloth', material: 'fabric', subMaterial: 'Sailcloth', color: 'Black', colorHex: '#1A1410', style: 'sporty', tier: 1, reference: REF.sailclothNavy, recolor: true },
  { name: 'fabric-sailcloth-navy', kind: 'fabric-sailcloth', material: 'fabric', subMaterial: 'Sailcloth', color: 'Navy', colorHex: '#2A3550', style: 'sporty', tier: 1, reference: REF.sailclothNavy },
  { name: 'fabric-sailcloth-olive', kind: 'fabric-sailcloth', material: 'fabric', subMaterial: 'Sailcloth', color: 'Olive', colorHex: '#44523B', style: 'sporty', tier: 1, reference: REF.sailclothOlive },
  { name: 'fabric-sailcloth-grey', kind: 'fabric-sailcloth', material: 'fabric', subMaterial: 'Sailcloth', color: 'Grey', colorHex: '#6E6A63', style: 'sporty', tier: 1, reference: REF.sailclothNavy, recolor: true },
  { name: 'fabric-sailcloth-brown', kind: 'fabric-sailcloth', material: 'fabric', subMaterial: 'Sailcloth', color: 'Brown', colorHex: '#6A4426', style: 'sporty', tier: 1, reference: REF.sailclothOlive, recolor: true },

  // ---- Rubber: Tropic (6) — exact on black/olive refs ----
  { name: 'rubber-tropical-black', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Black', colorHex: '#1A1410', style: 'sporty', tier: 1, reference: REF.rubberBlack },
  { name: 'rubber-tropical-navy', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Navy', colorHex: '#2A3550', style: 'sporty', tier: 1, reference: REF.rubberOlive, recolor: true },
  { name: 'rubber-tropical-orange', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Orange', colorHex: '#C8581C', style: 'sporty', tier: 1, reference: REF.rubberOlive, recolor: true },
  { name: 'rubber-tropical-grey', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Grey', colorHex: '#6E6A63', style: 'sporty', tier: 1, reference: REF.rubberOlive, recolor: true },
  { name: 'rubber-tropical-olive', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Olive', colorHex: '#44523B', style: 'sporty', tier: 1, reference: REF.rubberOlive },
  { name: 'rubber-tropical-blue', kind: 'rubber-tropical', material: 'rubber', subMaterial: 'Tropic', color: 'Blue', colorHex: '#2E4C8A', style: 'sporty', tier: 1, reference: REF.rubberOlive, recolor: true },

  // ---- Rubber: Tread (2) ----
  { name: 'rubber-tread-black', kind: 'rubber-tread', material: 'rubber', subMaterial: 'Tread', color: 'Black', colorHex: '#1A1410', style: 'sporty', tier: 1, reference: REF.rubberBlack, recolor: true },
  { name: 'rubber-tread-grey', kind: 'rubber-tread', material: 'rubber', subMaterial: 'Tread', color: 'Grey', colorHex: '#6E6A63', style: 'sporty', tier: 1, reference: REF.rubberOlive, recolor: true },
]

// Sample set for the review preview (one per material family + sub-material branch)
const SAMPLE_NAMES = [
  'leather-smooth-cognac',
  'leather-suede-brown',
  'leather-pebbled-brown',
  'fabric-sailcloth-navy',
  'rubber-tropical-black',
]

function stitchColorFor(color: string): string {
  if (color === 'Tan') return 'natural ecru'
  if (color === 'Cognac') return 'tonal cognac'
  if (color === 'Bond') return 'tonal black'
  return `tonal ${color.toLowerCase()}`
}

function buildPrompt(def: StrapDef): string {
  const kind = KINDS[def.kind]
  const colorLit = COLOR_LITERAL[def.color] ?? def.color.toLowerCase()
  // Bracelet descriptors already specify the steel finish; prefixing the colour literal
  // would double "stainless steel". Leather/rubber/nylon/fabric need the colour up front.
  const matColor = kind.bracelet ? kind.descriptor : `${colorLit} ${kind.descriptor}`

  let layout: string
  if (kind.bracelet) {
    layout =
      'The bracelet is shown as a single continuous piece, laid flat and perfectly vertical, photographed from directly above, with the folding clasp near the top of the frame and the end-links at the bottom.'
  } else if (kind.singlePiece) {
    layout =
      'The strap is shown as a single continuous pass-through nylon band, laid flat and perfectly vertical, photographed from directly above, with the polished pin buckle and two sliding keepers near the top and the long tail extending straight down.'
  } else {
    const claspText =
      kind.clasp === 'deployant'
        ? 'The right (buckle) half is shorter and ends in a brushed stainless steel folding deployant clasp at its LOWER end, with slightly curved fitted strap ends.'
        : 'The right (buckle) half is shorter and has a single polished stainless steel pin buckle fitted at its LOWER end, with the strap threaded through it and the buckle frame oriented downward.'
    layout =
      `Replicate the classic two-piece watch strap composition EXACTLY: two separate strap halves laid flat, photographed straight from directly above, both fully visible, vertical, parallel, evenly spaced and centered in the frame, separated by roughly 30% of the frame width. The LEFT half is the long tongue: it tapers to a rounded point and carries the row of adjustment holes in its lower third. ${claspText} BOTH halves must be present and complete in the same image — never a single strip, never omit the buckle/clasp, never place the buckle at the top.`
  }

  const stitchClause = kind.stitch
    ? `Visible ${stitchColorFor(def.color)} contrast stitching runs cleanly along both long edges.`
    : ''

  let refClause = ''
  if (def.reference) {
    const lock = def.recolor
      ? `Reproduce the reference image's EXACT composition, layout, framing, scale, centering, proportions, number of pieces, and buckle/clasp type AND position; change ONLY the surface material and colour to a ${colorLit} ${def.material} ${def.subMaterial.toLowerCase()} finish. Do not add or remove pieces, do not move or reorient the buckle.`
      : `Match the reference image's exact composition, layout, framing, scale, centering, proportions, buckle/clasp type and position.`
    // The Delugs/maker references carry an embossed brand logo on the buckle — must NOT be copied.
    refClause = `${lock} IMPORTANT: ignore and do not reproduce any brand logo, engraving, initial or marking from the reference's buckle or strap — render a completely plain, blank, unbranded buckle.`
  }

  return [
    `Professional product photography of a single ${matColor}, top-down studio shot on a pure solid white background (RGB 255,255,255), evenly lit with soft warm-neutral top lighting, no gradient, no visible surface, no props.`,
    layout,
    `${kind.texture}.`,
    stitchClause,
    refClause,
    'Add only a soft, subtle contact shadow directly beneath the strap; do NOT add any other shadow, smudge, mark, vignette or tint anywhere in the corners or background — the background stays clean pure white. Sharp focus, high resolution, true-to-life colour.',
    'CRITICAL: the buckle and all hardware must be completely smooth, plain, blank and unbranded. Many reference straps carry a small maker logo engraved on the buckle face — you must NOT reproduce it. Render the buckle face entirely empty: absolutely no engraved or embossed logo, brand name, letter, initial, number, symbol, dot or text anywhere on the buckle, hardware or strap.',
    'No people, no wrist, no watch case, no extra objects.',
    'Photorealistic catalog-quality product image in the clean studio style of premium watch strap retailers. Portrait orientation, roughly 5:6 aspect ratio.',
  ]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// Gemini generation (raw fetch)
// ---------------------------------------------------------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function refMime(file: string): string {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.webp') return 'image/webp'
  if (ext === '.png') return 'image/png'
  return 'image/jpeg'
}

async function geminiGenerate(prompt: string, ref?: { buffer: Buffer; mime: string }): Promise<Buffer> {
  const parts: Array<Record<string, unknown>> = []
  if (ref) parts.push({ inlineData: { mimeType: ref.mime, data: ref.buffer.toString('base64') } })
  parts.push({ text: prompt })
  const body = JSON.stringify({ contents: [{ parts }] })
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

  const MAX_ATTEMPTS = 5
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (res.status === 429 || res.status >= 500) {
      const text = await res.text()
      const retryMatch = text.match(/"retryDelay":\s*"(\d+)s"/)
      const wait = retryMatch ? Number(retryMatch[1]) * 1000 + 1000 : Math.min(60000, 2000 * 2 ** (attempt - 1))
      if (attempt === MAX_ATTEMPTS) {
        if (/limit:\s*0/.test(text)) {
          throw new Error(
            'Gemini image model is unavailable on this project (free-tier limit = 0). Enable billing on the Google Cloud project for this GEMINI_API_KEY.',
          )
        }
        throw new Error(`Gemini ${res.status} after ${MAX_ATTEMPTS} attempts: ${text.slice(0, 300)}`)
      }
      console.warn(`    rate-limited (${res.status}); waiting ${Math.round(wait / 1000)}s (attempt ${attempt}/${MAX_ATTEMPTS})`)
      await sleep(wait)
      continue
    }

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Gemini ${res.status}: ${text.slice(0, 300)}`)
    }

    const json: any = await res.json()
    const candParts = json?.candidates?.[0]?.content?.parts ?? []
    for (const p of candParts) {
      const inline = p.inlineData ?? p.inline_data
      if (inline?.data) return Buffer.from(inline.data, 'base64')
    }
    const block = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason
    throw new Error(`Gemini returned no image (${block ?? 'unknown'}): ${JSON.stringify(json).slice(0, 200)}`)
  }
  throw new Error('unreachable')
}

// ---------------------------------------------------------------------------
// Post-processing: bg removal -> trim -> contact shadow -> 1000x1200 canvas
// ---------------------------------------------------------------------------
async function removeBackground(raw: Buffer): Promise<Buffer> {
  const ml = await applyMlBackgroundRemoval(raw)
  if (ml) return ml
  const sampled = await sampleEdgeBackground(raw)
  if (sampled) {
    const { buffer } = await removeConnectedEdgeBackground(raw, sampled)
    return buffer
  }
  return sharp(raw).ensureAlpha().png().toBuffer()
}

async function composeContactShadow(strap: Buffer, w: number, h: number): Promise<Buffer> {
  // Blurred, dimmed silhouette of the strap, offset slightly down, behind the strap.
  const alphaMask = await sharp(strap)
    .ensureAlpha()
    .extractChannel(3)
    .blur(16)
    .linear(0.42, 0) // dampen opacity (~0.42 of original alpha)
    .toBuffer()
  const black = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 22, g: 18, b: 14 } },
  })
    .png()
    .toBuffer()
  return sharp(black).joinChannel(alphaMask).png().toBuffer()
}

// White-canvas path (default): keep Gemini's white background + its own contact shadow, trim
// the excess white margin, and re-canvas to a consistent 1000x1200 white frame. Buckle interior
// and punch holes stay white = identical to the canvas, so there are no cut-out artifacts.
async function postProcessWhite(raw: Buffer): Promise<Buffer> {
  const flat = await sharp(raw).flatten({ background: '#ffffff' }).toBuffer()
  let trimmed = flat
  try {
    // High threshold so faint corner smudges / soft halos count as background and are excluded
    // from the bounding box — this keeps the strap correctly centered and consistently scaled
    // (a stray mark would otherwise inflate the bbox and shove the strap off to one side).
    // The strap itself is far darker than white, so a high threshold never clips it.
    trimmed = await sharp(flat).trim({ background: '#ffffff', threshold: 55 }).toBuffer()
  } catch {
    /* trim throws if the image is uniform; keep the flattened original */
  }
  const resized = await sharp(trimmed)
    .resize(CONTENT_W, CONTENT_H, { fit: 'inside', withoutEnlargement: false })
    .toBuffer()
  const meta = await sharp(resized).metadata()
  const cw = meta.width ?? CONTENT_W
  const ch = meta.height ?? CONTENT_H
  const left = Math.round((OUT_W - cw) / 2)
  const top = Math.round((OUT_H - ch) / 2)
  return sharp({
    create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer()
}

// Surgical, zero-AI-cost buckle-logo cleanup via scripts/inpaint_buckle_logo.py (OpenCV).
// Best-effort: silently skipped if python3 + opencv aren't installed.
let INPAINT_OK: boolean | null = null
function inpaintBuckleLogo(file: string) {
  if (INPAINT_OK === null) {
    try {
      execFileSync('python3', ['-c', 'import cv2'], { stdio: 'ignore' })
      INPAINT_OK = true
    } catch {
      INPAINT_OK = false
      console.warn('    (buckle-logo inpaint skipped: python3 + opencv-python not available)')
    }
  }
  if (!INPAINT_OK) return
  try {
    execFileSync('python3', [path.join(ROOT, 'scripts', 'inpaint_buckle_logo.py'), file], { stdio: 'ignore' })
  } catch {
    console.warn(`    (inpaint failed for ${path.basename(file)})`)
  }
  // Robust component-based recentre (immune to faint smudges that fool threshold trim).
  try {
    execFileSync('python3', [path.join(ROOT, 'scripts', 'recenter_strap.py'), file], { stdio: 'ignore' })
  } catch {
    console.warn(`    (recenter failed for ${path.basename(file)})`)
  }
}

async function postProcessTransparent(raw: Buffer): Promise<Buffer> {
  const cut = await cropToAlphaBounds(await removeBackground(raw))

  const resized = await sharp(cut)
    .resize(CONTENT_W, CONTENT_H, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()
  const meta = await sharp(resized).metadata()
  const cw = meta.width ?? CONTENT_W
  const ch = meta.height ?? CONTENT_H
  const left = Math.round((OUT_W - cw) / 2)
  const top = Math.round((OUT_H - ch) / 2)
  const shadow = await composeContactShadow(resized, cw, ch)
  const shadowOffsetY = 16

  return sharp({
    create: { width: OUT_W, height: OUT_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left, top: Math.min(top + shadowOffsetY, OUT_H - ch) },
      { input: resized, left, top },
    ])
    .png()
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Supabase upload + manifest
// ---------------------------------------------------------------------------
function supabaseClient(): SupabaseClient {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY')
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function objectExists(supabase: SupabaseClient, objectPath: string): Promise<boolean> {
  const slash = objectPath.lastIndexOf('/')
  const dir = slash >= 0 ? objectPath.slice(0, slash) : ''
  const name = slash >= 0 ? objectPath.slice(slash + 1) : objectPath
  const { data } = await supabase.storage.from(BUCKET).list(dir, { limit: 100, search: name })
  return Array.isArray(data) && data.some((d) => d.name === name)
}

// Upload a strap template as a compact WebP (the master is white-bg, so WebP is ~10-20x smaller
// than the PNG with no visible loss). Input is the processed (+ inpainted) PNG buffer.
async function uploadStrap(supabase: SupabaseClient, name: string, pngBuffer: Buffer): Promise<string> {
  const webp = await sharp(pngBuffer).webp({ quality: 88 }).toBuffer()
  const storagePath = `strap-templates/${name}.webp`
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, webp, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '31536000',
  })
  if (error && !error.message?.toLowerCase().includes('resource already exists')) {
    throw new Error(`upload ${storagePath} failed: ${error.message}`)
  }
  // Remove any legacy PNG object so the bucket only holds the small WebP masters.
  await supabase.storage.from(BUCKET).remove([`strap-templates/${name}.png`]).catch(() => {})
  return publicUrl
}

function updateManifest(name: string, def: StrapDef, imageUrl: string) {
  let manifest: any[] = []
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  }
  const entry = {
    id: def.name,
    material: def.material,
    subMaterial: def.subMaterial,
    color: def.color,
    colorHex: def.colorHex,
    style: def.style,
    imageUrl,
    availableLugWidths: [18, 19, 20, 21, 22, 24],
    affiliatePartner: null,
    affiliateUrl: null,
  }
  const idx = manifest.findIndex((m) => m.id === name)
  if (idx >= 0) manifest[idx] = { ...manifest[idx], ...entry }
  else manifest.push(entry)
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function selectStraps(): StrapDef[] {
  if (ONLY) {
    const names = ONLY.split(',').map((s) => s.trim())
    return STRAPS.filter((s) => names.includes(s.name))
  }
  if (ARGV.includes('--sample')) return STRAPS.filter((s) => SAMPLE_NAMES.includes(s.name))
  return STRAPS.filter((s) => s.tier <= TIER)
}

async function rawSourceFor(def: StrapDef): Promise<Buffer | null> {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const p = path.join(RAW_DIR, def.name + ext)
    if (fs.existsSync(p)) return fs.readFileSync(p)
  }
  return null
}

async function main() {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true })
  fs.mkdirSync(RAW_DIR, { recursive: true })

  const targets = selectStraps()
  if (!targets.length) {
    console.error('No straps matched selection.')
    process.exit(1)
  }

  // Sync data/strap-templates.json with the STRAPS table (create missing rows with empty
  // imageUrl, preserve any already-populated URLs). Does not call the API or touch Storage.
  if (ARGV.includes('--init-manifest')) {
    let manifest: any[] = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : []
    const valid = new Set(STRAPS.map((s) => s.name))
    manifest = manifest.filter((m) => valid.has(m.id)) // drop removed straps (NATO/metal)
    for (const def of STRAPS) {
      const existing = manifest.find((m) => m.id === def.name)
      const row = {
        id: def.name,
        material: def.material,
        subMaterial: def.subMaterial,
        color: def.color,
        colorHex: def.colorHex,
        style: def.style,
        imageUrl: existing?.imageUrl ?? '',
        availableLugWidths: [18, 19, 20, 21, 22, 24],
        affiliatePartner: null,
        affiliateUrl: null,
      }
      if (existing) Object.assign(existing, row)
      else manifest.push(row)
    }
    manifest.sort((a, b) => STRAPS.findIndex((s) => s.name === a.id) - STRAPS.findIndex((s) => s.name === b.id))
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`[strap-gen] wrote ${manifest.length} rows to ${path.relative(ROOT, MANIFEST_PATH)}`)
    return
  }

  console.log(
    `[strap-gen] ${targets.length} strap(s) | mode=${PROCESS_ONLY ? 'process-only' : DRY_RUN ? 'dry-run' : 'generate'} | bg=${BG} | upload=${NO_UPLOAD || DRY_RUN ? 'no' : 'yes'} | model=${GEMINI_MODEL}`,
  )

  if (!PROCESS_ONLY && !UPLOAD_EXISTING && !DRY_RUN && !GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY (or GOOGLE_API_KEY). Set it in .env.local.')
    process.exit(1)
  }

  let supabase: SupabaseClient | null = null
  if (!NO_UPLOAD && !DRY_RUN) supabase = supabaseClient()

  // Upload the EXACT current processed PNGs (already generated + fixed), no regeneration.
  if (UPLOAD_EXISTING) {
    if (!supabase) {
      console.error('--upload-existing needs Supabase creds (do not pass --no-upload).')
      process.exit(1)
    }
    const up: string[] = []
    const miss: string[] = []
    for (const def of targets) {
      const localPath = path.join(PROCESSED_DIR, `${def.name}.png`)
      if (!fs.existsSync(localPath)) { miss.push(def.name); continue }
      const publicUrl = await uploadStrap(supabase, def.name, fs.readFileSync(localPath))
      updateManifest(def.name, def, publicUrl)
      up.push(def.name)
      console.log(`  uploaded ${def.name}`)
    }
    console.log(`[strap-gen] uploaded=${up.length} missing=${miss.length}${miss.length ? ' (' + miss.join(',') + ')' : ''}`)
    return
  }

  const done: string[] = []
  const skipped: string[] = []
  const failed: Array<{ name: string; error: string }> = []

  for (const def of targets) {
    try {
      if (DRY_RUN) {
        const ref = def.reference ? ` [ref: ${def.reference}${def.recolor ? ' (recolor)' : ''}]` : ' [text-to-image]'
        console.log(`\n=== ${def.name}${ref} ===\n${buildPrompt(def)}`)
        done.push(def.name)
        continue
      }

      // skip-if-exists unless --force
      if (supabase && !FORCE) {
        if (await objectExists(supabase, `strap-templates/${def.name}.webp`)) {
          console.log(`  skip (exists): ${def.name}`)
          skipped.push(def.name)
          continue
        }
      }

      console.log(`  - ${def.name} ...`)
      let raw: Buffer | null = null

      if (PROCESS_ONLY) {
        raw = await rawSourceFor(def)
        if (!raw) {
          skipped.push(def.name)
          console.log(`    no raw file in ${path.relative(ROOT, RAW_DIR)}/, skipping`)
          continue
        }
      } else {
        let ref: { buffer: Buffer; mime: string } | undefined
        if (def.reference) {
          const original = fs.readFileSync(path.join(DEMO_BANDS_DIR, def.reference))
          if (def.mirrorRef) {
            // reference has the buckle-half on the left; flip so the composition-lock yields buckle-right
            const flipped: Buffer = await sharp(original).flop().png().toBuffer()
            ref = { buffer: flipped, mime: 'image/png' }
          } else {
            ref = { buffer: original, mime: refMime(def.reference) }
          }
        }
        raw = await geminiGenerate(buildPrompt(def), ref)
        // gentle pacing between calls to stay under per-minute limits
        await sleep(1500)
      }

      const out = BG === 'transparent' ? await postProcessTransparent(raw) : await postProcessWhite(raw)
      const localPath = path.join(PROCESSED_DIR, `${def.name}.png`)
      fs.writeFileSync(localPath, out)
      inpaintBuckleLogo(localPath) // surgical buckle-logo cleanup (no AI)
      console.log(`    processed -> ${path.relative(ROOT, localPath)}`)

      if (supabase) {
        const publicUrl = await uploadStrap(supabase, def.name, out)
        updateManifest(def.name, def, publicUrl)
        console.log(`    uploaded -> ${publicUrl}`)
      }
      done.push(def.name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failed.push({ name: def.name, error: msg })
      console.error(`    FAILED ${def.name}: ${msg}`)
    }
  }

  console.log(`\n[strap-gen] done=${done.length} skipped=${skipped.length} failed=${failed.length}`)
  if (failed.length) {
    console.log('  retry: --only ' + failed.map((f) => f.name).join(','))
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
