# React Router Architecture in Grafana

This document describes the React Router infrastructure used in the Grafana frontend application.

## Package Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `react-router` | 5.3.4 | Core routing logic |
| `react-router-dom` | 5.3.4 | DOM-specific routing components |
| `react-router-dom-v5-compat` | ^6.26.1 | Compatibility layer for React Router v6 APIs |
| `history` | 4.10.1 | Browser history management |
| `@types/react-router` | 5.1.20 | TypeScript definitions |
| `@types/react-router-dom` | 5.3.3 | TypeScript definitions |
| `@types/history` | 4.7.11 | TypeScript definitions |

## Migration Strategy

The codebase is in a **transitional state** between React Router v5 and v6:

- The base router uses **v5** (`Router` from `react-router-dom`)
- New code uses **v6 APIs** via the compatibility layer (`react-router-dom-v5-compat`)
- The `CompatRouter` wrapper enables v6-style hooks inside the v5 router

## Architecture Diagram with Migration Status

**Legend:**
- 🔴 **v5 (Legacy)** - Needs migration to v6
- 🟡 **v5-compat (Bridge)** - Using v6 API via compatibility layer
- 🟢 **v6 Ready** - Already using v6 patterns, minimal migration needed
- ⚪ **Neutral** - Not router-specific, no migration needed

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AppWrapper ⚪                                       │
│                        (public/app/AppWrapper.tsx)                              │
│                        Status: Neutral - orchestrates providers                  │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         Provider (Redux) ⚪                                │  │
│  │                                                                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    RouterWrapper 🟡                                  │  │  │
│  │  │              (public/app/routes/RoutesWrapper.tsx)                  │  │  │
│  │  │              Status: Bridge - mixes v5 Router with v5-compat        │  │  │
│  │  │                                                                      │  │  │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │           Router 🔴 (react-router-dom v5)                      │ │  │  │
│  │  │  │           history={locationService.getHistory()}               │ │  │  │
│  │  │  │           Status: LEGACY - must migrate to BrowserRouter v6    │ │  │  │
│  │  │  │                                                                │ │  │  │
│  │  │  │  ┌──────────────────────────────────────────────────────────┐ │ │  │  │
│  │  │  │  │       LocationServiceProvider 🔴                         │ │ │  │  │
│  │  │  │  │       (provides locationService via context)             │ │ │  │  │
│  │  │  │  │       Status: LEGACY - uses history v4, needs redesign   │ │ │  │  │
│  │  │  │  │                                                          │ │ │  │  │
│  │  │  │  │  ┌────────────────────────────────────────────────────┐ │ │ │  │  │
│  │  │  │  │  │     CompatRouter 🟡 (v5-compat)                    │ │ │ │  │  │
│  │  │  │  │  │     (Enables v6 hooks inside v5 Router)            │ │ │ │  │  │
│  │  │  │  │  │     Status: BRIDGE - remove after full migration   │ │ │ │  │  │
│  │  │  │  │  │                                                    │ │ │ │  │  │
│  │  │  │  │  │  ┌──────────────────────────────────────────────┐ │ │ │ │  │  │
│  │  │  │  │  │  │            AppChrome ⚪                       │ │ │ │ │  │  │
│  │  │  │  │  │  │     (Navigation shell/layout)                │ │ │ │ │  │  │
│  │  │  │  │  │  │     Status: Neutral - layout component       │ │ │ │ │  │  │
│  │  │  │  │  │  │                                              │ │ │ │ │  │  │
│  │  │  │  │  │  │  ┌────────────────────────────────────────┐ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │       Routes 🟢 (v5-compat)            │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │   (replaces v5 Switch component)       │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │   Status: v6 READY - same API in v6    │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │                                        │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  ┌──────────────────────────────────┐ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │    Route 🟢 (v5-compat)          │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │    element={...}                 │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │    Status: v6 READY - same API   │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │                                  │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  ┌────────────────────────────┐ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  │ GrafanaRouteWrapper 🟢     │ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  │ Uses: useLocation,         │ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  │       useParams, Navigate  │ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  │ Status: v6 READY           │ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  │  └────────────────────────────┘ │ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  │  └──────────────────────────────────┘ │ │ │ │ │ │  │  │
│  │  │  │  │  │  │  └────────────────────────────────────────┘ │ │ │ │ │  │  │
│  │  │  │  │  │  └──────────────────────────────────────────────┘ │ │ │ │  │  │
│  │  │  │  │  └────────────────────────────────────────────────────┘ │ │ │  │  │
│  │  │  │  └──────────────────────────────────────────────────────────┘ │ │  │  │
│  │  │  └────────────────────────────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Migration Status Summary

| Component | Current State | Migration Status | Effort | Notes |
|-----------|--------------|------------------|--------|-------|
| **Router** | v5 `Router` | 🔴 Legacy | High | Replace with v6 `BrowserRouter` or `RouterProvider` |
| **history** | v4.10.1 | 🔴 Legacy | High | v6 manages history internally; need to refactor `locationService` |
| **LocationService** | Custom wrapper | 🔴 Legacy | High | Heavily used (singleton pattern); needs redesign for v6 |
| **CompatRouter** | v5-compat bridge | 🟡 Bridge | Low | Remove after migration |
| **Routes** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **Route** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **Navigate** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **Link** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **useLocation** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **useParams** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **useNavigate** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **useSearchParams** | v5-compat | 🟢 Ready | None | Same API in v6 |
| **GrafanaRouteWrapper** | Uses v6 hooks | 🟢 Ready | Low | Update imports only |
| **GrafanaRoute** | Uses v6 hooks | 🟢 Ready | Low | Update imports only |
| **RouteDescriptor** | Custom interface | 🟡 Bridge | Medium | May need adjustment for v6 route objects |
| **SafeDynamicImport** | React.lazy | ⚪ Neutral | None | Not router-specific |
| **TestProvider** | Mixed v5/v5-compat | 🟡 Bridge | Medium | Update to v6 test patterns |

## Core Components

### 1. LocationService (`@grafana/runtime`) 🔴 LEGACY

**File:** `packages/grafana-runtime/src/services/LocationService.tsx`

**Migration Status:** 🔴 **LEGACY - Critical blocker for v6 migration**

The centralized service for managing browser history and navigation:

```typescript
interface LocationService {
  partial: (query: Record<string, any>, replace?: boolean) => void;
  push: (location: Path | LocationDescriptor) => void;
  replace: (location: Path | LocationDescriptor) => void;
  reload: () => void;
  getLocation: () => Location;
  getHistory: () => History;          // ⚠️ v6 doesn't expose history
  getSearch: () => URLSearchParams;
  getSearchObject: () => UrlQueryMap;
  getLocationObservable: () => Observable<Location>;  // ⚠️ Custom pattern
}
```

- Wraps the `history` library (v4.10.1)
- Creates a browser history instance with `config.appSubUrl` as the base path
- Provides an RxJS Observable for location changes
- Exported as a singleton for global access

**Migration Challenge:** React Router v6 manages history internally. The `getHistory()` method and Observable pattern need redesign.

### 2. RouterWrapper 🟡 BRIDGE

**File:** `public/app/routes/RoutesWrapper.tsx`

**Migration Status:** 🟡 **BRIDGE - Uses mixed v5/v6 patterns**

Sets up the router hierarchy:

```typescript
<Router history={locationService.getHistory()}>        // 🔴 v5 Router
  <LocationServiceProvider service={locationService}>  // 🔴 v5 pattern
    <CompatRouter>                                     // 🟡 v5-compat bridge
      {/* ... providers and layout ... */}
      {props.routes}                                   // 🟢 v6 Routes
    </CompatRouter>
  </LocationServiceProvider>
</Router>
```

**Migration Required:**
- Replace `Router` with `BrowserRouter` or `RouterProvider`
- Remove `CompatRouter` wrapper
- Refactor `LocationServiceProvider` integration

### 3. Route Definitions 🟢 V6 READY

**File:** `public/app/routes/routes.tsx`

**Migration Status:** 🟢 **V6 READY - Uses v6 components via compat**

Routes are defined using the `RouteDescriptor` interface:

```typescript
interface RouteDescriptor {
  path: string;
  component: GrafanaRouteComponent;  // 🟡 Custom wrapper, may need adjustment
  roles?: () => string[];            // Access control
  pageClass?: string;                // Body CSS classes
  routeName?: string;                // Route identifier
  chromeless?: boolean;              // Hide navigation shell
  sensitive?: boolean;               // Case-sensitive matching (v6 compatible)
  allowAnonymous?: boolean | ((params) => boolean);
}
```

Route organization:
- Core routes defined in `getAppRoutes()`
- Feature-specific routes imported from their modules:
  - `getAlertingRoutes()` - Alerting feature
  - `getPluginCatalogRoutes()` - Plugin management
  - `getDataConnectionsRoutes()` - Data sources
  - `getPublicDashboardRoutes()` - Public dashboards
  - `getProvisioningRoutes()` - Git provisioning
  - `getProfileRoutes()` - User profile
  - `getAppPluginRoutes()` - App plugin pages

**Note:** The `RouteDescriptor` interface is a custom abstraction. v6's data router uses `RouteObject` type which is slightly different.

### 4. GrafanaRoute & GrafanaRouteWrapper 🟢 V6 READY

**File:** `public/app/core/navigation/GrafanaRoute.tsx`

**Migration Status:** 🟢 **V6 READY - Already uses v6 hooks**

**GrafanaRouteWrapper** - Pre-render validation:
- ✅ Uses `useLocation()` from v5-compat (v6 API)
- ✅ Uses `useParams()` from v5-compat (v6 API)
- ✅ Uses `Navigate` component from v5-compat (v6 API)
- Checks authentication for protected routes
- Validates role-based access
- Redirects to login or home if unauthorized

**GrafanaRoute** - Route rendering:
- Updates body CSS classes based on `pageClass`
- Reports page views for analytics
- Wraps route component in `ErrorBoundary` and `Suspense`
- Passes `queryParams` and `location` as props

**Migration Required:** Update imports from `react-router-dom-v5-compat` to `react-router-dom`

### 5. SafeDynamicImport ⚪ NEUTRAL

**File:** `public/app/core/components/DynamicImports/SafeDynamicImport.tsx`

**Migration Status:** ⚪ **NEUTRAL - Not router-specific**

Enables code splitting for route components:

```typescript
const SafeDynamicImport = (loader: () => Promise<any>): GrafanaRouteComponent => lazy(loader);

// Usage
component: SafeDynamicImport(
  () => import(/* webpackChunkName: "DashboardPage" */ '../features/dashboard/...')
)
```

This is pure React (uses `React.lazy`) and has no router dependencies.

## Data Flow Diagram with Migration Status

```
┌─────────────────┐
│   User Action   │
│  (click, URL)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LocationService 🔴 LEGACY                           │
│                      (Must be refactored for v6)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐          │
│  │ push()       │  │ replace()    │  │ partial()             │          │
│  │              │  │              │  │ (update query params) │          │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘          │
│         │                 │                      │                       │
│         └────────────────┬┴──────────────────────┘                       │
│                          ▼                                               │
│                   history.push/replace                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │   history lib 🔴    │
                    │   v4.10.1 LEGACY    │
                    │  (v6 has built-in   │
                    │   history mgmt)     │
                    └────────┬────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌───────────────┐  ┌───────────────────┐
│  Router (v5) 🔴 │  │ Observable    │  │ useLocation() 🟢  │
│  LEGACY         │  │ subscribers   │  │ v6 READY          │
│  re-matches     │  │ (custom)      │  │ (via v5-compat)   │
│  routes         │  │               │  │                   │
└────────┬────────┘  └───────────────┘  └───────────────────┘
         │
         ▼
┌──────────────────────────┐
│  GrafanaRouteWrapper 🟢  │
│  v6 READY                │
│  - Auth check            │
│  - Role validation       │
│  Uses: useLocation,      │
│        useParams         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│    GrafanaRoute 🟢       │
│    v6 READY              │
│  - Error boundary        │
│  - Suspense              │
│  - Page analytics        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Route Component 🟢      │
│  (lazy loaded)           │
│  Most use v6 hooks       │
└──────────────────────────┘
```

## Migration Blockers

The following components are blocking a full migration to React Router v6:

### 1. LocationService (Critical Blocker) 🔴

**File:** `packages/grafana-runtime/src/services/LocationService.tsx`

**Problem:** 
- Exports a singleton `locationService` used across 100+ files
- Wraps the `history` library v4.10.1 directly
- React Router v6 manages history internally and doesn't expose it

**Impact:**
- Used in non-component code (services, utilities)
- Used for Observable-based location subscriptions (RxJS)
- API is tightly coupled to v5 history patterns

**Migration Path:**
1. Create a new navigation abstraction that works with v6
2. Provide adapter for `useNavigate()` in component context
3. For non-component code, consider using `router.navigate()` from v6's data router APIs
4. Observable subscriptions need alternative pattern

### 2. Router Component (High Priority) 🔴

**File:** `public/app/routes/RoutesWrapper.tsx`

**Problem:**
- Uses v5's `Router` with explicit `history` prop
- v6 uses `BrowserRouter` or `RouterProvider` (data router)

**Migration Path:**
```typescript
// Current (v5)
<Router history={locationService.getHistory()}>

// Target (v6 - simple)
<BrowserRouter basename={config.appSubUrl}>

// Target (v6 - data router, recommended)
const router = createBrowserRouter(routes, { basename: config.appSubUrl });
<RouterProvider router={router} />
```

### 3. History Library Dependency 🔴

**Package:** `history` v4.10.1

**Problem:**
- v6 doesn't require/use external history library
- Types from `@types/history` won't match v6's internal types
- `H.Location` and `H.History` used throughout codebase

**Impact:**
- `LocationService` interface uses `H.History` and `H.Location`
- Type definitions in `RouteDescriptor` use history types
- Custom location observables depend on history API

## Hooks Usage 🟢 V6 READY

The codebase uses React Router v6 hooks via the compatibility layer:

| Hook | Import Source | Usage Count | Migration Status |
|------|--------------|-------------|------------------|
| `useLocation` | `react-router-dom-v5-compat` | ~100+ files | 🟢 Same API in v6 |
| `useParams` | `react-router-dom-v5-compat` | ~80+ files | 🟢 Same API in v6 |
| `useNavigate` | `react-router-dom-v5-compat` | ~60+ files | 🟢 Same API in v6 |
| `useSearchParams` | `react-router-dom-v5-compat` | ~20+ files | 🟢 Same API in v6 |
| `useMatch` | `react-router-dom-v5-compat` | ~10+ files | 🟢 Same API in v6 |

**Migration Required:** Find/replace imports from `react-router-dom-v5-compat` to `react-router-dom`

### Common Patterns

**Programmatic Navigation:**
```typescript
// Using hooks (preferred for new code) 🟢 V6 READY
import { useNavigate } from 'react-router-dom-v5-compat';
const navigate = useNavigate();
navigate('/path');

// Using locationService (for services/non-component code) 🔴 LEGACY
import { locationService } from '@grafana/runtime';
locationService.push('/path');
locationService.partial({ query: 'value' }, true); // Update query params
```

**Reading Route Parameters:**
```typescript
// 🟢 V6 READY - same API
import { useParams, useLocation } from 'react-router-dom-v5-compat';
const { uid } = useParams<{ uid: string }>();
const location = useLocation();
```

## Link Components 🟢 V6 READY

### @grafana/ui Link

**File:** `packages/grafana-ui/src/components/Link/Link.tsx`

**Migration Status:** 🟢 **V6 READY - Uses v6 Link component**

Wraps React Router's Link with URL sanitization:

```typescript
import { Link as RouterLink } from 'react-router-dom-v5-compat'; // 🟢 v6 API

export const Link = forwardRef<HTMLAnchorElement, Props>(({ href, children, ...rest }, ref) => {
  const validUrl = locationUtil.stripBaseFromUrl(textUtil.sanitizeUrl(href ?? ''));
  return (
    <RouterLink ref={ref} to={validUrl} {...rest}>
      {children}
    </RouterLink>
  );
});
```

### Navigation Component (Navigate) 🟢 V6 READY

```typescript
import { Navigate } from 'react-router-dom-v5-compat'; // 🟢 v6 API

// Redirect pattern - same in v6
<Navigate replace to="/new-path" />
```

## Testing Infrastructure 🟡 BRIDGE

**File:** `public/test/helpers/TestProvider.tsx`

**Migration Status:** 🟡 **BRIDGE - Uses mixed v5/v6 patterns**

Test setup mirrors production router hierarchy:

```typescript
<Provider store={store}>
  <Router history={locationService.getHistory()}>   {/* 🔴 v5 Router */}
    <ModalsContextProvider>
      <CompatRouter>                                  {/* 🟡 Bridge */}
        <GrafanaContext.Provider value={context}>
          {children}
        </GrafanaContext.Provider>
      </CompatRouter>
    </ModalsContextProvider>
  </Router>
</Provider>
```

**Migration Required:** Update to use `MemoryRouter` from v6:
```typescript
// Target (v6)
import { MemoryRouter } from 'react-router-dom';

<MemoryRouter initialEntries={['/test-path']}>
  <ComponentUnderTest />
</MemoryRouter>
```

For isolated component tests (already v6 ready):
```typescript
import { MemoryRouter } from 'react-router-dom-v5-compat'; // 🟢 v6 API

<MemoryRouter initialEntries={['/test-path']}>
  <ComponentUnderTest />
</MemoryRouter>
```

## Future Migration Path

The codebase is positioned for eventual full migration to React Router v6:

### Current Migration Progress

```
Overall Progress: ████████░░░░░░░░░░░░ ~40% Complete

Component Layer:     ████████████████████ 100% (using v6 hooks via compat)
Routing Layer:       ████████████░░░░░░░░  60% (Routes/Route migrated)
Infrastructure:      ██░░░░░░░░░░░░░░░░░░  10% (Router/history still v5)
```

### Migration Steps

| Phase | Task | Status | Priority |
|-------|------|--------|----------|
| 1 | Add v5-compat and migrate hooks | ✅ Done | - |
| 2 | Migrate `Switch` → `Routes` | ✅ Done | - |
| 3 | Migrate `Route` to v6 API | ✅ Done | - |
| 4 | Migrate `Link` components | ✅ Done | - |
| 5 | Refactor `LocationService` for v6 | ⏳ Pending | High |
| 6 | Remove `history` library dependency | ⏳ Pending | High |
| 7 | Replace `Router` with `BrowserRouter` | ⏳ Pending | High |
| 8 | Remove `CompatRouter` wrapper | ⏳ Pending | Medium |
| 9 | Update imports to `react-router-dom` | ⏳ Pending | Low |
| 10 | Update test utilities | ⏳ Pending | Medium |
| 11 | Remove v5 packages | ⏳ Pending | Low |

### Recommended Migration Order

1. **Design new LocationService abstraction** - The biggest blocker
2. **Migrate to BrowserRouter** - Update `RoutesWrapper.tsx`
3. **Remove CompatRouter** - No longer needed after step 2
4. **Update all imports** - Find/replace across codebase
5. **Remove deprecated packages** - `react-router-dom-v5-compat`, `history`

## File Reference with Migration Status

| Component | File Path | Status |
|-----------|-----------|--------|
| AppWrapper | `public/app/AppWrapper.tsx` | ⚪ Neutral |
| RouterWrapper | `public/app/routes/RoutesWrapper.tsx` | 🟡 Bridge |
| Route Definitions | `public/app/routes/routes.tsx` | 🟢 v6 Ready |
| GrafanaRoute | `public/app/core/navigation/GrafanaRoute.tsx` | 🟢 v6 Ready |
| GrafanaRouteWrapper | `public/app/core/navigation/GrafanaRoute.tsx` | 🟢 v6 Ready |
| RouteDescriptor Type | `public/app/core/navigation/types.ts` | 🟡 Bridge |
| LocationService | `packages/grafana-runtime/src/services/LocationService.tsx` | 🔴 Legacy |
| SafeDynamicImport | `public/app/core/components/DynamicImports/SafeDynamicImport.tsx` | ⚪ Neutral |
| Link Component | `packages/grafana-ui/src/components/Link/Link.tsx` | 🟢 v6 Ready |
| TestProvider | `public/test/helpers/TestProvider.tsx` | 🟡 Bridge |

## Migration Status Legend

| Symbol | Status | Meaning |
|--------|--------|---------|
| 🔴 | Legacy | Using v5 APIs directly; requires significant refactoring |
| 🟡 | Bridge | Using v5-compat; will need import updates |
| 🟢 | v6 Ready | Using v6-compatible APIs; only import changes needed |
| ⚪ | Neutral | Not router-specific; no migration needed |
