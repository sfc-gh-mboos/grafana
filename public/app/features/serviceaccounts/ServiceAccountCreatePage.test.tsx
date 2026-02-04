import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { ServiceAccountCreatePage, Props } from './ServiceAccountCreatePage';

const createServiceAccountMock = jest.fn();
const updateServiceAccountMock = jest.fn();

jest.mock('@grafana/api-clients/rtkq/legacy', () => ({
  ...jest.requireActual('@grafana/api-clients/rtkq/legacy'),
  useCreateServiceAccountMutation: () => [createServiceAccountMock, {}],
  useUpdateServiceAccountMutation: () => [updateServiceAccountMock, {}],
}));

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  config: {
    ...jest.requireActual('@grafana/runtime').config,
    loginError: false,
    buildInfo: {
      version: 'v1.0',
      commit: '1',
      env: 'production',
      edition: 'Open Source',
    },
    licenseInfo: {
      stateInfo: '',
      licenseUrl: '',
    },
    appSubUrl: '',
    featureToggles: {},
  },
}));

jest.mock('app/core/services/context_srv', () => ({
  contextSrv: {
    licensedAccessControlEnabled: () => false,
    hasPermission: () => true,
    hasPermissionInMetadata: () => true,
    user: { orgId: 1 },
    fetchUserPermissions: () => Promise.resolve(),
  },
}));

const createServiceAccountResponse = {
  avatarUrl: '',
  id: 1,
  uid: 'service-account-uid',
  isDisabled: false,
  login: 'service-account-login',
  name: 'Data source scavenger',
  orgId: 1,
  role: 'Viewer',
  tokens: 0,
};

beforeEach(() => {
  createServiceAccountMock.mockReturnValue({
    unwrap: () => Promise.resolve(createServiceAccountResponse),
  });
  updateServiceAccountMock.mockReturnValue({
    unwrap: () => Promise.resolve({}),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const setup = (propOverrides: Partial<Props>) => {
  const props: Props = {
    navModel: {
      main: {
        text: 'Configuration',
      },
      node: {
        text: 'Service accounts',
      },
    },
  };

  Object.assign(props, propOverrides);

  render(
    <TestProvider>
      <ServiceAccountCreatePage {...props} />
    </TestProvider>
  );
};

describe('ServiceAccountCreatePage tests', () => {
  it('Should display service account create page', () => {
    setup({});
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('Should fire form validation error if name is not set', async () => {
    setup({});
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Display name is required')).toBeInTheDocument();
  });

  it('Should call API with proper params when creating new service account', async () => {
    setup({});
    await userEvent.type(screen.getByLabelText('Display name *'), 'Data source scavenger');
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createServiceAccountMock).toHaveBeenCalledWith({
        createServiceAccountForm: {
          name: 'Data source scavenger',
          role: 'Viewer',
        },
      })
    );
    await waitFor(() =>
      expect(updateServiceAccountMock).toHaveBeenCalledWith({
        serviceAccountId: 1,
        updateServiceAccountForm: {
          name: 'Data source scavenger',
          role: 'Viewer',
        },
      })
    );
  });
});
