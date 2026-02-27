import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'test/test-utils';

import { NavModelItem } from '@grafana/data';
import { configureStore } from 'app/store/configureStore';

import BookmarksPage from './BookmarksPage';

const mockedUsePinnedItems = jest.fn();

jest.mock('app/core/components/AppChrome/MegaMenu/hooks', () => ({
  usePinnedItems: () => mockedUsePinnedItems(),
}));

const setup = () => {
  const navBarTree: NavModelItem[] = [
    {
      id: 'bookmarks',
      text: 'Bookmarks',
      url: '/bookmarks',
    },
    {
      id: 'dashboards',
      text: 'Dashboards',
      url: '/dashboards',
      subTitle: 'Open dashboards',
    },
    {
      id: 'admin',
      text: 'Administration',
      url: '/admin',
      children: [
        {
          id: 'admin-users',
          text: 'Users',
          url: '/admin/users',
          subTitle: 'Manage users',
        },
      ],
    },
  ];

  const store = configureStore({ navBarTree });
  return render(<BookmarksPage />, { store });
};

describe('BookmarksPage', () => {
  afterEach(() => {
    mockedUsePinnedItems.mockReset();
  });

  it('renders grouped bookmarks with tag metadata', async () => {
    mockedUsePinnedItems.mockReturnValue([
      { url: '/dashboards', category: 'Observability', tags: ['dashboards'] },
      { url: '/admin/users', category: 'Administration', tags: ['users'] },
    ]);

    setup();

    expect(await screen.findByRole('heading', { name: 'Administration' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Observability' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Dashboards' })).toBeInTheDocument();
    expect(await screen.findByText('users')).toBeInTheDocument();
  });

  it('filters bookmarks by search text', async () => {
    mockedUsePinnedItems.mockReturnValue([
      { url: '/dashboards', category: 'Observability', tags: ['dashboards'] },
      { url: '/admin/users', category: 'Administration', tags: ['users'] },
    ]);

    setup();

    await userEvent.type(screen.getByPlaceholderText('Search bookmarks'), 'users');

    expect(await screen.findByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboards' })).not.toBeInTheDocument();
  });

  it('shows existing empty state when no bookmarks exist', async () => {
    mockedUsePinnedItems.mockReturnValue([]);

    setup();

    expect(await screen.findByText(/created any bookmarks yet/i)).toBeInTheDocument();
  });
});
