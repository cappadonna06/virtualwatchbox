# Virtual Watchbox — Web App UI Kit

Interactive click-through prototype covering the three core surfaces.

## Screens
| Screen | How to reach |
|---|---|
| **Homepage** | Default / click "Virtual Watchbox" logo |
| **My Collection** | Click "My Collection" nav link or "Build Your Box" CTA |
| **Playground** | Click "Playground" nav link or "Open Playground" button |

## Interactions
- **Homepage:** Hero carousel (prev/next/dots), like button toggle, watch box slots (hover card → click for sidebar), carousel auto-advances
- **My Collection:** View switcher (Watchbox / Cards / Stats), click slots or cards to open detail sidebar, delete a watch (triggers unsaved changes bar), Save / Discard flow
- **Playground:** Tab strip to switch boxes, inline box name editing, New Box modal, Remove from Box, Delete Box

## Components
| File | Exports |
|---|---|
| `WatchData.jsx` | `WATCHES`, `PLAYGROUND_WATCHES`, `STATUS_STYLES`, `CONDITION_STYLES`, `DialSVG`, `fmt` |
| `NavBar.jsx` | `NavBar` |
| `WatchSidebar.jsx` | `WatchSidebar` |
| `HomePage.jsx` | `HomePage`, `WatchBoxGrid`, `HoverCard` |
| `CollectionPage.jsx` | `CollectionPage`, `ViewSwitcher`, `WatchCardGrid`, `StatsView` |
| `PlaygroundPage.jsx` | `PlaygroundPage` |

## Notes
- All inline styles — no external CSS dependencies
- Fonts loaded from Google Fonts CDN (Cormorant Garamond + DM Sans)
- Watch images from `../../assets/watches/` (5 Longines Legend Diver .avif files)
- Playground watches without imageUrl use DialSVG renderings only
- Phase 2+ screens (Discover, News, Liked, Grail, Next Targets) are nav stubs only
