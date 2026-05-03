import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { watches } = await request.json() as { watches: Record<string, unknown>[] }

  if (!Array.isArray(watches) || watches.length === 0) {
    return NextResponse.json({ error: 'No watches provided' }, { status: 400 })
  }

  const rows = watches.map(w => ({
    id: String(w.id),
    brand: String(w.brand ?? ''),
    model: String(w.model ?? ''),
    reference: String(w.reference ?? ''),
    case_size_mm: Number(w.case_size_mm ?? w.caseSizeMm ?? 0),
    lug_width_mm: w.lug_width_mm ?? w.lugWidthMm ?? null,
    case_material: String(w.case_material ?? w.caseMaterial ?? ''),
    dial_color: String(w.dial_color ?? w.dialColor ?? ''),
    movement: String(w.movement ?? ''),
    complications: Array.isArray(w.complications) ? w.complications : [],
    estimated_value: Number(w.estimated_value ?? w.estimatedValue ?? 0),
    watch_type: String(w.watch_type ?? w.watchType ?? 'Sport'),
    dial_color_hex: String(w.dial_color_hex ?? (w.dialConfig as Record<string,unknown>)?.dialColor ?? '#1A1410'),
    marker_color_hex: String(w.marker_color_hex ?? (w.dialConfig as Record<string,unknown>)?.markerColor ?? '#C8BCAF'),
    hand_color_hex: String(w.hand_color_hex ?? (w.dialConfig as Record<string,unknown>)?.handColor ?? '#FFFFFF'),
    source: String(w.source ?? 'import'),
  }))

  const { error, count } = await supabase
    .from('catalog_watches')
    .upsert(rows, { onConflict: 'id' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: count ?? rows.length })
}
