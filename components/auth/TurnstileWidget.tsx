'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type TurnstileRenderOptions = {
  sitekey: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
  'before-interactive-callback'?: () => void
  'after-interactive-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  appearance?: 'always' | 'execute' | 'interaction-only'
  size?: 'normal' | 'flexible' | 'compact'
  action?: string
}

type TurnstileApi = {
  render: (el: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export type TurnstileHandle = { reset: () => void }

type Props = {
  siteKey: string
  action?: string
  onToken: (token: string | null) => void
}

// Supabase Auth verifies the token server-side (Attack Protection → CAPTCHA),
// so this widget is the only client piece. Tokens are single-use: call
// reset() after every sign-in attempt, successful or not.
const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { siteKey, action, onToken },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [interactive, setInteractive] = useState(false)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current(null)
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current)
    },
  }))

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then(api => {
        if (cancelled || !containerRef.current || widgetIdRef.current) return
        // 'flexible' never renders narrower than 300px, which overflows the
        // sign-in card on small phones; 'compact' fits in 150px.
        const fits = containerRef.current.offsetWidth >= 300
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme: 'light',
          // Invisible unless Cloudflare wants the visitor to click.
          appearance: 'interaction-only',
          size: fits ? 'flexible' : 'compact',
          callback: token => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          'before-interactive-callback': () => setInteractive(true),
          'after-interactive-callback': () => setInteractive(false),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [siteKey, action])

  return <div ref={containerRef} style={{ marginBottom: interactive ? 14 : 0 }} />
})

export default TurnstileWidget
