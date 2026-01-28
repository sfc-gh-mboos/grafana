# React Router Architecture Investigation Summary

## 1. What We Tried

### Initial Investigation
We conducted a comprehensive analysis of the React Router infrastructure in the Grafana repository to understand:
- The current routing architecture and component hierarchy
- Package versions and dependencies in use
- How the v5-to-v6 compatibility layer is integrated
- The relationship between core routing components

### Documentation Created
We built a detailed architecture diagram (`docs/react-router-architecture.md`) that includes:
- Visual component hierarchy showing the nesting of router providers
- Package version tables for all routing-related dependencies
- Data flow diagrams for navigation patterns
- Code snippets showing actual implementation patterns

### Migration Status Analysis
We annotated each component in the architecture with its migration status using a color-coded legend:
- 🔴 **Legacy (v5)** - Components that need migration
- 🟡 **Bridge** - Components using the v5-compat layer
- 🟢 **v6 Ready** - Components already using v6 APIs
- ⚪ **Neutral** - Components that are router-agnostic

---

## 2. What We Learned

### Current State
The Grafana codebase is in a **transitional state** between React Router v5 and v6:

| Package | Version | Role |
|---------|---------|------|
| `react-router` | 5.3.4 | Base routing (legacy) |
| `react-router-dom` | 5.3.4 | DOM bindings (legacy) |
| `react-router-dom-v5-compat` | ^6.26.1 | Compatibility bridge |
| `history` | 4.10.1 | Browser history (legacy) |

### Architecture Insights

1. **RouterWrapper** (`public/app/routes/RoutesWrapper.tsx`) is the critical integration point:
   - Wraps v5 `Router` with v6 `CompatRouter`
   - Bridges the `LocationService` singleton with React Router context

2. **Hooks are largely migrated** - Most component code uses v6 hooks:
   - `useLocation`, `useParams`, `useNavigate` from `react-router-dom-v5-compat`
   - These have identical APIs in v6, requiring only import path changes

3. **Link components are ready** - The `@grafana/ui` Link component already uses v6's Link API

### Migration Blockers Identified

| Blocker | Severity | Description |
|---------|----------|-------------|
| **LocationService** | 🔴 Critical | Custom singleton wrapping `history` library with RxJS observables. Used throughout codebase for programmatic navigation. |
| **history library v4** | 🔴 Critical | React Router v6 manages history internally. The explicit `history` dependency must be removed. |
| **v5 Router component** | 🔴 Critical | Top-level `<Router history={...}>` pattern is v5-specific. |

### Migration Progress Estimate
- **~40% complete** - Hooks and components use v6 APIs via compat layer
- **~60% remaining** - Infrastructure, LocationService, and route definitions need migration

---

## 3. What We Should Do Next

### Immediate Actions

1. **Audit LocationService Usage**
   - Search for all `locationService.push()`, `locationService.replace()`, and `locationService.partial()` calls
   - Categorize by: component code (can use hooks) vs. service code (needs alternative)
   - Estimate migration effort for each category

2. **Create Migration Tracking Issue**
   - Document all migration blockers with owners
   - Set up a project board to track progress
   - Define acceptance criteria for "fully migrated"

### Migration Strategy

#### Phase 1: Reduce LocationService Dependencies
```typescript
// Before (legacy pattern)
locationService.push('/dashboard/new');

// After (v6 pattern - in components)
const navigate = useNavigate();
navigate('/dashboard/new');
```

#### Phase 2: Migrate Route Definitions
Transform from `RouteDescriptor[]` to native v6 route objects:
```typescript
// Before
{ path: '/d/:uid', component: DashboardPage }

// After (v6 data router)
{ path: '/d/:uid', element: <DashboardPage /> }
```

#### Phase 3: Remove Compatibility Layer
1. Replace v5 `Router` with v6 `BrowserRouter` or `createBrowserRouter`
2. Remove `CompatRouter` wrapper
3. Update imports from `react-router-dom-v5-compat` to `react-router-dom`
4. Remove `history` package dependency

#### Phase 4: Adopt Data Router Features (Optional)
Consider v6.4+ data router features:
- `loader` functions for data fetching
- `action` functions for mutations
- `defer` for streaming SSR

### Recommended Order

| Step | Component | Effort | Risk |
|------|-----------|--------|------|
| 1 | Audit and document all `locationService` usage | Low | Low |
| 2 | Create wrapper hooks to abstract navigation source | Medium | Low |
| 3 | Migrate component navigation to `useNavigate` | High | Medium |
| 4 | Replace v5 Router with v6 BrowserRouter | Medium | High |
| 5 | Remove compat layer, update all imports | Low | Low |
| 6 | Remove `history` package | Low | Low |

### Files to Reference

| File | Purpose |
|------|---------|
| `docs/react-router-architecture.md` | Full architecture diagram with migration status |
| `public/app/routes/RoutesWrapper.tsx` | Current router integration point |
| `packages/grafana-runtime/src/services/LocationService.tsx` | Critical migration blocker |
| `public/app/routes/routes.tsx` | Route definitions to migrate |
| `public/app/core/navigation/GrafanaRoute.tsx` | Route rendering logic |

---

## Summary

The React Router migration in Grafana is **partially complete**. The codebase successfully uses v6 hooks and components through the compatibility layer, but the core infrastructure (LocationService, history library, v5 Router) remains on legacy patterns. The primary effort needed is:

1. **Decoupling from LocationService** for programmatic navigation
2. **Replacing the v5 Router** with v6's native routing
3. **Updating route definitions** to v6 format

The good news: most component-level code is already using v6 APIs and will only need import path changes once the infrastructure migration is complete.
