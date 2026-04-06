# Interactive Kanban Board — Technical Specification

> **Executive Summary:** Build a reusable drag-and-drop Kanban board component in React + TypeScript for Grafana. Users can manage items across customizable columns with card creation, inline editing, labels, and full keyboard navigation. The architecture uses `@hello-pangea/dnd` (Grafana's existing DnD library) with `useReducer` for state management, following Grafana's established patterns with `@grafana/ui` components and Emotion styling. The component is theme-aware, responsive, and designed for <100ms interaction response times.

**Author:** Agent (spec-driven-development skill)  
**Date:** 2026-04-02  
**Status:** Draft  
**Stakeholders:** Frontend team, Design system team, Feature owners requiring board views

---

## 1. Context & Problem Statement

**Current state:** Grafana's UI provides various layout components including grids, lists, and tables via `@grafana/ui`. For dashboard panel organization, `react-grid-layout` is used via `@grafana/scenes`. However, there is no reusable Kanban-style board component for managing workflow items across discrete columns/stages.

**Problem:** Multiple Grafana features could benefit from a Kanban-style interface — incident management workflows, alert states, provisioning status, or custom plugin use cases. Currently, building such interfaces requires implementing drag-and-drop logic from scratch, leading to inconsistent implementations and duplicated effort.

**Motivation:** A standardized Kanban board component would enable consistent UX across features requiring workflow visualization, reduce implementation time for new features, and provide accessible drag-and-drop out of the box using Grafana's existing `@hello-pangea/dnd` dependency.

**Trigger:** Component library enhancement to support workflow-oriented UI patterns.

---

## 2. Goals & Non-Goals

### Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Provide a reusable board view component with drag-and-drop card movement | Component is importable from `@grafana/ui` or feature-specific location; cards can be dragged between columns |
| G2 | Support full keyboard-only operation for all board interactions | All CRUD + reorder operations achievable via keyboard; passes WCAG 2.1 AA accessibility audit |
| G3 | Render ≤100 cards with no perceptible lag | Interaction response <50ms, initial render <150ms with 100 cards across 5 columns |
| G4 | Integrate seamlessly with Grafana theming and design system | Uses `useStyles2`, respects light/dark themes, follows existing responsive breakpoint patterns |

### Non-Goals

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | Real-time multi-user collaboration (live cursors, conflict resolution) | Requires WebSocket infrastructure; would be a follow-up project if needed |
| NG2 | Swimlanes / row-based grouping | Adds significant complexity; validate basic board adoption first |
| NG3 | Built-in persistence layer | The component should be data-agnostic; consumers provide persistence callbacks |

---

## 3. User Scenarios

### Scenario 1: Move a Card Between Columns (Happy Path)

> **Actor:** User viewing an incident management board  
> **Trigger:** User wants to move an incident from "Investigating" to "Resolved"  
> **Preconditions:** Board is loaded with at least one card in the source column  
>
> **Steps:**
> 1. User grabs the card "Server outage - us-east-1" in the "Investigating" column
> 2. Drags it over the "Resolved" column (column highlights as valid drop target)
> 3. Releases the card in the desired position
> 4. Card animates into position in the target column
> 5. `onCardMove` callback fires with card ID, source/target columns, and new index
>
> **Outcome:** Card appears in "Resolved". Parent component receives the move event for persistence.  
> **Acceptance Criteria:**
> - [ ] Card visually moves to the target column
> - [ ] Card order within the column is preserved
> - [ ] `onCardMove` callback is invoked with correct parameters
> - [ ] Animation completes in ≤200ms

### Scenario 2: Create a Card via Keyboard

> **Actor:** Power user who navigates entirely with keyboard  
> **Trigger:** User wants to add a new card without using the mouse  
> **Preconditions:** Board is loaded, focus is on a column or card within a column  
>
> **Steps:**
> 1. User presses `N` while focus is within a column
> 2. Inline input appears at the top of the column with focus
> 3. User types the card title and presses `Enter`
> 4. Card is created, `onCardCreate` callback fires
> 5. Focus moves to the newly created card
>
> **Outcome:** New card appears in the column. Keyboard focus is on the new card.  
> **Acceptance Criteria:**
> - [ ] `N` shortcut creates card in the currently focused column
> - [ ] `Escape` cancels creation and returns focus to previous element
> - [ ] Empty title is rejected with inline validation message
> - [ ] Screen reader announces "Card created: [title]"

### Scenario 3: Drag Fails Due to Callback Error

> **Actor:** User on a system where persistence fails  
> **Trigger:** User drags a card but the `onCardMove` Promise rejects  
> **Preconditions:** Board is loaded, persistence layer is returning errors  
>
> **Steps:**
> 1. User drags "Deploy v2" from "Review" to "Done"
> 2. Card animates to the new position (optimistic update)
> 3. `onCardMove` callback Promise rejects with an error
> 4. Card animates back to its original position
> 5. Error is surfaced via optional `onError` callback for consumer to handle
>
> **Outcome:** Board returns to its pre-drag state. Consumer can display error notification.  
> **Acceptance Criteria:**
> - [ ] Optimistic update reverts cleanly on callback rejection
> - [ ] Card returns to exact original position (column + index)
> - [ ] `onError` callback receives the error for consumer handling
> - [ ] Screen reader announces the revert

---

## 4. Technical Architecture

### Architecture Decision

**Approaches Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| A: `@hello-pangea/dnd` with `useReducer` | Already a Grafana dependency, proven accessibility, consistent with existing DnD patterns (variable editor, query rows), well-documented | Slightly verbose for complex drag scenarios |
| B: `@dnd-kit` with Context API | Excellent keyboard support, headless/unstyled, more modern API | Would add a new dependency, different patterns from existing codebase |

**Decision:** Approach A (`@hello-pangea/dnd` + `useReducer`) because it's already used in Grafana, maintains consistency with existing drag-and-drop implementations, and avoids adding a new dependency.

### Component Hierarchy

```
KanbanBoard (root container, DragDropContext)
├── BoardHeader (optional: title, search input, global actions)
├── ColumnContainer (horizontal scroll container, Droppable for column reorder if enabled)
│   └── Column (mapped for each column, Droppable for cards)
│       ├── ColumnHeader (title, card count, actions menu)
│       │   └── ColumnActions (dropdown: rename, delete column)
│       ├── CardList (Droppable zone)
│       │   └── Card (Draggable)
│       │       ├── CardContent (title, description preview)
│       │       ├── CardLabels (color-coded badges)
│       │       └── CardMeta (assignee, due date, custom fields)
│       └── AddCardButton (triggers inline creation)
│           └── AddCardInput (inline form when active)
├── CardDetailDrawer (optional: full card view/edit in Drawer component)
└── DragOverlay (visual representation during drag - handled by @hello-pangea/dnd)
```

### State Management

**State location:**

| State | Owner | Type | Consumers |
|-------|-------|------|-----------|
| `columns` (ordered list with cards) | KanbanBoard | useReducer | ColumnContainer, Column, Card |
| `draggingCardId` | KanbanBoard | useReducer | Card (styling), DragOverlay |
| `activeAddColumn` (which column has input open) | KanbanBoard | useReducer | Column, AddCardInput |
| `selectedCard` (detail view target) | KanbanBoard | useReducer | CardDetailDrawer |
| `focusedColumnId` | KanbanBoard | useReducer | Column (keyboard nav) |
| `searchQuery` | BoardHeader | local useState | ColumnContainer (filtered view) |

**State transitions:**

```
[Idle] --drag start--> [Dragging] --drop--> [Optimistic] --callback success--> [Idle]
                                                        --callback failure--> [Reverting] --> [Idle]
[Idle] --click add--> [Adding] --submit--> [Creating] --callback success--> [Idle]
                               --cancel--> [Idle]
[Idle] --click card--> [DetailOpen] --close/save--> [Idle]
```

### Key Interfaces

```typescript
/** Main board component props */
interface KanbanBoardProps {
  /** Board data structure */
  columns: KanbanColumn[];
  /** Called when a card is moved. Return Promise - rejection triggers revert. */
  onCardMove: (event: CardMoveEvent) => Promise<void>;
  /** Called when a new card is created. Return the created card. */
  onCardCreate?: (columnId: string, title: string) => Promise<KanbanCard>;
  /** Called when a card is updated */
  onCardUpdate?: (cardId: string, updates: Partial<KanbanCard>) => Promise<KanbanCard>;
  /** Called when a card is deleted */
  onCardDelete?: (cardId: string) => Promise<void>;
  /** Called when columns are reordered (if column reorder enabled) */
  onColumnMove?: (event: ColumnMoveEvent) => Promise<void>;
  /** Error handler for failed operations */
  onError?: (error: Error, operation: 'move' | 'create' | 'update' | 'delete') => void;
  /** Optional header configuration */
  header?: KanbanHeaderConfig;
  /** Enable column reordering via drag */
  allowColumnReorder?: boolean;
  /** Enable card creation inline */
  allowCardCreate?: boolean;
  /** Custom card renderer */
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  /** Custom column header renderer */
  renderColumnHeader?: (column: KanbanColumn) => React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  /** Optional column-level metadata */
  meta?: Record<string, unknown>;
}

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  labels?: KanbanLabel[];
  assignee?: { name: string; avatarUrl?: string };
  dueDate?: string; // ISO 8601
  /** Custom fields for domain-specific data */
  meta?: Record<string, unknown>;
}

interface KanbanLabel {
  id: string;
  name: string;
  color: string; // theme color key or hex
}

interface CardMoveEvent {
  cardId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  sourceIndex: number;
  destinationIndex: number;
}

interface ColumnMoveEvent {
  columnId: string;
  sourceIndex: number;
  destinationIndex: number;
}

interface KanbanHeaderConfig {
  title?: string;
  showSearch?: boolean;
  actions?: React.ReactNode;
}

/** Internal reducer state */
interface KanbanBoardState {
  columns: KanbanColumn[];
  draggingCardId: string | null;
  activeAddColumnId: string | null;
  selectedCardId: string | null;
  focusedColumnId: string | null;
  pendingOperation: 'move' | 'create' | 'update' | 'delete' | null;
  previousState: KanbanColumn[] | null; // For revert on failure
}

type KanbanBoardAction =
  | { type: 'DRAG_START'; cardId: string }
  | { type: 'DRAG_END' }
  | { type: 'MOVE_CARD'; event: CardMoveEvent }
  | { type: 'REVERT_MOVE' }
  | { type: 'MOVE_COLUMN'; event: ColumnMoveEvent }
  | { type: 'SET_ADD_COLUMN'; columnId: string | null }
  | { type: 'ADD_CARD'; columnId: string; card: KanbanCard }
  | { type: 'UPDATE_CARD'; cardId: string; updates: Partial<KanbanCard> }
  | { type: 'DELETE_CARD'; cardId: string }
  | { type: 'SET_SELECTED_CARD'; cardId: string | null }
  | { type: 'SET_FOCUSED_COLUMN'; columnId: string | null }
  | { type: 'SET_COLUMNS'; columns: KanbanColumn[] };
```

### Data Flow

```
[Props: columns] 
    ↓
[KanbanBoard useReducer] ←── [User Actions: drag, click, keyboard]
    ↓
[Column components] ←── optionally filtered by searchQuery
    ↓
[Card components] ←── ordered by column's card array
    ↓
[Render] → [User sees updated board]

Persistence flow:
[User drags card] 
    → [Dispatch MOVE_CARD (optimistic)] 
    → [Call onCardMove callback]
        ├── success: no-op (already updated)
        └── failure: dispatch REVERT_MOVE
```

---

## 5. UI Specification

### Layout

**Desktop (≥992px / lg breakpoint):**
- Horizontal scrolling container for columns
- Columns are 280px wide with 16px gap (`theme.spacing(2)`)
- Board fills available width
- Column max-height = available viewport height with internal scroll for cards

**Tablet (769px–991px / md breakpoint):**
- Same as desktop, columns shrink to 260px
- Touch drag supported via `@hello-pangea/dnd`

**Mobile (<769px / sm breakpoint):**
- Single-column view with horizontal swipe or tab selector to switch columns
- Full-width cards
- Column selector tabs at top

### Component States

| Component | Default | Loading | Empty | Error | Disabled | Hover/Focus |
|-----------|---------|---------|-------|-------|----------|-------------|
| KanbanBoard | Columns rendered with cards | Skeleton columns (3) with `LoadingPlaceholder` cards (3 each) using `@grafana/ui` Skeleton | "No columns" message with optional CTA | Error passed to `onError` callback; consumer renders notification | N/A | N/A |
| Column | Cards listed, header shows count | N/A (board-level loading) | "No cards" muted text (theme.colors.text.secondary) | N/A | N/A | Drop target highlights with `theme.colors.primary.border` 2px border |
| Card | Title, labels, meta visible | Shimmer via CSS animation on newly created | N/A (cards always have title) | N/A | 50% opacity, pointer-events: none during drag of another card | `theme.shadows.z2` elevation, subtle scale(1.02) transform |
| AddCardInput | Hidden — `IconButton` with "+" visible | Submit button shows `Spinner` | N/A | Inline `FieldValidationMessage` | Button disabled during submission | Input uses `theme.colors.primary.border` |
| ColumnHeader | Title, card count badge | N/A | Shows "(0)" count | N/A | N/A | Actions menu icon appears on hover |

### Interactions & Animations

| Interaction | Trigger | Behavior | Duration |
|-------------|---------|----------|----------|
| Card pickup | Mouse down + drag 5px / touch hold 150ms | Card lifts with shadow, original position shows placeholder | 150ms ease-out |
| Card drop | Mouse up / touch end | Card animates to final position, other cards reflow | 200ms spring (built into @hello-pangea/dnd) |
| Card revert | Callback rejection after drop | Card animates back to original position | 200ms |
| Column drop highlight | Drag over column | Column background: `theme.colors.background.secondary`, border: `theme.colors.primary.main` | 100ms |
| Card detail open | Click card | Drawer slides in from right using `@grafana/ui` Drawer | 200ms ease-out |
| New card appear | Card created | Card fades in at top of column | 150ms |
| Card delete | Delete confirmed | Card fades out, other cards shift | 150ms |
| Search filter | Type in search | Cards not matching query get `display: none` | Instant (no animation) |

### Accessibility

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** | `Tab` moves between columns. `Arrow Up/Down` moves between cards within column. `Arrow Left/Right` moves between columns when focus is on column header. `Space` or `Enter` picks up focused card, then `Arrow Left/Right` to move between columns, `Arrow Up/Down` to reorder within column, `Space` or `Enter` to drop, `Escape` to cancel. `N` creates new card in focused column. `Enter` on card opens detail view. |
| **ARIA roles** | Board container: `role="region" aria-label="Kanban board"`. Columns: `role="list" aria-label="[Column title], [N] cards"`. Cards: `role="listitem"`. Draggable cards: `aria-roledescription="Draggable item. Press space bar to lift."`. |
| **Screen reader announcements** | On pickup: "Lifted [card title] from [column], position [N] of [total]. Use arrow keys to move." On drop: "Dropped [card title] in [column] at position [N]." On revert: "Move cancelled. [card title] returned to [column]." Built into @hello-pangea/dnd. |
| **Focus management** | After card creation: focus moves to new card. After card deletion: focus moves to next card, or column header if no cards remain. After drawer close: focus returns to triggering card. Focus trap within drawer when open. |
| **Color contrast** | All text meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large/bold). Label colors validated against `theme.colors.background.primary`. Use `theme.visualization.getColorByName()` for accessible palettes. |
| **Motion** | Respect `prefers-reduced-motion: reduce`. When reduced, transitions use `0ms` duration. Use `theme.transitions.duration` values. |

---

## 6. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Recovery Strategy |
|---|----------|-------------------|-------------------|
| E1 | Drop card on same position (no actual move) | No-op. No callback invoked, no state change. | Detect same source/destination and skip. |
| E2 | Multiple rapid drags before callback completes | Queue operations; process sequentially. Prevent picking up card while `pendingOperation` is active. | Disable draggable state during pending operation. |
| E3 | `onCardMove` callback timeout (>10s) | Treat as failure; revert optimistic update. Invoke `onError`. | Add configurable timeout with default 10s. |
| E4 | Very long card title (>200 chars) | Truncate with ellipsis after 2 lines in board view. Full title in detail drawer. | CSS `line-clamp: 2` with `title` attribute. |
| E5 | 100+ cards in a single column | Show warning if >50 cards; consider virtual scroll in future. Initial version: render all with CSS `overflow-y: auto`. | Document performance expectations; virtual scroll as future enhancement. |
| E6 | Column deleted externally while viewing | Parent updates `columns` prop; board re-renders. If dragging from deleted column, cancel drag gracefully. | Check column existence in reducer; dispatch `DRAG_END` if source column gone. |
| E7 | Duplicate card IDs in data | Log warning to console. Use first occurrence only. | Defensive checks in reducer; dedupe by ID. |
| E8 | Browser loses focus during drag | Cancel drag via `onWindowBlur` handler. Return to original position. | Add window blur listener in `DragDropContext`. |
| E9 | Empty column title provided | Prevent creation; show validation error in AddColumnInput. | Client-side validation before callback. |
| E10 | Card creation with duplicate title | Allow it — titles don't need to be unique. | No restriction (consumer can add validation via callback rejection). |

---

## 7. Performance Requirements

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Initial render (empty board, 5 columns) | <50ms | React Profiler, `performance.mark/measure` |
| Initial render (100 cards across 5 columns) | <150ms | React Profiler |
| Drag interaction response | <16ms per frame (60fps maintained) | Chrome Performance tab frame timing |
| Card move (optimistic + callback) | <50ms perceived (optimistic), callback <2s | `performance.mark/measure` |
| Bundle size (component tree) | <20KB gzipped | `source-map-explorer` or similar |
| Memory (100 cards rendered) | <10MB additional heap | Chrome DevTools Memory snapshot |
| Re-render on single card update | Only affected Card component re-renders | React Profiler "Highlight updates" |

---

## 8. Testing Strategy

| Layer | Scope | Tool | Key Cases |
|-------|-------|------|-----------|
| Unit | Reducer logic, card sorting, filtering | Jest | Reducer handles all action types correctly; `MOVE_CARD` updates correct indices; `REVERT_MOVE` restores previous state; filtering logic is case-insensitive |
| Component | Card render, Column render, AddCardInput | React Testing Library | Card displays title/labels/meta; AddCardInput validates empty title; Column shows correct card count; focus management works |
| Integration | Drag-and-drop flow, optimistic update + revert | RTL + mock callbacks | Full drag flow moves card and invokes callback; rejected callback reverts position; keyboard drag completes successfully |
| Accessibility | Keyboard nav, screen reader, focus | jest-axe + RTL | No axe violations; full keyboard workflow works; ARIA attributes present; focus management correct |
| Visual | Component appearance across states | Storybook (if available) | Default/loading/empty states; light and dark themes; responsive breakpoints |
| E2E | Full board workflow | Playwright | Create card → drag to new column → edit in drawer → delete; keyboard-only complete workflow |

---

## 9. Rollout Plan

**Feature flag:** N/A — Component library addition, not a feature flag-gated feature.

**Rollout stages:**

| Stage | Audience | Criteria to Advance |
|-------|----------|---------------------|
| 1. Component complete | Development team review | Code review approved; all tests pass; Storybook stories (if applicable) complete |
| 2. Integration pilot | First feature consumer (e.g., a specific Grafana feature team) | Successful integration; no blocking bugs; performance targets met in real usage |
| 3. General availability | Any Grafana feature or plugin | Documentation complete; API stable; no breaking changes planned |

**Rollback criteria:** Critical accessibility regression OR performance degradation >2x targets OR API breaking changes needed.

**Monitoring:** Monitor for console errors in component tree during integration; collect feedback from initial consumers.

---

## 10. Open Questions & Decisions Log

| # | Question | Status | Decision | Rationale | Date |
|---|----------|--------|----------|-----------|------|
| Q1 | Should we support multi-card selection and bulk drag? | Decided | No — out of scope for v1. | Adds significant complexity. Validate single-card usage first. | 2026-04-02 |
| Q2 | Virtual scroll for large columns? | Decided | Defer to v2. Document 100-card performance target. | Keep initial implementation simple. Add virtualization if needed based on usage. | 2026-04-02 |
| Q3 | Where should the component live? | Decided | Start in feature-specific location; promote to `@grafana/ui` if broadly adopted. | Allows iteration without public API commitment. | 2026-04-02 |
| Q4 | Support column creation/deletion via UI? | Decided | Yes, via optional `onColumnCreate`/`onColumnDelete` callbacks. | Columns are often consumer-controlled, but UI affordance helps. | 2026-04-02 |
| Q5 | Should we use Scene Objects for state? | Decided | No — use `useReducer`. | Kanban board is a self-contained component, not a Scene-managed dashboard element. Keep it simple. | 2026-04-02 |

---

## Quality Gate Checklist

Before this spec is approved, verify every item:

- [x] Executive summary written (after all sections complete)
- [x] Every section filled — no TBD/TODO/placeholder text
- [x] 2+ architecture approaches considered (`@hello-pangea/dnd` vs `@dnd-kit`)
- [x] All component states enumerated (default, loading, empty, error, disabled, hover/focus)
- [x] 10 edge cases with recovery strategies (exceeds minimum of 5)
- [x] Accessibility concrete: ARIA roles, keyboard nav, focus management, screen reader announcements
- [x] Performance targets are numbers with measurement methods
- [x] Testing covers unit + component + integration + a11y + visual + E2E
- [x] Non-goals listed (3) to prevent scope creep
- [x] Rollout plan includes rollback criteria
- [x] All open questions resolved (5 questions, all decided)
