# Dashboard Card Grid View — Technical Specification

> **Executive Summary:** Add a "Grid" layout option to the Browse Dashboards page that renders dashboards as visual cards instead of table rows. Uses the existing `@grafana/ui` `Card` component and `Grid` layout, wired into the existing `SearchLayout` toggle. Scope is intentionally narrow: view toggle + card component + wiring. No new APIs, no new state management.

**Author:** Agent (spec-driven-development skill)
**Date:** 2026-04-01
**Status:** Approved
**Stakeholders:** Frontend team, Design

---

## 1. Context & Problem Statement

**Current state:** The Browse Dashboards page (`/dashboards`) displays dashboards in a table/tree view using `react-table` + `react-window`. The `SearchLayout` enum supports `List` and `Folders` views, toggled via a `RadioButtonGroup` in the `ActionRow` filter bar.

**Problem:** The table view is dense and text-heavy. Users scanning many dashboards can't quickly distinguish them visually. Other areas of Grafana (Connections, Recently Viewed) already show items as cards, but the main dashboards page lacks this option.

**Motivation:** Card views surface more visual context (tags, metadata) at a glance. The infrastructure for this already exists — `@grafana/ui` has `Card` and `Grid`, and the `CardGrid` pattern in Connections proves the approach works.

**Trigger:** Frontend team improvement — low-hanging fruit that reuses existing components.

---

## 2. Goals & Non-Goals

### Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Add a "Grid" option to the browse dashboards view toggle | Users can switch between List, Folders, and Grid views |
| G2 | Display dashboards as cards with title, tags, and kind icon | Cards render correctly with existing `DashboardViewItem` data |
| G3 | Maintain feature parity with table view for basic browsing | Click card to navigate, tags displayed and clickable |

### Non-Goals

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | Dashboard preview thumbnails / screenshots on cards | Requires backend screenshot service not yet available |
| NG2 | Drag-and-drop reordering or moving dashboards between folders in grid view | Adds complexity; table view handles bulk operations |
| NG3 | Virtualized grid rendering | Only needed for 500+ dashboards; optimize later if adoption warrants it |

---

## 3. User Scenarios

### Scenario 1: Switch to Grid View

> **Actor:** Developer browsing project dashboards
> **Trigger:** Clicks the grid icon in the view toggle
> **Preconditions:** Browse Dashboards page is loaded with dashboards visible
>
> **Steps:**
> 1. Developer clicks the grid icon (third option) in the `RadioButtonGroup`
> 2. Table view transitions to a responsive card grid
> 3. Each dashboard appears as a card with title, tags, and kind icon
>
> **Outcome:** Dashboards displayed as cards. Layout persists on page reload.
> **Acceptance Criteria:**
> - [ ] Grid icon appears in the existing view toggle
> - [ ] Cards show title, tags, and dashboard/folder icon
> - [ ] Clicking a card navigates to the dashboard
> - [ ] View preference persists via existing `SearchStateManager`

### Scenario 2: Grid View with No Dashboards

> **Actor:** New user with an empty folder
> **Trigger:** Navigates to an empty folder in grid view
> **Preconditions:** Grid view is active, folder has no dashboards
>
> **Steps:**
> 1. User navigates to an empty folder
> 2. Grid area shows the existing `EmptyState` component (same as table view)
>
> **Outcome:** Consistent empty state regardless of view mode.
> **Acceptance Criteria:**
> - [ ] Empty state message matches existing table view empty state
> - [ ] "Create dashboard" CTA still works

### Scenario 3: Grid View with Many Tags

> **Actor:** User browsing dashboards with 10+ tags each
> **Trigger:** Views dashboards that have many tags
> **Preconditions:** Grid view is active
>
> **Steps:**
> 1. Cards render with tag overflow handled
> 2. Tags beyond the visible limit show a "+N more" indicator
>
> **Outcome:** Cards maintain consistent height. Tags don't break layout.
> **Acceptance Criteria:**
> - [ ] Tags truncate with "+N" overflow indicator
> - [ ] Clicking a visible tag still triggers search filter

---

## 4. Technical Architecture

### Architecture Decision

**Approaches Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| A: New `DashboardCardGrid` component using `@grafana/ui` `Card` + `Grid` | Reuses existing UI primitives, follows `CardGrid` pattern from Connections, full styling control | New component to maintain |
| B: Reuse `DashListItem` with `layoutMode="card"` (as `RecentlyViewedDashboards` does) | Zero new components | `DashListItem` is a plugin panel component, tightly coupled to dashlist panel config; mixing concerns |

**Decision:** Approach A — new `DashboardCardGrid` component. It follows the established `CardGrid` pattern from Connections and keeps browse-dashboards self-contained.

### Component Hierarchy

```
BrowseView (existing)
├── DashboardsTree (existing — shown for List/Folders layout)
└── DashboardCardGrid (NEW — shown for Grid layout)
    └── DashboardCard (NEW — one per item)
        ├── Card.Heading (title + link)
        ├── Card.Figure (kind icon)
        ├── Card.Tags (tag list with overflow)
        └── Card.Meta (folder path)
```

### State Management

No new state. The component reads from existing sources:

| State | Owner | Source |
|-------|-------|--------|
| `layout` | `SearchStateManager` | Existing `SearchLayout` enum — add `Grid` value |
| `dashboardItems` | Redux `browseDashboards` slice | Existing `useFlatTreeState` hook |

### Key Interfaces

```typescript
// Add to existing SearchLayout enum in search/types.ts
export enum SearchLayout {
  List = 'list',
  Folders = 'folders',
  Grid = 'grid',  // NEW
}

// New component props
interface DashboardCardGridProps {
  items: DashboardsTreeItem<DashboardViewItemWithUIItems>[];
  onTagClick: (tag: string) => void;
}

interface DashboardCardProps {
  item: DashboardViewItem;
  onTagClick: (tag: string) => void;
}
```

### Data Flow

```
[Existing Redux store] → [useFlatTreeState hook] → [BrowseView]
                                                       │
                                          layout === 'grid'?
                                         /              \
                                       yes              no
                                        │                │
                                  DashboardCardGrid   DashboardsTree
                                        │              (existing)
                                  DashboardCard[]
```

---

## 5. UI Specification

### Layout

**Desktop (≥1024px):**
CSS Grid via `@grafana/ui` `Grid` component with `minColumnWidth={34}` (~272px cards). Cards fill available width, wrapping responsively.

**Tablet (768px–1023px):**
2-column grid. Same card component.

**Mobile (<768px):**
Single column stack.

### Component States

| Component | Default | Loading | Empty | Error | Hover/Focus |
|-----------|---------|---------|-------|-------|-------------|
| DashboardCardGrid | Grid of cards | Skeleton cards (6) using existing skeleton pattern | Existing `EmptyState` from `BrowseView` (shared) | N/A (error handled at page level) | N/A |
| DashboardCard | Title, icon, tags, meta visible | N/A | N/A | N/A | Card uses built-in `@grafana/ui` Card hover (subtle elevation) |

### Interactions & Animations

| Interaction | Trigger | Behavior | Duration |
|-------------|---------|----------|----------|
| View toggle | Click grid icon | BrowseView switches from tree to grid | Instant |
| Card click | Click card body | Navigate to dashboard URL | Instant |
| Tag click | Click tag pill | Trigger `onTagClick` → search filter | Instant |

### Accessibility

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** | Cards are links (`<a>`) — standard tab navigation. Tags are buttons — tab-reachable within card. |
| **ARIA roles** | Grid container: `role="list"`. Cards: `role="listitem"`. Inherits `Card` component's built-in ARIA. |
| **Screen reader** | Card heading is the link text. Tags announced via existing `TagList` semantics. |
| **Focus management** | Standard link focus. No custom focus trapping needed. |

---

## 6. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Recovery Strategy |
|---|----------|-------------------|-------------------|
| E1 | Folder items in grid view | Folders render as cards with folder icon, clicking navigates into folder | Use `item.kind` to determine icon and navigation behavior |
| E2 | Dashboard with no tags | Card renders without tags section — no empty space | Conditionally render `Card.Tags` only when `tags.length > 0` |
| E3 | Very long dashboard title | Truncate after 2 lines with ellipsis | CSS `line-clamp: 2`, full title in `title` attribute |
| E4 | 100+ dashboards in grid (no virtualization) | Renders all cards; may be slow | Acceptable for v1 — add virtualization in follow-up if metrics show >500ms render |
| E5 | Mixed folders and dashboards | Both render as cards with distinct icons | Folder icon vs dashboard icon differentiation |

---

## 7. Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Grid render (50 items) | <100ms | React Profiler |
| View toggle switch | <50ms | Performance.mark/measure |
| Bundle size impact | <3KB gzipped | webpack-bundle-analyzer (2 small components) |

---

## 8. Testing Strategy

| Layer | Scope | Tool | Key Cases |
|-------|-------|------|-----------|
| Unit | SearchLayout enum includes Grid | Jest | `SearchLayout.Grid === 'grid'` |
| Component | DashboardCard renders title, tags, icon | React Testing Library | Card renders with correct content; long title truncates; tag click calls handler |
| Component | DashboardCardGrid renders items | React Testing Library | Grid renders correct number of cards; empty state shown when no items |
| Integration | View toggle switches between tree and grid | React Testing Library | Toggle to grid shows cards; toggle back shows tree; layout persists |

---

## 9. Rollout Plan

**Feature flag:** `dashboardCardGridView` — Controls visibility of the Grid option in the view toggle.

**Rollout stages:**

| Stage | Audience | Criteria to Advance |
|-------|----------|---------------------|
| 1 | Internal | No rendering bugs with real dashboard data |
| 2 | GA | Flag removed, Grid option available to all users |

**Rollback criteria:** Render errors >1% or user complaints about missing functionality vs table view.

---

## 10. Open Questions & Decisions Log

| # | Question | Status | Decision | Rationale | Date |
|---|----------|--------|----------|-----------|------|
| Q1 | Should cards show last-modified date? | Decided | Yes, in `Card.Meta` | Useful context, data already available | 2026-04-01 |
| Q2 | Should grid view support checkbox selection for bulk actions? | Decided | No — v1 is view-only browsing | Keep scope minimal; bulk ops stay in table view | 2026-04-01 |

---

## Quality Gate Checklist

- [x] Executive summary written
- [x] Every section filled — no TBD/TODO/placeholder text
- [x] 2 architecture approaches considered (new component vs reuse DashListItem)
- [x] All component states enumerated
- [x] 5 edge cases with recovery strategies
- [x] Accessibility concrete: keyboard nav, ARIA, screen reader
- [x] Performance targets are numbers with measurement methods
- [x] Testing covers unit + component + integration
- [x] 2 non-goals listed with rationale
- [x] Rollout plan includes rollback criteria
- [x] All open questions resolved

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `public/app/features/browse-dashboards/components/DashboardCardGrid.tsx` | Grid container component |
| **Create** | `public/app/features/browse-dashboards/components/DashboardCard.tsx` | Individual card component |
| **Modify** | `public/app/features/search/types.ts` | Add `Grid` to `SearchLayout` enum |
| **Modify** | `public/app/features/browse-dashboards/components/BrowseView.tsx` | Conditionally render grid vs tree |
| **Modify** | `public/app/features/search/page/components/ActionRow.tsx` | Add grid icon to view toggle |
