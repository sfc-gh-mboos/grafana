import { NavModelItem } from '@grafana/data';

import { createBookmarkPreferenceItem, normalizeBookmarkPreferences, withDerivedBookmarkMetadata } from './bookmarks';

describe('bookmark preference helpers', () => {
  it('merges bookmarkItems and bookmarkUrls while de-duplicating by url', () => {
    const bookmarks = normalizeBookmarkPreferences({
      bookmarkItems: [{ url: '/admin', category: 'Administration', tags: ['ops', 'ops', ''] }],
      bookmarkUrls: ['/admin', '/dashboards'],
    });

    expect(bookmarks).toEqual([
      { url: '/admin', category: 'Administration', tags: ['ops'] },
      { url: '/dashboards', category: 'dashboards', tags: ['dashboards'] },
    ]);
  });

  it('derives metadata from a nav item when metadata is missing', () => {
    const navItem: NavModelItem = {
      id: 'users',
      text: 'Users',
      url: '/admin/users',
      parentItem: {
        id: 'admin',
        text: 'Administration',
      },
    };

    const bookmark = withDerivedBookmarkMetadata({ url: '/admin/users' }, navItem);
    expect(bookmark.category).toBe('Administration');
    expect(bookmark.tags).toEqual(['Administration', 'admin', 'users']);
  });

  it('creates a bookmark preference item from nav item url', () => {
    const navItem: NavModelItem = {
      id: 'dashboards',
      text: 'Dashboards',
      url: '/dashboards',
    };

    expect(createBookmarkPreferenceItem(navItem)).toEqual({
      url: '/dashboards',
      category: 'Dashboards',
      tags: ['dashboards'],
    });
  });

  it('returns null if a nav item has no url', () => {
    const navItem: NavModelItem = {
      id: 'invalid',
      text: 'Invalid',
    };

    expect(createBookmarkPreferenceItem(navItem)).toBeNull();
  });
});
