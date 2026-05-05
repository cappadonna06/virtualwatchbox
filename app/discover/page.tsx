'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { watches as catalogWatches } from '@/lib/watches'
import {
  DISCOVER_DEMO_COLLECTION_IDS,
  buildChrono24URL,
  getBoxInsight,
  getNextSlotRecommendations,
  getTargetOpportunities,
  getUpgradeSuggestions,
} from '@/lib/discover'
import SectionHeader from '@/components/discover/SectionHeader'
import BoxInsightCard from '@/components/discover/BoxInsightCard'
import UpgradeCard from '@/components/discover/UpgradeCard'
import DiscoverWatchCard from '@/components/discover/DiscoverWatchCard'
import StrapCard from '@/components/discover/StrapCard'
import BoxUpgradeCard from '@/components/discover/BoxUpgradeCard'
import ReadsCard from '@/components/discover/ReadsCard'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const SECTION_GAP = 64

export default function DiscoverPage() {
  const router = useRouter()
  const { user } = useAuth()
  const session = useCollectionSession()

  const isGuest = !user
  const realCollection: CatalogWatch[] = useMemo(
    () => session.collectionWatches.map(w => ({
      id: w.watchId,
      brand: w.brand,
      model: w.model,
      reference: w.reference,
      caseSizeMm: w.caseSizeMm,
      lugWidthMm: w.lugWidthMm,
      caseMaterial: w.caseMaterial,
      dialColor: w.dialColor,
      movement: w.movement,
      complications: w.complications,
      estimatedValue: w.estimatedValue,
      imageUrl: w.imageUrl,
      imageTransparentUrl: w.imageTransparentUrl,
      imageSourceUrl: w.imageSourceUrl,
      dialConfig: w.dialConfig,
      watchType: w.watchType,
    })),
    [session.collectionWatches],
  )

  const demoCollection: CatalogWatch[] = useMemo(() => {
    return DISCOVER_DEMO_COLLECTION_IDS
      .map(id => catalogWatches.find(w => w.id === id))
      .filter((w): w is CatalogWatch => Boolean(w))
  }, [])

  const collectionForInsight = realCollection.length > 0 ? realCollection : demoCollection
  const collectionForUpgrades = realCollection.length > 0 ? realCollection : demoCollection

  const boxInsight = useMemo(
    () => getBoxInsight(collectionForInsight, catalogWatches),
    [collectionForInsight],
  )

  const upgradeSuggestions = useMemo(
    () => getUpgradeSuggestions(
      collectionForUpgrades,
      catalogWatches,
      session.followedWatchIds,
      session.collectionJewelWatchId,
      session.grailWatchId,
      session.nextTargets.map(t => t.watchId),
    ),
    [collectionForUpgrades, session.followedWatchIds, session.collectionJewelWatchId, session.grailWatchId, session.nextTargets],
  )

  const nextSlotRecs = useMemo(() => {
    if (isGuest) {
      return catalogWatches.slice(0, 6)
    }
    return getNextSlotRecommendations(realCollection, session.followedWatchIds, catalogWatches, 6)
  }, [isGuest, realCollection, session.followedWatchIds])

  const targetOpps = useMemo(
    () => getTargetOpportunities(session.nextTargets, session.grailWatchId, catalogWatches),
    [session.nextTargets, session.grailWatchId],
  )

  const showTargets = !isGuest && targetOpps.length > 0
  const showUpgradesPersonal = !isGuest && upgradeSuggestions.length > 0
  const showUpgradesDemo = isGuest || (realCollection.length === 0 && upgradeSuggestions.length > 0)

  return (
    <div className="discover-shell" style={{ background: brand.colors.bg, padding: '48px 56px' }}>
      <header style={{ marginBottom: 48 }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            fontWeight: 500,
          }}
        >
          Discover
        </div>
        <h1
          style={{
            fontFamily: brand.font.serif,
            fontSize: 42,
            fontWeight: 500,
            color: brand.colors.ink,
            margin: '8px 0 12px',
            lineHeight: 1.1,
          }}
        >
          Your next move.
        </h1>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 14,
            color: brand.colors.muted,
            margin: 0,
            maxWidth: 560,
            lineHeight: 1.55,
          }}
        >
          Recommendations, upgrades, and reads shaped around your collection.
        </p>
      </header>

      {boxInsight && (
        <section style={{ marginBottom: SECTION_GAP }}>
          <BoxInsightCard
            copy={boxInsight.copy}
            missingType={boxInsight.missingType}
            suggestion={isGuest ? null : boxInsight.suggestion}
            isGuest={isGuest}
          />
        </section>
      )}

      <section style={{ marginBottom: SECTION_GAP, position: 'relative' }}>
        <SectionHeader
          label="Upgrade This Watch"
          subhead="Step-up paths that preserve your box balance"
        />
        {showUpgradesPersonal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {upgradeSuggestions.map(s => (
              <UpgradeCard key={`${s.ownedWatch.id}-${s.upgradeWatch.id}`} suggestion={s} />
            ))}
          </div>
        ) : showUpgradesDemo && upgradeSuggestions[0] ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ opacity: 0.42, pointerEvents: 'none', userSelect: 'none' }}>
              <UpgradeCard suggestion={upgradeSuggestions[0]} />
            </div>
            {isGuest && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '14px 20px',
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.md,
                }}
              >
                <p
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 13,
                    color: brand.colors.muted,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  This preview uses a sample collection.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/auth')}
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: '0.03em',
                    padding: '9px 20px',
                    background: brand.colors.ink,
                    color: brand.colors.bg,
                    border: 'none',
                    borderRadius: brand.radius.btn,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Sign in for your upgrades
                </button>
              </div>
            )}
          </div>
        ) : (
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 13,
              color: brand.colors.muted,
              margin: 0,
            }}
          >
            Add a watch or two to your collection to see personalized upgrades.
          </p>
        )}
      </section>

      {showTargets && (
        <section id="targets" style={{ marginBottom: SECTION_GAP }}>
          <SectionHeader
            label="For Your Targets"
            subhead="Watches you're tracking"
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {targetOpps.map(({ watch, isGrail, targetPrice }) => (
              <div
                key={watch.id}
                style={{
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.md,
                  padding: '16px 20px',
                  minWidth: 240,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: brand.colors.muted,
                  }}
                >
                  {watch.brand}
                </div>
                <div
                  style={{
                    fontFamily: brand.font.serif,
                    fontSize: 18,
                    color: brand.colors.ink,
                    lineHeight: 1.2,
                  }}
                >
                  {watch.model}
                </div>
                {isGrail && (
                  <span
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      color: brand.colors.gold,
                      border: `1px solid ${brand.colors.gold}`,
                      borderRadius: brand.radius.pill,
                      padding: '2px 8px',
                      alignSelf: 'flex-start',
                      marginTop: 4,
                    }}
                  >
                    GRAIL
                  </span>
                )}
                {targetPrice !== undefined && (
                  <div
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: 12,
                      color: brand.colors.muted,
                      marginTop: 4,
                    }}
                  >
                    Target: {fmt(targetPrice)}
                  </div>
                )}
                <a
                  href={buildChrono24URL(watch.brand, watch.model)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 11,
                    color: brand.colors.gold,
                    textDecoration: 'none',
                    marginTop: 8,
                  }}
                >
                  Find on Market ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="recommendations" style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader
          label="For Your Next Slot"
          subhead="Watches not yet in your collection"
        />
        <div className="discover-grid">
          {nextSlotRecs.map(watch => (
            <DiscoverWatchCard key={watch.id} watch={watch} />
          ))}
        </div>
      </section>

      <section id="straps" style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader
          label="Upgrade This Strap"
          subhead="Improve what you already own"
        />
        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          <StrapCard name="Black Leather" material="Calfskin · classic" />
          <StrapCard name="Brown Suede" material="Suede · casual" />
          <StrapCard name="Rubber Sport" material="FKM rubber · diver" />
          <StrapCard name="NATO" material="Nylon · military" />
          <StrapCard name="Sailcloth" material="Technical weave · sport" />
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            fontStyle: 'italic',
            marginTop: 12,
          }}
        >
          Affiliate links coming soon.
        </div>
      </section>

      <section id="boxes" style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader
          label="Upgrade This Box"
          subhead="Physical cases for serious collectors"
        />
        <div style={{ display: 'flex', flexDirection: 'row', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          <BoxUpgradeCard name="Travel Roll" descriptor="Soft 3-watch travel companion" />
          <BoxUpgradeCard name="6-Slot Display Box" descriptor="Glass-top oak display" />
          <BoxUpgradeCard
            name="10-Slot Collector Case"
            descriptor="For larger rotations, lockable"
            fitsCollection={realCollection.length > 6}
          />
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            fontStyle: 'italic',
            marginTop: 12,
          }}
        >
          Virtual Watchbox may earn a commission on box purchases.
        </div>
      </section>

      <section id="reads" style={{ marginBottom: SECTION_GAP }}>
        <SectionHeader
          label="Reads for Your Taste"
          subhead="From the publications collectors trust"
        />
        <div className="discover-reads-grid">
          <ReadsCard
            publication="Hodinkee"
            title="The Case for the Steel Datejust in 2026"
            category="Market"
            date="3 days ago"
            href="https://www.hodinkee.com"
          />
          <ReadsCard
            publication="Fratello"
            title="Tudor Black Bay 58: Still the Sweet Spot?"
            category="Review"
            date="1 week ago"
            href="https://www.fratellowatches.com"
          />
          <ReadsCard
            publication="Monochrome"
            title="Grand Seiko Spring Drive Explained"
            category="Education"
            date="5 days ago"
            href="https://monochrome-watches.com"
          />
          <ReadsCard
            publication="Worn & Wound"
            title="Five Underrated GMTs Under $2,000"
            category="Buying Guide"
            date="2 weeks ago"
            href="https://wornandwound.com"
          />
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            marginTop: 12,
          }}
        >
          Personalized RSS feed coming soon.
        </div>
      </section>
    </div>
  )
}
