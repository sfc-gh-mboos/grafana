import { render, screen, userEvent } from 'test/test-utils';
import { waitFor } from '@testing-library/react';

import { appEvents } from 'app/core/app_events';
import { ManagerKind } from 'app/features/apiserver/types';
import { ShowModalReactEvent } from 'app/types/events';

import {
  useDeleteFolderMutationFacade,
  useMoveFolderMutationFacade,
} from '../../../api/clients/folder/v1beta1/hooks';
import { mockFolderDTO } from '../fixtures/folder.fixture';
import * as permissions from '../permissions';

import { DeleteModal } from './BrowseActions/DeleteModal';
import { MoveModal } from './BrowseActions/MoveModal';
import { FolderActionsButton } from './FolderActionsButton';

const mockNavigate = jest.fn();
const mockMoveFolder = jest.fn();
const mockDeleteFolder = jest.fn();

jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../api/clients/folder/v1beta1/hooks', () => ({
  ...jest.requireActual('../../../api/clients/folder/v1beta1/hooks'),
  useMoveFolderMutationFacade: jest.fn(),
  useDeleteFolderMutationFacade: jest.fn(),
}));

// Mock out the Permissions component for now
jest.mock('app/core/components/AccessControl/Permissions', () => ({
  Permissions: () => <div>Hello!</div>,
}));

const managePermissionsLabel = /Manage permissions/i;
const moveMenuItemLabel = /Move this folder/i;
const deleteMenuItemLabel = /Delete this folder/i;
const mockUseMoveFolderMutationFacade = useMoveFolderMutationFacade as jest.MockedFunction<
  typeof useMoveFolderMutationFacade
>;
const mockUseDeleteFolderMutationFacade = useDeleteFolderMutationFacade as jest.MockedFunction<
  typeof useDeleteFolderMutationFacade
>;

describe('browse-dashboards FolderActionsButton', () => {
  const mockFolder = mockFolderDTO();
  const mockPermissions = {
    canCreateDashboards: true,
    canEditDashboards: true,
    canCreateFolders: true,
    canDeleteFolders: true,
    canEditFolders: true,
    canViewPermissions: true,
    canSetPermissions: true,
    canDeleteDashboards: true,
  };

  beforeEach(() => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => mockPermissions);
    mockUseMoveFolderMutationFacade.mockReturnValue([
      mockMoveFolder,
    ] as unknown as ReturnType<typeof useMoveFolderMutationFacade>);
    mockUseDeleteFolderMutationFacade.mockReturnValue(
      mockDeleteFolder as unknown as ReturnType<typeof useDeleteFolderMutationFacade>
    );
    mockDeleteFolder.mockResolvedValue({});
    mockMoveFolder.mockResolvedValue({});
    mockNavigate.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not render anything when the user has no permissions to do anything', () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canDeleteFolders: false,
        canEditFolders: false,
        canViewPermissions: false,
        canSetPermissions: false,
      };
    });
    render(<FolderActionsButton folder={mockFolder} />);
    expect(screen.queryByRole('button', { name: 'Folder actions' })).not.toBeInTheDocument();
  });

  it('renders a "Folder actions" button when the user has permissions to do something', () => {
    render(<FolderActionsButton folder={mockFolder} />);
    expect(screen.getByRole('button', { name: 'Folder actions' })).toBeInTheDocument();
  });

  it('renders all the options if the user has full permissions', async () => {
    const { user } = render(<FolderActionsButton folder={mockFolder} />);

    await user.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.getByRole('menuitem', { name: managePermissionsLabel })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: moveMenuItemLabel })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });

  it('does not render the "Manage permissions" option if the user does not have permission to view permissions', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canViewPermissions: false,
      };
    });
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.queryByRole('menuitem', { name: managePermissionsLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: moveMenuItemLabel })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });

  it('does not render the "Move" option if the user does not have permission to edit', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canEditFolders: false,
      };
    });
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.getByRole('menuitem', { name: managePermissionsLabel })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: moveMenuItemLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });

  it('does not render the "Delete" option if the user does not have permission to delete', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canDeleteFolders: false,
      };
    });
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.getByRole('menuitem', { name: managePermissionsLabel })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: moveMenuItemLabel })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: deleteMenuItemLabel })).not.toBeInTheDocument();
  });

  it('clicking the "Manage permissions" option opens the permissions drawer', async () => {
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: managePermissionsLabel }));
    expect(screen.getByRole('dialog', { name: 'Drawer title Manage permissions' })).toBeInTheDocument();
  });

  it('clicking the "Move" option opens the move modal', async () => {
    jest.spyOn(appEvents, 'publish');
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: moveMenuItemLabel }));
    expect(appEvents.publish).toHaveBeenCalledWith(
      new ShowModalReactEvent(
        expect.objectContaining({
          component: MoveModal,
        })
      )
    );
  });

  it('clicking the "Delete" option opens the delete modal', async () => {
    jest.spyOn(appEvents, 'publish');
    render(<FolderActionsButton folder={mockFolder} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: deleteMenuItemLabel }));
    expect(appEvents.publish).toHaveBeenCalledWith(
      new ShowModalReactEvent(
        expect.objectContaining({
          component: DeleteModal,
        })
      )
    );
  });

  it('navigates to parent folder after successful delete', async () => {
    jest.spyOn(appEvents, 'publish');
    const folderWithParent = {
      ...mockFolder,
      parents: [{ uid: 'parent-folder-uid', title: 'Parent folder', url: '/dashboards/f/parent-folder-uid/parent' }],
    };

    render(<FolderActionsButton folder={folderWithParent} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: deleteMenuItemLabel }));

    const publishedEvent = (appEvents.publish as jest.Mock).mock.calls.at(-1)?.[0] as ShowModalReactEvent;
    await publishedEvent.payload.props.onConfirm();

    await waitFor(() => {
      expect(mockDeleteFolder).toHaveBeenCalledWith(folderWithParent);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboards/f/parent-folder-uid/parent');
    });
  });

  // Git sync related tests
  it('does not render the "Manage permissions" option if folder is provisioned', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canViewPermissions: false,
      };
    });
    render(<FolderActionsButton folder={{ ...mockFolder, managedBy: ManagerKind.Repo }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.queryByRole('menuitem', { name: managePermissionsLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });

  it('does not render the "Move" option if folder is provisioned and is root repo folder', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canViewPermissions: false,
      };
    });
    render(<FolderActionsButton folder={{ ...mockFolder, managedBy: ManagerKind.Repo, parentUid: undefined }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.queryByRole('menuitem', { name: moveMenuItemLabel })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });

  it('does render the "Move" option if folder is provisioned and is NOT root repo folder', async () => {
    jest.spyOn(permissions, 'getFolderPermissions').mockImplementation(() => {
      return {
        ...mockPermissions,
        canViewPermissions: false,
      };
    });
    render(<FolderActionsButton folder={{ ...mockFolder, managedBy: ManagerKind.Repo, parentUid: '123' }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Folder actions' }));
    expect(screen.getByRole('menuitem', { name: moveMenuItemLabel })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: deleteMenuItemLabel })).toBeInTheDocument();
  });
});
