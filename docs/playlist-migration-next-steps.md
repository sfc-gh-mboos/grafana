# Playlist migration — next steps

Feature flag: `playlistUseNavigate` (already registered)

## Files to migrate

| Priority | File | Change |
|---|---|---|
| 1 | `public/app/features/playlist/PlaylistEditPage.tsx` | Replace `locationService.push('/playlists')` with `navigate('/playlists')` |
| 2 | `public/app/features/playlist/PlaylistNewPage.tsx` | Replace `locationService.push('/playlists')` with `navigate('/playlists')` |
| 3 | `public/app/features/playlist/StartModal.tsx` | Replace `locationService.push(url)` with `navigate(url)` |
| 4 | `public/app/features/playlist/PlaylistSrv.ts` | Non-React class — inject a `navigate` function via `start()` parameter; also replaces `getHistory().replace()`, `getHistory().listen()`, and `partial()` |

## Tests to update

| File | Current assertion | New assertion |
|---|---|---|
| `PlaylistEditPage.test.tsx` | `locationService.getLocation().pathname` | Mock `useNavigate`; assert `mockNavigate('/playlists')` |
| `PlaylistNewPage.test.tsx` | `locationService.getLocation().pathname` | Mock `useNavigate`; assert `mockNavigate('/playlists')` |

## Order of work

1. Migrate `PlaylistEditPage`, `PlaylistNewPage`, and `StartModal` behind the `playlistUseNavigate` flag.
2. Update their tests.
3. Migrate `PlaylistSrv` using dependency injection — this pattern applies to all non-React services in the broader migration.
4. Remove legacy branches once the flag is fully enabled.
