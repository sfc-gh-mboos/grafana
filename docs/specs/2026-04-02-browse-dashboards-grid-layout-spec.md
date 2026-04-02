# Browse Dashboards — Grid layout option — Technical Specification

> **Executive Summary:** This specification adds a third `SearchLayout` value, **Grid**, to the Browse Dashboards page so users can see folder and dashboard items as **cards** (using `@grafana/ui` `Card` + `Grid`) instead of the virtualized tree table. The feature reuses the **Connections `CardGrid` pattern** (`Grid` with `minColumnWidth`, `Card` with heading/figure/meta), reads **dashboard tree data from the existing Redux-backed** `useFlatTreeState` hook (no new APIs or global state), and keeps **search results** on the existing **List** path (`SearchView` + `SearchResultsTable`). Layout preference continues to use **`SearchStateManager` + `localStorage`** (`SEARCH_SELECTED_LAYOUT`); the enum, `ActionRow`, `BrowseView`, and **`SearchStateManager`** must stay consistent so Grid persists and interacts correctly with sort and “include panels”. Target footprint: **two new presentational components** plus **small edits** to types, filters, browse view, and state manager.

**Author:** Agent (spec-driven-development)
**Date:** 2026-04-02
**Status:** Draft
**Stakeholders:** Frontend team, UX (copy/icon review)

---

## Context research (codebase)

- **`SearchLayout`** today: `List` | `Folders` only (`public/app/features/search/types.ts`). Browse vs search is chosen by `hasSearchFilters()` in `SearchStateManager`, which treats **`layout === List` as a search filter** — so **List always opens `SearchView`**, while **Folders** allows **`BrowseView`** when no other filters apply (`BrowseDashboardsPage.tsx`).
- **Browse tree data:** `BrowseView` uses `useFlatTreeState(folderUID)` and renders **`DashboardsTree`** only (`BrowseView.tsx`). No layout branch exists yet.
- **Layout UI:** `BrowseFilters` → `ActionRow` with `RadioButtonGroup` (`ActionRow.tsx`). `getValidQueryLayout` coerces **Folders → List** when query/sort/starred/tags exist.
- **Persistence:** `getLocalStorageLayout()` only distinguishes **List** vs default **Folders** (`SearchStateManager.ts`); **`Grid` must be added** here or the choice will reset after reload.
- **Reference UI:** Connections `CardGrid` uses `Grid gap={1.5} minColumnWidth={44}` and `Card` with `Card.Heading`, `Card.Figure`, `Card.Meta` (`public/app/features/connections/tabs/ConnectData/CardGrid/CardGrid.tsx`).

---

## 1. Context & Problem Statement

**Current state:** On `/dashboards`, the primary browse experience is a **dense tree table** (`DashboardsTree` + `react-window`). The layout control exposes **folder tree** vs **list (search)**; list mode drives the unified search UI and table results.

**Problem:** Users who are **browsing** (not searching) still only have a row-based tree. There is no Grafana-native **card** layout on this page, even though **`Card` + `Grid`** and a proven **card grid** pattern exist elsewhere.

**Motivation:** Cards improve **scannability** (title, kind, tags, location) for medium-sized folders without new backend work.

**Trigger:** Product/engineering request for a **small, Grafana-native** browse improvement with **no new APIs** and **reuse of existing state**.

---

## 2. Goals & Non-Goals

### Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Users can choose **Grid** alongside **Folders** and **List** in the browse filters bar | `SearchLayout.Grid` appears in `ActionRow`; telemetry/reporting receives `layout: 'grid'` where applicable |
| G2 | In **browse** mode (`BrowseView`), items render as **cards** in a responsive grid | With `Grid` selected and no search filters, `BrowseView` renders the new grid instead of `DashboardsTree` |
| G3 | **No new data layer** — cards consume the same **flat tree** items and behaviors (tag click → add tag, navigation) as the tree | No new Redux slices; tag handler still calls `stateManager.onAddTag` |

### Non-Goals

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | **Search results** ( `SearchView` ) as cards in v1 | Keeps scope to **5–6 files**; `SearchResultsTable` and search keyboard selection are separate; users use **List** when searching |
| NG2 | **Thumbnail / screenshot** previews on cards | No image URL in current row model without new APIs |
| NG3 | **Virtualized** card grid for thousands of rows | Matches “simple” scope; tree already paginates; revisit if profiling shows **>500ms** mount for large folders |
| NG4 | **Full parity** with tree **checkbox bulk selection** on cards in v1 | Avoid duplicating `DashboardsTree` selection UX in cards; bulk operations remain on **Folders** or **List** |

---

## 3. User Scenarios

### Scenario 1: Happy path — switch to grid while browsing

> **Actor:** Org editor browsing dashboards under a folder  
> **Trigger:** Opens Browse Dashboards, no search query  
> **Preconditions:** User has permission to view dashboards; folder has several dashboards and subfolders  
>
> **Steps:**
> 1. Actor sets layout to **Grid** via the existing view toggle  
> 2. System renders **cards** for visible tree items (same data as tree)  
> 3. Actor clicks a **dashboard** card → navigates to dashboard  
> 4. Actor clicks a **folder** card → navigates into folder (same as tree)  
>
> **Outcome:** Browsing works in grid mode with familiar navigation.  
> **Acceptance criteria:**
> - [ ] Grid option visible when `showLayout` is true (browse filters)  
> - [ ] Card shows title, kind (icon), tags (if any), location/meta as agreed in UI section  
> - [ ] Reload preserves **Grid** via `localStorage`  

### Scenario 2: Edge case — search or filters active

> **Actor:** User who typed a query or applied tags/starred/sort  
> **Trigger:** Same page transitions to **search** (`SearchView`)  
> **Preconditions:** `hasSearchFilters()` is true (includes **List** layout or real filters)  
>
> **Steps:**
> 1. With **Grid** selected, actor types a search query (or `getValidQueryLayout` forces **List**)  
> 2. System shows **table** search results (existing behavior)  
>
> **Outcome:** Search remains **List/table**; no partial card implementation for search in v1.  
> **Acceptance criteria:**
> - [ ] `getValidQueryLayout` coerces **Grid → List** when Folders would be invalid (same conditions as Folders: query, sort, starred, tags, etc.)  
> - [ ] **Folders** layout option stays disabled when those filters apply; **Grid** follows same disable rules as **Folders** for the toggle  

### Scenario 3: Error / loading — empty folder and failed load

> **Actor:** Viewer opening an empty folder or hitting a load failure  
> **Trigger:** Tree status empty or error from existing browse loading  
> **Preconditions:** **Grid** layout selected  
>
> **Steps:**
> 1. **Empty:** `flatTree.length === 0` after load → same **EmptyState** / CTA as today’s `BrowseView`  
> 2. **Loading:** Existing loading behavior from browse hooks applies; grid may show after data resolves (no new global loading state)  
>
> **Outcome:** Empty and error paths match **Folders** behavior; no blank grid without messaging.  
> **Acceptance criteria:**
> - [ ] Empty folder uses existing `EmptyState` / `CallToActionCard` branch from `BrowseView`  
> - [ ] No uncaught render when items include `pagination-placeholder` UI rows — **filter or map** to real dashboard/folder rows only  

---

## 4. Technical Architecture

### Architecture decision

**Approaches considered:**

| Approach | Pros | Cons |
|----------|------|------|
| **A: New `DashboardCardGrid` + `DashboardCard` using `@grafana/ui` `Card` + `Grid`** | Matches **Connections `CardGrid`**; full control; browse-dashboards stays self-contained | New components to test |
| **B: Reuse `DashListItem` / panel dashlist** | Familiar panel UI | Wrong dependency for app shell; couples to panel config and theming |
| **C: Search-only cards (`SearchView` branch)** | One surface for “all dashboards as cards” | Touches `SearchResultsTable`, keyboard nav, and loading model — exceeds “simple” file budget |

**Decision:** **Approach A** for **browse-only** grid. **Search** stays on existing **List** path (**Scenario 2**).

### Component hierarchy

```
BrowseDashboardsPage (existing)
└── BrowseView (modify)
    ├── [layout === Grid] DashboardCardGrid (new)
    │       └── DashboardCard (new) × N
    └── [layout !== Grid] DashboardsTree (existing)
```

`BrowseView` reads `searchState.layout` from `useSearchStateManager()` and branches on `getValidQueryLayout(searchState)` (or compares to `SearchLayout.Grid` when valid).

### State management

| State | Owner | Type | Consumers |
|-------|-------|------|-----------|
| `layout` | `SearchStateManager` | in-memory + `localStorage` | `ActionRow`, `BrowseView` |
| Tree items / selection | Redux `browseDashboards` | existing slice | `useFlatTreeState`, `DashboardsTree`; grid may **omit** selection UI in v1 (see non-goals) |

**State transitions (layout):**

```
Folders/Grid --[user picks List]--> hasSearchFilters true --> SearchView
SearchView --[clear filters + pick Grid]--> BrowseView + Grid
```

**`SearchStateManager` alignment (required):**

- **`getLocalStorageLayout`:** Persist and restore **`Grid`** (not only List vs Folders).  
- **`initStateFromUrl`:** For `sort`, treat **Grid like Folders** (`sort` from URL only when layout is **List**), unless product explicitly wants sort on grid later.  
- **`onSortChange`:** When user picks a sort, layout switches to **List** (existing); ensure **Grid** does not block this.  
- **`onLayoutChange`:** When switching to **Folders** with active `sort`, **prevSort** behavior today — **Grid** should mirror **Folders** (browse layouts without search sort).  
- **`hasSearchFilters`:** Do **not** treat **Grid** like **List** (otherwise browse grid would always show `SearchView`).  
- **`ActionRow`:** Disable **Include panels** when `layout === Grid` (same as Folders).

### Key interfaces

```typescript
// public/app/features/search/types.ts
export enum SearchLayout {
  List = 'list',
  Folders = 'folders',
  Grid = 'grid',
}

// New: public/app/features/browse-dashboards/components/DashboardCardGrid.tsx
import { DashboardsTreeItem } from 'app/features/browse-dashboards/types';

export interface DashboardCardGridProps {
  items: DashboardsTreeItem[]; // same as `DashboardsTree` `items` prop
  width: number;
  onTagClick: (tag: string) => void;
  /** Optional: navigate folder vs dashboard — mirror tree link builder */
  folderUID?: string;
}

// New: public/app/features/browse-dashboards/components/DashboardCard.tsx
import { DashboardViewItem } from 'app/features/search/types';

export interface DashboardCardProps {
  item: DashboardViewItem;
  onTagClick: (tag: string) => void;
}
```

`DashboardsTreeItem` is defined in `public/app/features/browse-dashboards/types.ts`.

### Data flow

```
Redux (browseDashboards) → useFlatTreeState(folderUID) → BrowseView
                              │
                              ├─ layout === Grid → DashboardCardGrid → DashboardCard
                              └─ else → DashboardsTree
Tag click on card → handleTagClick → SearchStateManager.onAddTag (existing)
```

---

## 5. UI Specification

### Layout

**Desktop (≥1024px):** `Grid` with `gap` and `minColumnWidth` aligned to **Connections** (e.g. `minColumnWidth={44}` units or tuned to ~272px effective width — verify against Grafana spacing). Cards wrap within `BrowseView` width.

**Tablet (768px–1023px):** 2 columns typical.

**Mobile (<768px):** 1 column; cards stack.

### Component states

| Component | Default | Loading | Empty | Error | Success | Disabled | Hover | Focus | Active |
|-----------|---------|---------|-------|-------|---------|----------|-------|-------|--------|
| View toggle (`RadioButtonGroup`) | One layout selected | — | — | — | — | Folders/Grid disabled when filters require List | Hover on radios | Focus ring | Active press |
| `DashboardCardGrid` | Cards visible | Inherit browse loading (tree loading) | Delegated to parent `BrowseView` empty branch | Same as browse error handling | N/A | N/A | — | Card links focusable | Link active |
| `DashboardCard` | Title, icon, tags/meta | N/A | N/A | N/A | N/A | If read-only nav only, N/A | Card hover (theme) | Link focus | Link active |

### Interactions & animations

| Interaction | Trigger | Behavior | Duration |
|-------------|---------|----------|----------|
| Layout → Grid | Click | Swap tree for grid | Instant |
| Open dashboard | Click card (primary link) | `locationService` / `href` same as tree row | Instant |
| Add tag filter | Tag pill click | `onTagClick` | Instant |

### Accessibility

| Requirement | Implementation |
|---------------|----------------|
| **Keyboard navigation** | Each card is a **single primary link** (`Card` + `href`) where possible; tab order follows DOM order left-to-right, top-to-bottom. |
| **ARIA** | Optional: grid as `role="list"` and cards as `role="listitem"` if not redundant with `Card` semantics; **do not** duplicate interactive elements inside the link. |
| **Screen reader** | Heading text = dashboard/folder title; **decorative** icons `aria-hidden` or empty `alt`. |
| **Focus** | Visible focus on links; no modal — no trap. |
| **Contrast** | Use `@grafana/ui` tokens — **WCAG AA** via theme. |
| **Motion** | No extra motion; respect `prefers-reduced-motion` for any hover transitions if added. |

---

## 6. Edge Cases & Error Handling

| # | Scenario | Expected behavior | Recovery |
|---|----------|-------------------|----------|
| E1 | User selects **Grid**, then **sort** | `onSortChange` forces **List** + search | Clear sort or change layout back to Grid in UI |
| E2 | **localStorage** has invalid/old value | Fall back to **Folders** | Same as today for unknown enum |
| E3 | Tree item is **pagination placeholder** | Card grid **skips** UI-only rows | Filter `item.kind === 'ui'` before render |
| E4 | Very long title | **Line clamp** + `title` tooltip | CSS `line-clamp`, native tooltip |
| E5 | Many tags | Truncate with **+N** or max visible tags | Click still adds filter for visible tags |
| E6 | **Provisioned / read-only** repo | Same disabled rules as tree for create CTAs | Empty state already handles `isReadOnlyRepo` |

---

## 7. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|---------------|
| Extra mount time for grid vs tree (100 items) | **< 100ms** on dev machine | React Profiler (`<Profiler>`) compare commit duration |
| Layout toggle | **< 50ms** interaction-to-paint | Performance `mark`/`measure` |
| Bundle impact | **< 3 KB gzipped** delta | CI / `webpack-bundle-analyzer` on touched chunks |

---

## 8. Testing Strategy

| Layer | Scope | Tool | Key cases |
|-------|-------|------|-----------|
| Unit | `getValidQueryLayout` with Grid + filters | Jest | Grid coerced to List when query present |
| Unit | `getLocalStorageLayout` / layout persistence | Jest | Round-trip **Grid** in `SearchStateManager` |
| Component | `DashboardCard` | RTL | Renders title; tag click fires handler |
| Component | `DashboardCardGrid` | RTL | Renders N cards for N items; skips UI rows |
| Integration | `BrowseView` | RTL | Mock Redux + state manager → tree vs grid branch |

---

## 9. Rollout Plan

**Feature flag:** Optional **`dashboardBrowseGrid`** (default **on** in dev, **off** in prod until QA) — product decision. **Minimal version:** ship **without** a flag if risk is acceptable (pure UI branch).

**Rollback criteria:** Elevated client errors on Browse page, or **>1%** interaction failure on navigation from cards (if instrumented).

**Monitoring:** Existing `reportDashboardListViewed` / search reporting should include `layout: grid` in payloads where `SearchLayout` is sent (`page/reporting.ts` consumers).

---

## 10. Open Questions & Decisions Log

| # | Question | Status | Decision | Rationale | Date |
|---|----------|--------|----------|-----------|------|
| Q1 | Card **selection** checkboxes? | Decided | **Out of scope v1** | Non-goal NG4; reduces scope | 2026-04-02 |
| Q2 | Show **last modified** on card? | Open | Prefer **yes in Meta** if field exists on `DashboardViewItem` | Better scanability; verify field availability in tree model | 2026-04-02 |
| Q3 | Feature flag? | Open | Ship **flagless** if team agrees | Simpler rollout | 2026-04-02 |

---

## Files to create / modify

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `public/app/features/browse-dashboards/components/DashboardCardGrid.tsx` | `Grid` + map items to cards |
| **Create** | `public/app/features/browse-dashboards/components/DashboardCard.tsx` | Single `Card` row |
| **Modify** | `public/app/features/search/types.ts` | Add `SearchLayout.Grid` |
| **Modify** | `public/app/features/search/page/components/ActionRow.tsx` | Option + icon; `getValidQueryLayout`; disabled options; include panels |
| **Modify** | `public/app/features/browse-dashboards/components/BrowseView.tsx` | Branch grid vs `DashboardsTree` |
| **Modify** | `public/app/features/search/state/SearchStateManager.ts` | `getLocalStorageLayout`, `initStateFromUrl` sort, `onLayoutChange` / `onSortChange` parity for Grid vs Folders |

**File count note:** The **minimal UI slice** is **5 files** if `SearchStateManager` is deferred (Grid would not persist correctly). **Production-ready** implementation includes **`SearchStateManager.ts` (6th file)** and updates **`SearchStateManager.test.ts`**.

---

## Quality Gate Checklist

- [x] Executive summary written (after sections)
- [x] Every section filled — no TBD/TODO placeholders
- [x] 2+ architecture approaches with trade-offs
- [x] Component states table covers default, loading, empty, disabled, hover, focus, active
- [x] 5+ edge cases with recovery
- [x] Accessibility: keyboard, ARIA, focus called out concretely
- [x] Performance: numeric targets + measurement
- [x] Testing: unit + component + integration listed
- [x] Non-goals: 2+ (here: 4)
- [x] Rollout: rollback criteria
- [x] Open questions: Q2–Q3 flagged where product still chooses
