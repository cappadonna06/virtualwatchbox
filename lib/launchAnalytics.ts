import { track } from '@vercel/analytics'

const campaignLabels = {
  utm_source: ['founder_network', 'rwatches', 'los_angeles_watch_collective', 'unpolished_watches', 'instagram'],
  utm_medium: ['community', 'creator'],
  utm_campaign: ['three_watch_box'],
} as const

const campaignKey = 'vwb:launch:campaign'
const shareKey = 'vwb:launch:playground-share'
const activationEvents = new Set<string>()

type ActivationEvent = 'first_owned_watch_added' | 'first_three_watch_playground_box'
type ShareEvent = 'playground_share_copied' | 'playground_share_viewed' | 'playground_share_build_clicked'
export type LaunchAttribution = { campaign?: string; referral?: 'playground_share' }

function allowedLabel(key: keyof typeof campaignLabels, value: string | null) {
  return campaignLabels[key].find(label => label === value)
}

export function captureLaunchAttribution(search = window.location.search): LaunchAttribution {
  const query = new URLSearchParams(search)
  let source = allowedLabel('utm_source', query.get('utm_source'))
  let medium = allowedLabel('utm_medium', query.get('utm_medium'))
  let campaign = allowedLabel('utm_campaign', query.get('utm_campaign'))

  let fromShare = false
  try {
    if (source && medium && campaign) {
      sessionStorage.setItem(campaignKey, `${source}/${medium}/${campaign}`)
    } else {
      const [savedSource, savedMedium, savedCampaign] = (sessionStorage.getItem(campaignKey) ?? '').split('/')
      source = allowedLabel('utm_source', savedSource)
      medium = allowedLabel('utm_medium', savedMedium)
      campaign = allowedLabel('utm_campaign', savedCampaign)
    }
    fromShare = sessionStorage.getItem(shareKey) === '1'
  } catch {
    // Session storage can be unavailable in embedded or private browsers.
  }

  return {
    ...(source && medium && campaign ? { campaign: `${source}/${medium}/${campaign}` } : {}),
    ...(fromShare ? { referral: 'playground_share' as const } : {}),
  }
}

export function trackLaunchActivation(event: ActivationEvent, attribution: LaunchAttribution) {
  if (typeof window === 'undefined' || !window.va) return

  for (const name of [event, 'first_launch_activation']) {
    if (activationEvents.has(name)) continue
    activationEvents.add(name)
    try {
      const key = `vwb:launch:${name}`
      if (localStorage.getItem(key) === '1') continue
      localStorage.setItem(key, '1')
    } catch {
      // Still dedupe within this document when persistent storage is blocked.
    }
    track(name, attribution)
  }
}

export function trackPlaygroundShare(event: ShareEvent) {
  if (typeof window === 'undefined') return
  if (event === 'playground_share_build_clicked') {
    try { sessionStorage.setItem(shareKey, '1') } catch {}
  }
  track(event, captureLaunchAttribution(window.location.search))
}
