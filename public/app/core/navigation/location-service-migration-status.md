# Location Service Migration Status

This document tracks the migration status of components from React Router hooks (`useLocation`, `useHistory`, etc.) to Grafana's `locationService` abstraction from `@grafana/runtime`.

## Migration Overview

The migration replaces direct React Router hook usage with `locationService` methods, which provides:

- Consistent navigation API across the application
- Better integration with Grafana's internal routing infrastructure
- Simplified testing without router context requirements

## Migrated Files

### AppNotificationList

- **File:** `public/app/core/components/AppNotifications/AppNotificationList.tsx`
- **Migration Date:** 2026-03-24
- **Previous Pattern:** `useLocation()` from `react-router-dom` with ref to track pathname changes
- **New Pattern:** Direct `locationService.getLocation()` calls inside event handlers
- **Affected Behavior:** Kiosk mode error suppression on dashboard pages - reads current pathname to determine if on `/d/` route
- **Notes:** Simplified implementation by removing the ref pattern; `locationService.getLocation()` is called at event time to get current pathname

### RepositoryStatusPage

- **File:** `public/app/features/provisioning/Repository/RepositoryStatusPage.tsx`
- **Migration Date:** 2026-03-24
- **Previous Pattern:** `useLocation()` from `react-router` to get pathname for tab URL construction
- **New Pattern:** `locationService.getLocation()` for pathname access
- **Affected Behavior:** Tab navigation URL generation - constructs tab hrefs using current pathname
- **Notes:** URL structure and query parameters unchanged; tab navigation behavior preserved

### FileStatusPage

- **File:** `public/app/features/provisioning/File/FileStatusPage.tsx`
- **Migration Date:** 2026-03-27
- **Previous Pattern:** `useLocation()` from `react-router` to get pathname for tab URL construction
- **New Pattern:** `locationService.getLocation()` for pathname access + `useNavigate` from `react-router-dom-v5-compat` with `onChangeTab` handler
- **Affected Behavior:** Tab navigation - constructs tab hrefs using current pathname and navigates programmatically via `useNavigate`
- **Notes:** URL structure and query parameters unchanged; tab clicks now use `event.preventDefault(); navigate(url)` pattern

### TabItemRenderer

- **File:** `public/app/features/dashboard-scene/scene/layout-tabs/TabItemRenderer.tsx`
- **Migration Date:** 2026-03-27
- **Previous Pattern:** `useLocation()` from `react-router` to get location for URL construction via `locationUtil.getUrlForPartial`
- **New Pattern:** `locationService.getLocation()` for location access + `useNavigate` from `react-router-dom-v5-compat` with `onChangeTab` handler
- **Affected Behavior:** Dashboard tab navigation - constructs tab hrefs using current location and navigates programmatically via `useNavigate`
- **Notes:** URL structure unchanged; tab clicks now use `event.preventDefault(); navigate(href)` pattern

## Migration Pattern

When migrating from React Router hooks to `locationService`:

```typescript
// Before
import { useLocation } from 'react-router-dom';

function MyComponent() {
  const location = useLocation();
  const pathname = location.pathname;
  // ...
}

// After
import { locationService } from '@grafana/runtime';

function MyComponent() {
  const location = locationService.getLocation();
  const pathname = location.pathname;
  // ...
}
```

For navigation actions:

```typescript
// Before (if using useHistory or useNavigate)
history.push('/path');
navigate('/path');

// After
locationService.push('/path');
locationService.partial({ tab: 'overview' }); // for query param updates
```

For tab navigation with `useNavigate` (programmatic navigation while keeping href for link semantics):

```typescript
// Before
import { useLocation } from 'react-router';

function MyTabComponent() {
  const location = useLocation();
  const tabUrl = urlUtil.renderUrl(location.pathname, { tab: 'overview' });
  return <Tab href={tabUrl} label="Overview" />;
}

// After
import { useNavigate } from 'react-router-dom-v5-compat';
import { locationService } from '@grafana/runtime';

function MyTabComponent() {
  const location = locationService.getLocation();
  const navigate = useNavigate();
  const tabUrl = urlUtil.renderUrl(location.pathname, { tab: 'overview' });
  return (
    <Tab
      href={tabUrl}
      label="Overview"
      onChangeTab={(e) => {
        e.preventDefault();
        navigate(tabUrl);
      }}
    />
  );
}
```
