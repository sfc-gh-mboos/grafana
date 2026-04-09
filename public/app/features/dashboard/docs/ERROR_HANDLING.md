# Dashboard error handling patterns

This document describes the error handling patterns used in the dashboard feature's React components.

## Overview

All React components that make API calls must provide meaningful error feedback to users. Silent failures (logging only to console) or missing error handling are not acceptable.

## Error handling patterns

### Functional components with hooks

Use the `useAsyncRetry` hook from `react-use` for API calls that should display errors to users.

```tsx
import { useAsyncRetry } from 'react-use';
import { Alert, Button, Stack } from '@grafana/ui';
import { Trans, t } from '@grafana/i18n';

function MyComponent() {
  const { value, loading, error, retry } = useAsyncRetry(async () => {
    return await fetchData();
  }, [dependency]);

  if (error) {
    return (
      <Stack direction="column" alignItems="center" gap={2}>
        <Alert
          title={t('my-component.error-title', 'Error loading data')}
          severity="error"
        >
          <Trans i18nKey="my-component.error-description">
            Failed to load data. Please try again.
          </Trans>
        </Alert>
        <Button variant="secondary" onClick={retry}>
          <Trans i18nKey="my-component.retry">Retry</Trans>
        </Button>
      </Stack>
    );
  }

  return <div>{/* normal content */}</div>;
}
```

### Class components

For class components, maintain an error state and display error alerts.

```tsx
import { PureComponent } from 'react';
import { Alert } from '@grafana/ui';
import { t } from '@grafana/i18n';

interface State {
  error: string | null;
  // other state...
}

class MyClassComponent extends PureComponent<Props, State> {
  state: State = {
    error: null,
  };

  fetchData = async () => {
    try {
      this.setState({ error: null });
      const data = await api.getData();
      // handle success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      this.setState({
        error: t('my-component.fetch-error', 'Failed to load data: {{errorMessage}}', { errorMessage }),
      });
    }
  };

  render() {
    const { error } = this.state;

    return (
      <>
        {error && (
          <Alert
            title={t('my-component.error-title', 'Error')}
            severity="error"
            onRemove={() => this.setState({ error: null })}
          >
            {error}
          </Alert>
        )}
        {/* normal content */}
      </>
    );
  }
}
```

### Using app notifications

For operations that don't have inline error display (like restore operations), use app notifications.

```tsx
import { useAppNotification } from 'app/core/copy/appNotification';

function MyComponent() {
  const notifyApp = useAppNotification();

  const handleAction = async () => {
    try {
      await performAction();
      notifyApp.success('Action completed', 'The action was successful');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      notifyApp.error('Action failed', errorMessage);
    }
  };
}
```

For class components, use `appEvents`:

```tsx
import { AppEvents } from '@grafana/data';
import { appEvents } from 'app/core/app_events';

class MyClassComponent extends PureComponent<Props, State> {
  handleAction = async () => {
    try {
      await performAction();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      appEvents.emit(AppEvents.alertError, ['Action failed', errorMessage]);
    }
  };
}
```

## Translation keys

All error messages should be translatable using the `@grafana/i18n` package.

- Use descriptive translation keys following the pattern: `component-name.error-type`
- Include dynamic content like error messages using template interpolation

Example:

```tsx
t('dashboard-settings.versions.fetch-error', 'Failed to fetch version history: {{errorMessage}}', {
  errorMessage,
});
```

## Components with updated error handling

The following components have been updated with proper error handling:

| Component | File | Error handling method |
|-----------|------|----------------------|
| ShareSnapshot | `ShareModal/ShareSnapshot.tsx` | Inline Alert with state |
| VersionsSettings | `DashboardSettings/VersionsSettings.tsx` | Inline Alert with state |
| DashboardLibrarySection | `DashboardLibrary/DashboardLibrarySection.tsx` | Inline Alert with retry |
| SuggestedDashboards | `DashboardLibrary/SuggestedDashboards.tsx` | Inline Alert with retry |
| TemplateDashboardModal | `DashboardLibrary/TemplateDashboardModal.tsx` | Inline Alert with retry |
| useDashboardRestore | `VersionHistory/useDashboardRestore.tsx` | App notification |
| DashboardLinksDashboard | `SubMenu/DashboardLinksDashboard.tsx` | Inline error button with retry |
| PanelStateWrapper | `dashgrid/PanelStateWrapper.tsx` | App events alert |

## Testing error handling

When adding or modifying error handling, ensure tests cover:

1. Error state display when API calls fail
2. Retry functionality works correctly
3. Error messages are properly formatted

Example test:

```tsx
it('should show error state when fetching fails', async () => {
  mockFetch.mockRejectedValue(new Error('Network error'));

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```
