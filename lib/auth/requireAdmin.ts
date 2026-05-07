import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from './admin'

type AdminGate =
  | { ok: true; userId: string; email: string }
  | { ok: false; response: NextResponse }

export async function requireAdmin(): Promise<AdminGate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { ok: true, userId: user.id, email: user.email! }
}
