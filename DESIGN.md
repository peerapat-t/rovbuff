# RoVBuff Design Direction

This document is the visual source of truth for RoVBuff. It exists to keep new
pages and future changes consistent with the interface established by **Match
Charts**.

## Product Frame

RoVBuff is **your personal RoV coach**. It is designed for an individual player
who uploads matches they already play, studies their own performance, and uses
that history to improve.

The interface should feel like a focused post-match analysis workspace:

- personal rather than team-administration oriented;
- analytical without looking like a spreadsheet application;
- dark, calm, and dense enough for serious match data;
- confident and game-aware without becoming decorative or noisy.

Do not describe the product as a team's coach or as a tool primarily for team
training.

## Canonical Reference

`apps/frontend/components/MatchCharts.tsx` is the canonical component reference.
When there is uncertainty about a new surface, control, spacing choice, or data
presentation, follow Match Charts before inventing another style.

Its defining characteristics are:

- one clear outer panel;
- a compact kicker, strong title, and muted supporting copy;
- small metric tabs contained within the panel;
- dark inset cards for repeated records;
- restrained borders instead of heavy shadows;
- bold tabular values and horizontal comparison bars;
- semantic team colors supported by a confident red product accent.

## Design Principles

### 1. One visual system

Every route must look like part of the same application. Pages may use a
different semantic accent, but they must share the same surfaces, typography,
border treatment, controls, and spacing rhythm.

### 2. Hierarchy before decoration

The reading order should always be obvious:

1. breadcrumb and page context;
2. kicker and title;
3. one-line explanation;
4. controls;
5. primary data;
6. secondary details.

Use glow and gradients to reinforce hierarchy, never as filler.

### 3. Panels contain concepts

Use one outer `ui-panel` for one complete concept. Use `ui-card` inside it for
repeatable records, options, players, or metrics. Avoid placing every small
piece of content in its own large floating panel.

### 4. Color communicates meaning

Red is the product and interaction accent. Other colors are semantic and
should not compete with it.

### 5. Dense but readable

Analytics can be information-dense, but labels remain compact, spacing remains
predictable, and important values use strong contrast. Supporting text stays
muted.

## Foundation Tokens

The implementation source is `apps/frontend/app/globals.css`.

### Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#02040c` | Application background |
| `--surface` | `#07101f` | Primary dark surface |
| `--surface2` | `#0a1426` | Controls and secondary areas |
| `--surface3` | `#0d1930` | Hovered controls and elevated detail |
| `--grad-card` | dark navy gradient | Standard analytical card background |
| `--grad-panel` | dark navy panel gradient | Main application panels |

### Borders and text

| Token | Value | Use |
|---|---|---|
| `--border` | `#172640` | Default borders and dividers |
| `--border-strong` | `#24395e` | Hover and emphasized borders |
| `--text` | `#e8eeff` | Primary text |
| `--text-muted` | `#7184aa` | Descriptions, labels, and metadata |

### Color roles

| Token / color | Role |
|---|---|
| `--accent` / `#ef4444` | Product accent, active navigation, primary focus |
| `--green` / `#22c55e` | Victory, positive values, Player Combo |
| `--red-team` / `#ef4444` | Defeat, negative values, enemy team |
| `--purple` / `#a855f7` | Hero performance and secondary product color |
| `--blue` / `#38bdf8` | Informational metrics and links |
| `#06b6d4` | Draft Helper |
| `#ec4899` | Hero Combo |

The product accent and defeat state share a red hue. Keep their meaning clear
through context, labels, and icons; never rely on color alone.

## Typography

The application uses Geist through `--font-geist-sans`, falling back to the
system sans-serif stack.

### Page title

- Use `ui-page-title`.
- Heavy weight, tight tracking, and white text.
- Keep the title short enough to scan in one glance.

### Section title

- Use `ui-section-title`.
- Pair with an optional `ui-kicker` above it.
- Add one short `ui-copy` description when context is useful.

### Kicker

- Use `ui-kicker`.
- Uppercase, compact, heavily tracked, and semantic-accent colored.
- A kicker identifies context; it must not repeat the title word for word.

### Numbers

- Use tabular numerals for scores, rates, durations, and ranks.
- Important values should be bold and high contrast.
- Labels remain smaller and muted.

Avoid long all-uppercase headings and avoid using gradient text for normal page
titles.

## Core Primitives

### `ui-panel`

Use for page headers, major analytics sections, filter groups, dialogs, and
complete workflows.

- Radius: `1rem`.
- Dark `--grad-panel` background.
- One-pixel `--border` outline.
- Soft ambient red and purple corner glows.
- Subtle shadow only.

Content that must sit above the panel's ambient glow uses
`ui-panel-content`.

### `ui-card`

Use for records nested in a panel, feature links, player rows, build cards, and
option cards.

- Radius: `0.75rem`.
- Near-black translucent background.
- Subtle border.
- Use `ui-card-hover` only when the whole card is interactive.

### `ui-control`

Use for secondary buttons, selectors that are not native inputs, profile
buttons, and navigation controls.

### `ui-input`

Use for text inputs, textareas, and native selects. The red focus ring is
part of the product identity and must remain visible.

### `ui-table-shell`

Wrap desktop analytics tables with this class. It provides the shared panel
background, header surface, row dividers, and warm hover state.

## Shared React Components

The shared layout primitives live in
`apps/frontend/components/ui/Surface.tsx`.

### `PageHeader`

Every primary application route should begin with `PageHeader`, unless its
content is already embedded in a deliberately equivalent hero panel.

Required structure:

- breadcrumb;
- semantic kicker;
- page title;
- concise description;
- optional icon;
- optional right-side summary or action.

### `SectionHeader`

Use before major data groups. It aligns the kicker, title, description, and an
optional right-side action consistently.

## Page Composition

A normal analytics page follows this order:

```text
PageHeader
  -> optional summary cards
  -> filter or view controls
  -> SectionHeader
  -> primary panel/table/chart
  -> SectionHeader
  -> secondary panels
```

Use a vertical gap of roughly 24px between major sections. Inner panel padding
is normally 16-24px depending on density.

Do not place a standalone breadcrumb above a second unrelated page header.

## Public Home Page

The public home page uses the same dark analytical language as the signed-in
product. It must not become a separate colorful marketing theme.

### Home section cards

Cards under `Your performance workspace` and `Ready to learn from your next
match?` share one neutral gray surface treatment.

- Use the standard dark gray `ui-panel` background and `--border` outline.
- Do not tint the whole card, border, or glow with each feature's accent color.
- Feature colors may appear only in small badges, labels, links, or icons.
- The final call-to-action panel uses a subtle gray radial highlight rather than
  a red or purple wash.
- Primary CTA buttons and a short highlighted phrase may retain the brand
  gradient because they are small focal elements, not surface styling.

## Navigation

The navbar uses a dark translucent surface, thin bottom border, and restrained
shadow.

- Active navigation uses a restrained red tint and border.
- The brand includes the `Personal coach` descriptor.
- Dropdowns use the same dark panel language as the rest of the product.
- Desktop navigation must keep vertical overflow visible so dropdowns are not
  clipped by the link row.
- `Coach Tools` opens as a positioned dropdown on desktop. On small screens,
  its child routes appear directly in the horizontally scrollable navigation
  row instead of opening a clipped dropdown.
- On small screens, identity/actions stay on the first row and navigation links
  become a horizontally scrollable second row.
- The navbar must never increase the document's horizontal width.

## Controls and Tabs

Tabs are compact segmented controls, not large filled buttons.

- Inactive: dark surface, muted label, subtle border.
- Active: translucent semantic tint, colored border, stronger label.
- Keep controls grouped inside one panel when they affect the same data.
- Use short labels and prevent wrapping when horizontal scrolling is preferable.

Primary calls to action may use `btn-accent`. Destructive actions remain red
and must not use the product gradient.

## Charts and Data Visualization

Follow Match Charts for chart presentation.

- Prefer direct labels and horizontal bars over decorative chart furniture.
- Use dark tracks with clear semantic fills.
- Keep grid lines subtle.
- Put metric switching controls inside the chart panel.
- Show the active metric in the panel title.
- Use tabular values aligned to a consistent edge.
- Keep team comparison structures symmetrical whenever possible.

Avoid rainbow palettes without meaning, oversized legends, bright chart
backgrounds, and default library tooltip styling.

## Tables

- Use uppercase compact column labels.
- Keep the sorted column visibly accented.
- Use subtle row dividers instead of boxed cells.
- Align text columns left and numeric columns consistently.
- Use semantic color only for meaningful results.
- Desktop tables may scroll inside their own shell.
- Never let a table create document-level horizontal overflow.
- When scanning becomes difficult on mobile, replace rows with stacked
  `ui-card` records.

## Long Content and Scroll Ownership

Long interactive content scrolls inside its own bounded workspace. It must not
grow the entire document indefinitely.

- Coach Chat uses a viewport-bounded grid on desktop.
- The thread list and message list each own their vertical scroll.
- Chat headers, errors, and the composer remain fixed within the chat panel.
- Flex and grid scroll children require `min-height: 0` so overflow is assigned
  to the intended child.
- Use `overscroll-contain` for nested thread and message scrollers.
- Adding messages may increase the message container's `scrollHeight`, but must
  not increase the page's `scrollHeight`.
- On mobile, bound the thread panel and chat panel separately; do not shrink
  text or controls to fit both into one fixed viewport.

## Status and Feedback

| State | Treatment |
|---|---|
| Victory / success | Green dot, green label, subtle green tint |
| Defeat / error | Red dot, red label, subtle red tint |
| Warning | Amber label and border |
| Loading | Muted text or restrained progress state inside the expected surface |
| Empty | Centered muted explanation inside a `ui-card` or `ui-panel` |
| Disabled | Lower opacity while preserving the component's shape |

Do not use a large success/error surface when an inline status communicates the
state clearly.

## Responsive Rules

Responsive behavior is part of the design system, not a later patch.

- The document must satisfy `scrollWidth === clientWidth` at phone widths.
- Major grids collapse to one column before their content becomes cramped.
- Match team columns stack vertically on small screens.
- Page-header aside content moves below the title when needed.
- Navigation links scroll within the navbar rather than widening the page.
- Tables scroll inside `ui-table-shell` or switch to cards.
- Touch targets should be approximately 40px high where practical.
- Do not solve mobile layouts by shrinking the entire interface or reducing
  readable text below useful sizes.

Check at least these viewport classes:

- phone: 390px wide;
- tablet: 768px wide;
- desktop: 1440px wide.

## Motion

Motion is restrained and functional.

- Hovered cards may rise by one pixel.
- Controls may change border, background, and glow over 150-200ms.
- The public home hero may use a short staggered entrance.
- Respect `prefers-reduced-motion`.
- Do not add looping motion to analytics data, navigation, or normal cards.

## Accessibility

- Preserve visible keyboard focus.
- Keep primary text high contrast against dark surfaces.
- Do not encode win/loss state using color alone; include labels or icons.
- Interactive cards and icon-only buttons need accessible names.
- Maintain logical heading order.
- Use real buttons, links, inputs, and table elements for their intended roles.
- Tooltips must not be the only way to access important information.

## Writing Style

Interface copy is direct, compact, and player-focused.

Use language such as:

- `Your personal RoV coach`
- `Turn every game into progress`
- `Upload the matches you already play`
- `Review your performance`

Avoid language that frames the product primarily as a team-management coach or
promises conclusions the stored data cannot support.

## Do

- Reuse the shared primitives before adding component-specific CSS.
- Use one strong title and one short explanation per section.
- Keep repeated records visually quiet and easy to scan.
- Use semantic accent colors within the shared dark surface system.
- Inspect changes on both desktop and mobile.
- Run `npm run lint` and `npm run build` after broad UI work.

## Do Not

- Create a new card style for each route.
- Use semantic win/loss colors without a label, icon, or supporting context.
- Stack multiple large gradient containers for one concept.
- Add heavy glass blur, neon borders, or large decorative glows.
- Mix unrelated border radii and control heights.
- Center every heading on analytics pages.
- Allow navbars, charts, or tables to widen the document on mobile.
- Change data logic merely to achieve a visual layout.

## Feature Route Map

Keep route folders, page-function names, navigation labels, and user-facing
feature names aligned.

| Menu / feature | Route folder | Page function |
|---|---|---|
| Home | `app/page.tsx` | `HomePage` |
| Profile | `app/profile` | `ProfilePage` |
| Match History | `app/match-history` | `MatchHistoryPage` |
| Match Detail | `app/match-history/[id]` | `MatchDetailPage` |
| Player Stats | `app/player-stats` | `PlayerStatsPage` |
| Player Detail | `app/player-stats/[name]` | `PlayerStatsDetailPage` |
| All Heroes | `app/all-heroes` | `AllHeroesPage` |
| Hero Detail | `app/all-heroes/[name]` | `HeroDetailPage` |
| Player Combo | `app/player-combo` | `PlayerComboPage` |
| Hero Combo | `app/hero-combo` | `HeroComboPage` |
| Draft Helper | `app/draft-helper` | `DraftHelperPage` |
| Player Comparison | `app/player-comparison` | `PlayerComparisonPage` |
| Coach Chat | `app/coach-chat` | `CoachChatPage` |

## Implementation Map

| Concern | Source |
|---|---|
| Design tokens and utility classes | `apps/frontend/app/globals.css` |
| Shared page/section surfaces | `apps/frontend/components/ui/Surface.tsx` |
| Canonical analytics presentation | `apps/frontend/components/MatchCharts.tsx` |
| Global navigation | `apps/frontend/components/Navbar.tsx` |
| Public product composition | `apps/frontend/app/page.tsx` |
| Player Combo | `apps/frontend/components/PlayerComboTable.tsx` |
| Hero Combo | `apps/frontend/components/HeroComboTable.tsx` |
| Draft Helper | `apps/frontend/components/DraftHelper.tsx` |
| Player Comparison | `apps/frontend/components/PlayerComparisonView.tsx` |
| Coach Chat | `apps/frontend/app/coach-chat/CoachChatView.tsx` |
| Table sorting language | `apps/frontend/components/SortableTable.tsx` |
| Shared statistic cards | `apps/frontend/components/StatCard.tsx` |

If an implementation and this document disagree, first compare the result with
Match Charts and the current shared tokens. Update the implementation and this
document together when a deliberate system-wide design decision changes.
