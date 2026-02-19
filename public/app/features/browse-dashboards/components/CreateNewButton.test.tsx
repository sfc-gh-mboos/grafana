import { screen, waitFor, within } from '@testing-library/react';
import { render } from 'test/test-utils';

import { config } from '@grafana/runtime';
import { useCreateFolder } from 'app/api/clients/folder/v1beta1/hooks';
import { ManagerKind } from 'app/features/apiserver/types';
import { useIsProvisionedInstance } from 'app/features/provisioning/hooks/useIsProvisionedInstance';
import { FolderDTO } from 'app/types/folders';

import { mockFolderDTO } from '../fixtures/folder.fixture';

import CreateNewButton from './CreateNewButton';

const mockNavigate = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('app/api/clients/folder/v1beta1/hooks', () => ({
  ...jest.requireActual('app/api/clients/folder/v1beta1/hooks'),
  useCreateFolder: jest.fn(),
}));

jest.mock('app/features/provisioning/hooks/useIsProvisionedInstance', () => ({
  useIsProvisionedInstance: jest.fn(),
}));

jest.mock('./NewFolderForm', () => ({
  NewFolderForm: ({ onConfirm }: { onConfirm: (folderName: string) => void }) => (
    <button type="button" onClick={() => onConfirm('My new folder')}>
      Confirm new folder
    </button>
  ),
}));

jest.mock('@grafana/runtime', () => {
  return {
    ...jest.requireActual('@grafana/runtime'),
    getDataSourceSrv: () => ({
      getList: jest
        .fn()
        .mockReturnValue([
          { name: 'Test Data Source', uid: 'test-data-source-uid', type: 'grafana-testdata-datasource' },
        ]),
    }),
  };
});

const mockUseIsProvisionedInstance = useIsProvisionedInstance as jest.MockedFunction<typeof useIsProvisionedInstance>;
const mockUseCreateFolder = useCreateFolder as jest.MockedFunction<typeof useCreateFolder>;
const mockCreateFolder = jest.fn();

const mockParentFolder = mockFolderDTO();

async function renderAndOpen(folder?: FolderDTO) {
  const { user } = render(
    <CreateNewButton canCreateDashboard canCreateFolder parentFolder={folder} isReadOnlyRepo={false} />
  );
  const newButton = screen.getByText('New');
  await user.click(newButton);
}

describe('NewActionsButton', () => {
  beforeEach(() => {
    mockUseIsProvisionedInstance.mockReturnValue(false);
    mockUseCreateFolder.mockReturnValue([mockCreateFolder] as unknown as ReturnType<typeof useCreateFolder>);
    mockCreateFolder.mockResolvedValue({});
    mockNavigate.mockReset();
  });
  it('should display the correct urls with a given parent folder', async () => {
    await renderAndOpen(mockParentFolder);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toHaveAttribute(
      'href',
      `/dashboard/new?folderUid=${mockParentFolder.uid}`
    );
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute(
      'href',
      `/dashboard/import?folderUid=${mockParentFolder.uid}`
    );
  });

  it('should display urls without params when there is no parent folder', async () => {
    await renderAndOpen();

    expect(screen.getByRole('link', { name: 'New dashboard' })).toHaveAttribute('href', '/dashboard/new');
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/dashboard/import');
  });

  it('clicking the "New folder" button opens the drawer', async () => {
    const { user } = render(
      <CreateNewButton canCreateDashboard canCreateFolder parentFolder={mockParentFolder} isReadOnlyRepo={false} />
    );

    const newButton = screen.getByText('New');
    await user.click(newButton);
    await user.click(screen.getByText('New folder'));

    const drawer = screen.getByRole('dialog', { name: 'Drawer title New folder' });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'New folder' })).toBeInTheDocument();
    expect(within(drawer).getByText(`Location: ${mockParentFolder.title}`)).toBeInTheDocument();
  });

  it('navigates to the created folder after creating a folder', async () => {
    mockCreateFolder.mockResolvedValue({
      data: { url: '/dashboards/f/new-folder/my-new-folder' },
    });
    const { user } = render(
      <CreateNewButton canCreateDashboard canCreateFolder parentFolder={mockParentFolder} isReadOnlyRepo={false} />
    );

    await user.click(screen.getByText('New'));
    await user.click(screen.getByText('New folder'));
    await user.click(screen.getByRole('button', { name: 'Confirm new folder' }));

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith({
        title: 'My new folder',
        parentUid: mockParentFolder.uid,
        teamOwnerReferences: undefined,
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboards/f/new-folder/my-new-folder');
    });
  });

  it('should only render dashboard items when folder creation is disabled', async () => {
    const { user } = render(<CreateNewButton canCreateDashboard canCreateFolder={false} isReadOnlyRepo={false} />);
    const newButton = screen.getByText('New');
    await user.click(newButton);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.queryByText('New folder')).not.toBeInTheDocument();
  });

  it('should only render folder item when dashboard creation is disabled', async () => {
    const { user } = render(<CreateNewButton canCreateDashboard={false} canCreateFolder isReadOnlyRepo={false} />);
    const newButton = screen.getByText('New');
    await user.click(newButton);

    expect(screen.queryByText('New dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
    expect(screen.getByText('New folder')).toBeInTheDocument();
  });

  it('should hide Import button when folder is provisioned', async () => {
    const provisionedFolder = mockFolderDTO(1, { managedBy: ManagerKind.Repo });
    await renderAndOpen(provisionedFolder);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toBeInTheDocument();
    expect(screen.getByText('New folder')).toBeInTheDocument();
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
  });

  it('should show Import button when folder is not provisioned', async () => {
    const regularFolder = mockFolderDTO(1, { managedBy: undefined });
    await renderAndOpen(regularFolder);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toBeInTheDocument();
    expect(screen.getByText('New folder')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Import' })).toBeInTheDocument();
  });

  it('should hide Import button when entire instance is provisioned', async () => {
    mockUseIsProvisionedInstance.mockReturnValue(true);
    const regularFolder = mockFolderDTO(1, { managedBy: undefined });
    await renderAndOpen(regularFolder);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toBeInTheDocument();
    expect(screen.getByText('New folder')).toBeInTheDocument();
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
  });

  it('should hide Import button when both instance and folder are provisioned', async () => {
    mockUseIsProvisionedInstance.mockReturnValue(true);
    const provisionedFolder = mockFolderDTO(1, { managedBy: ManagerKind.Repo });
    await renderAndOpen(provisionedFolder);

    expect(screen.getByRole('link', { name: 'New dashboard' })).toBeInTheDocument();
    expect(screen.getByText('New folder')).toBeInTheDocument();
    expect(screen.queryByText('Import')).not.toBeInTheDocument();
  });

  describe('Dashboard from template button', () => {
    beforeEach(() => {
      config.featureToggles.dashboardTemplates = true;
    });

    it('should show a `Dashboard from template` button when the feature flag is enabled', async () => {
      await renderAndOpen();
      expect(screen.getByRole('link', { name: 'Dashboard from template' })).toBeInTheDocument();
    });

    it('should not show a `Dashboard from template` button when the feature flag is disabled', async () => {
      config.featureToggles.dashboardTemplates = false;
      await renderAndOpen();
      expect(screen.queryByRole('link', { name: 'Dashboard from template' })).not.toBeInTheDocument();
    });

    it('should redirect the user to the dashboard from template page when the button is clicked', async () => {
      await renderAndOpen();
      const link = screen.getByRole('link', { name: 'Dashboard from template' });
      expect(link).toHaveAttribute('href', '/dashboards?templateDashboards=true&source=createNewButton');
    });
  });
});
