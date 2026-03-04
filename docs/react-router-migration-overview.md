# React Router migration overview

This document tracks the ongoing migration of Grafana's frontend routing from React Router v5 with the `locationService` singleton to React Router v6 using the `useNavigate` hook.

## Current architecture

Grafana uses a **transitional hybrid architecture** that bridges React Router v5 and v6:

```
┌─────────────────────────────────────────────────────────────┐
│                        AppWrapper                           │
│  Redux Provider → ThemeProvider → KBarProvider → ...        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              RouterWrapper (RoutesWrapper.tsx)         │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  <Router history={locationService.getHistory()}> │  │  │
│  │  │  (React Router v5)                              │  │  │
│  │  │                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │  <LocationServiceProvider>                │  │  │  │
│  │  │  │                                           │  │  │  │
│  │  │  │  ┌───────────────────────────────────┐    │  │  │  │
│  │  │  │  │  <CompatRouter>                   │    │  │  │  │
│  │  │  │  │  (react-router-dom-v5-compat)     │    │  │  │  │
│  │  │  │  │                                   │    │  │  │  │
│  │  │  │  │  ┌─────────────────────────────┐  │    │  │  │  │
│  │  │  │  │  │  <Routes> / <Route>         │  │    │  │  │  │
│  │  │  │  │  │  (v6 API via compat layer)  │  │    │  │  │  │
│  │  │  │  │  │                             │  │    │  │  │  │
│  │  │  │  │  │  GrafanaRouteWrapper        │  │    │  │  │  │
│  │  │  │  │  │  └─ auth / access control   │  │    │  │  │  │
│  │  │  │  │  │  └─ GrafanaRoute            │  │    │  │  │  │
│  │  │  │  │  │     └─ ErrorBoundary        │  │    │  │  │  │
│  │  │  │  │  │     └─ Suspense             │  │    │  │  │  │
│  │  │  │  │  │     └─ Page Component       │  │    │  │  │  │
│  │  │  │  │  └─────────────────────────────┘  │    │  │  │  │
│  │  │  │  └───────────────────────────────────┘    │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key components

| Layer | Package / Version | Role |
|---|---|---|
| Outer router | `react-router-dom` v5.3.4 | Root `<Router>` consuming `history` v4 |
| History | `history` v4 via `locationService` | Single history instance shared across patterns |
| Compat bridge | `react-router-dom-v5-compat` v6.26.1 | `<CompatRouter>` enables v6 hooks inside v5 tree |
| Route rendering | v6 `<Routes>` / `<Route>` | Route matching and rendering |
| Navigation (legacy) | `locationService` singleton | `push()`, `replace()`, `partial()` — imperative API |
| Navigation (modern) | `useNavigate()` hook | React hook from v5-compat — declarative API |

Both navigation patterns work because they share the same underlying `history` instance owned by `locationService`.

## Migration progress

### Summary

```
                  Migration status (source files)
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  Legacy only (locationService)  ████████████████████  145 │
  │  Migrated (useNavigate)         ██                    16 │
  │  Partially migrated             ▏                      1 │
  │                                                          │
  │  Total files with navigation calls: 162                  │
  └──────────────────────────────────────────────────────────┘
```

- **145 files** use only `locationService` for navigation
- **16 files** use only `useNavigate` (fully migrated)
- **1 file** uses both patterns (partially migrated)
- **~10% of navigation files have been migrated to `useNavigate`**

### Navigation API usage counts

| API | Files |
|---|---|
| `locationService.push()` | 80 |
| `locationService.partial()` | 54 |
| `locationService.replace()` | 23 |
| `useNavigate()` | 17 |

### Breakdown by feature area

| Area | Legacy nav files | useNavigate files | Status |
|---|---:|---:|---|
| **Dashboards** (dashboard + dashboard-scene + browse-dashboards) | 67 | 0 | Not started |
| **Alerting** | 22 | 1 | Early |
| **Provisioning** | 2 | 14 | Nearly complete |
| **Scopes** | 6 | 0 | Not started |
| **Playlist** | 5 | 0 | Not started |
| **Variables** | 5 | 0 | Not started |
| **Explore** | 4 | 0 | Not started |
| **Plugins** | 4 | 0 | Not started |
| **Admin** | 2 | 1 | Early |
| **Core** (keybindings, chrome, navigation) | 8 | 0 | Not started |
| **Other** (connections, search, teams, etc.) | 21 | 1 | Early |

### What's been migrated

The **provisioning** feature is the most advanced, with 14 of 16 navigation files already using `useNavigate`. This includes:

- `ConfigForm.tsx`, `ConnectionForm.tsx`, `ProvisioningWizard.tsx`
- Delete/move/save forms for provisioned dashboards and folders
- Wizard navigation hooks (`useWizardCancellation`, `useWizardNavigation`)

A few other areas have early adoption:

- `features/admin/UserCreatePage.tsx`
- `features/alerting/.../ConfirmVersionRestoreModal.tsx`
- `features/gops/configuration-tracker/components/ConfigureIRM.tsx`

### What remains

The largest migration surfaces are:

1. **Dashboards** — 67 files across `dashboard`, `dashboard-scene`, and `browse-dashboards`
2. **Alerting** — 22 files with legacy navigation
3. **Core infrastructure** — `interceptLinkClicks.ts`, `keybindingSrv.ts`, `AppChromeService.tsx`
4. **Playlist** — 5 files using `locationService.push`
5. **Scopes** — 6 files using all three legacy APIs

## Migration approach

### Feature flag strategy

Each migration is gated behind a feature flag to enable safe, incremental rollout. Flags follow the naming convention `{feature}UseNavigate` and are defined in `pkg/services/featuremgmt/registry.go`.

No `UseNavigate` feature flags have been registered yet — the provisioning area migrated directly without flags. Future migrations of larger surfaces (dashboards, alerting) will likely require flags.

### Pattern: feature-flagged dual navigation

```typescript
import { config, locationService } from '@grafana/runtime';
import { useNavigate } from 'react-router-dom-v5-compat';

const navigate = useNavigate();

if (config.featureToggles.dashboardUseNavigate) {
  navigate('/d/abc123');
} else {
  locationService.push('/d/abc123');
}
```

This pattern preserves the legacy path as a fallback until the feature flag is fully enabled and the old code path can be removed.

### End state

The migration's goal is to:

1. Remove the `locationService` singleton as the navigation mechanism
2. Remove the v5 `<Router>` and `<CompatRouter>` bridge
3. Use React Router v6 natively with `useNavigate`, `useLocation`, and `useParams`
4. Remove the global link click interceptor that routes `<a>` clicks through `locationService`

```
  Target architecture (post-migration)
  ┌──────────────────────────────────────┐
  │  <BrowserRouter>  (React Router v6)  │
  │                                      │
  │  ┌──────────────────────────────┐    │
  │  │  <Routes>                    │    │
  │  │    <Route element={...} />   │    │
  │  │    ...                       │    │
  │  └──────────────────────────────┘    │
  │                                      │
  │  Navigation: useNavigate() only      │
  │  Location:   useLocation() only      │
  │  Params:     useParams() only        │
  └──────────────────────────────────────┘
```

## Key files

| File | Purpose |
|---|---|
| `public/app/routes/RoutesWrapper.tsx` | Root router setup (v5 Router + CompatRouter bridge) |
| `public/app/routes/routes.tsx` | Route definitions (`getAppRoutes()`) |
| `public/app/AppWrapper.tsx` | App root, provider hierarchy, route rendering |
| `public/app/app.ts` | Bootstrap, registers link click interceptor |
| `public/app/core/navigation/GrafanaRoute.tsx` | Route wrapper (auth + rendering + analytics) |
| `public/app/core/navigation/patch/interceptLinkClicks.ts` | Global `<a>` click → `locationService.push()` |
| `packages/grafana-runtime/src/services/LocationService.tsx` | `locationService` singleton (legacy navigation) |
| `pkg/services/featuremgmt/registry.go` | Feature flag definitions |
| `.cursor/skills/react-router-migration/SKILL.md` | Step-by-step migration guide for contributors |

## Risks and considerations

- **Dashboards are the largest surface.** With 67 files, this area needs careful planning and likely a phased rollout with feature flags.
- **Non-React code uses `locationService`.** Services like `keybindingSrv.ts` and `interceptLinkClicks.ts` aren't React components and can't use `useNavigate` directly. These require architectural changes (e.g., passing a navigate function via context or restructuring as React components).
- **`locationService.partial()` has no direct `useNavigate` equivalent.** The 54 files using `partial()` for query-param-only updates need a wrapper or utility built on top of `useNavigate` + `useLocation`.
- **Test files reference `locationService`.** Many test files assert against `locationService.getLocation()`. Each migration requires updating corresponding tests to mock `useNavigate` instead.
- **The global link click interceptor** in `interceptLinkClicks.ts` funnels all `<a>` clicks through `locationService.push()`. This must be replaced with a React Router-aware mechanism.
