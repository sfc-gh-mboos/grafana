import { NavModelItem } from '@grafana/data';

export interface BookmarkPreferenceItem {
  url: string;
  category?: string;
  tags?: string[];
}

interface RawBookmarkPreferenceItem {
  url?: string;
  category?: string;
  tags?: string[];
}

interface NavbarPreferenceWithMetadata {
  bookmarkUrls?: string[];
  bookmarkItems?: RawBookmarkPreferenceItem[];
}

const URL_SEGMENT_SEPARATOR = /[/?#=&]+/;

const normalizeCategory = (category?: string) => {
  const trimmed = category?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeTags = (tags?: string[]) => {
  const unique = new Set<string>();

  for (const tag of tags ?? []) {
    const trimmed = tag.trim();
    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return unique.size ? Array.from(unique) : undefined;
};

const getUrlSegments = (url: string) => {
  return url
    .split(URL_SEGMENT_SEPARATOR)
    .map((segment) => segment.replace(/[-_]/g, ' ').trim())
    .filter(Boolean);
};

const deriveCategory = (url: string, navItem?: NavModelItem) => {
  if (navItem?.parentItem?.id && navItem.parentItem.id !== 'bookmarks' && navItem.parentItem.text) {
    return navItem.parentItem.text;
  }

  if (navItem?.text) {
    return navItem.text;
  }

  return getUrlSegments(url)[0];
};

const deriveTags = (url: string, navItem?: NavModelItem) => {
  const candidateTags = [
    ...(navItem?.parentItem?.text && navItem.parentItem.id !== 'bookmarks' ? [navItem.parentItem.text] : []),
    ...getUrlSegments(url),
  ];

  return normalizeTags(candidateTags);
};

export const withDerivedBookmarkMetadata = (bookmark: BookmarkPreferenceItem, navItem?: NavModelItem): BookmarkPreferenceItem => {
  const category = normalizeCategory(bookmark.category) ?? deriveCategory(bookmark.url, navItem);
  const tags = normalizeTags(bookmark.tags) ?? deriveTags(bookmark.url, navItem);

  return {
    url: bookmark.url,
    ...(category ? { category } : {}),
    ...(tags ? { tags } : {}),
  };
};

export const createBookmarkPreferenceItem = (navItem: NavModelItem): BookmarkPreferenceItem | null => {
  if (!navItem.url) {
    return null;
  }

  return withDerivedBookmarkMetadata({ url: navItem.url }, navItem);
};

export const normalizeBookmarkPreferences = (navbar?: NavbarPreferenceWithMetadata): BookmarkPreferenceItem[] => {
  const items: BookmarkPreferenceItem[] = [];
  const seenUrls = new Set<string>();

  for (const item of navbar?.bookmarkItems ?? []) {
    if (!item?.url || seenUrls.has(item.url)) {
      continue;
    }

    items.push(
      withDerivedBookmarkMetadata({
        url: item.url,
        category: item.category,
        tags: item.tags,
      })
    );
    seenUrls.add(item.url);
  }

  for (const url of navbar?.bookmarkUrls ?? []) {
    if (!url || seenUrls.has(url)) {
      continue;
    }

    items.push(withDerivedBookmarkMetadata({ url }));
    seenUrls.add(url);
  }

  return items;
};
