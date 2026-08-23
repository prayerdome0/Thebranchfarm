# PWA & Platform Upgrades — The Branch Farm

This document describes all upgrades implemented in this branch.

## 1. Full PWA Implementation

### Before
- Minimal `sw.js` that only cached `/media/`, `/logo.png`, `/_next/static/`
- Single icon in manifest (`/logo.png` with `sizes: any`)
- ServiceWorkerRegister only in production, no update handling
- No offline fallback page
- No install prompt

### After
- **Complete service worker** (`public/sw.js` v2):
  - Versioned caches: `branch-farm-static-v2`, `branch-farm-images-v2`, `branch-farm-pages-v2`
  - Precache of app shell: `/`, `/offline`, `/shop`, icons, hero image
  - Strategies:
    - Navigation: Network-first → Cache → Offline page (`/offline`) → `/`
    - Static assets (`/_next/static`, `/media`, `/icons`): Stale-while-revalidate
    - Images (Cloudinary, Firebase Storage, `request.destination === image`): Cache-first + background revalidation
    - API (`/api/products`, `/api/videos`, `/api/settings`): Network-first with 5-min TTL, others network-only
  - Message handling for `SKIP_WAITING` and `GET_VERSION`
  - Push notification handling (`push`, `notificationclick`)
  - Background sync placeholder (`sync-orders`)
  - Cleanup of old caches on activate
  - Client notification on activation

- **Enhanced manifest** (`src/app/manifest.ts`):
  - 12 icons: 72, 96, 128, 144, 152, 192, 256, 384, 512 (any) + 192, 512 maskable + fallback logo
  - `display_override`: window-controls-overlay, standalone, browser
  - `categories`: shopping, food, business, agriculture, lifestyle
  - `orientation: any`, `scope: /`, `id: /`, `lang: en`, `dir: ltr`
  - `launch_handler: navigate-existing`
  - `handle_links: preferred`, `edge_side_panel`
  - `screenshots`: farm-hero (wide) + vegetable-garden (narrow)
  - `shortcuts`: Shop, Track Order, Our Farm, Dashboard (with icons)
  - `share_target`: action `/shop`, method GET
  - `file_handlers`: images and videos to `/media`
  - `related_applications: []`

- **Icons** (`public/icons/`):
  - Generated from `/logo.png` via ImageMagick
  - Standard: 72, 96, 128, 144, 152, 192, 256, 384, 512
  - Maskable: 192, 512 with `#0c281d` background and 80% safe area
  - Apple touch: 180, plus favicon 32, 16
  - `apple-touch-icon.png` copied to root for iOS

- **Offline experience**:
  - `src/app/(store)/offline/page.tsx`: Full offline page with cached content info, farm location, contact, tips
  - `public/offline.html`: Static HTML fallback for when Next.js offline route fails, with auto-reload on `online` event
  - `src/components/store/OfflineClient.tsx`: Client retry button
  - Offline page is precached on SW install

- **PWA Components**:
  - `src/lib/pwa.ts`: Utilities — `BeforeInstallPromptEvent`, deferred prompt storage, `isPWAInstalled`, `isStandalone`, `promptInstall`, `setAppBadge`, `shareContent`, feature detection
  - `src/hooks/usePWAInstall.ts`: Tracks `beforeinstallprompt`, `appinstalled`, display-mode changes, provides `isInstallable`, `isInstalled`, `install()`, `dismiss()`
  - `src/hooks/useOnlineStatus.ts`: Tracks `navigator.onLine`, `online`/`offline` events, `wasOffline`
  - `src/hooks/useShare.ts`: Web Share API with clipboard fallback
  - `src/components/ui/PWAInstallPrompt.tsx`: Bottom banner that appears 3s after installable, with dismiss persistence (7 days via localStorage)
  - `src/components/ui/PWAUpdatePrompt.tsx`: Shows when new SW is waiting, allows user to trigger `SKIP_WAITING` and reload
  - `src/components/ui/OfflineIndicator.tsx`: Top bar showing offline/reconnected status
  - `src/components/ui/ServiceWorkerRegister.tsx`: Enhanced registration, periodic update checks (60min), handles `updatefound`, `controllerchange`, stores deferred prompt globally

- **Providers** (`src/app/providers.tsx`):
  - Includes `OfflineIndicator`, `PWAInstallPrompt`, `PWAUpdatePrompt` alongside `ServiceWorkerRegister`

- **Layout** (`src/app/layout.tsx`):
  - Full icon set: 72, 96, 128, 192, 512, 32, 16, apple 180
  - Apple web app: `capable`, `statusBarStyle: black-translucent`, `startupImage`
  - `mobile-web-app-capable`, `msapplication-TileColor`, `TileImage`
  - Viewport: `viewportFit: cover`, `maximumScale: 5`, `colorScheme: light dark`, dual themeColor for light/dark
  - Preconnect to Cloudinary and Firebase Storage
  - Additional `<head>` links for apple-touch-icon, favicon, mask-icon
  - `<noscript>` fallback

- **Install page** (`src/app/(store)/install/page.tsx`):
  - Dedicated page explaining installation on Android, iOS, Desktop
  - Benefits grid: Faster, Offline, Easy Shopping, Updates, Secure, Lightweight
  - App features list

## 2. Platform Upgrades

### Next.js Config (`next.config.ts`)
- Image optimization: `formats: avif, webp`, `deviceSizes`, `imageSizes`, `minimumCacheTTL: 7 days`
- `compress: true`, `removeConsole` in production (keep error/warn)
- `optimizeCss: true` experimental
- Headers:
  - `/sw.js`: `max-age=0, must-revalidate`, `Service-Worker-Allowed: /`
  - `/manifest.webmanifest`: `max-age=3600, must-revalidate`
  - `/icons/*`, `/media/*`, `/_next/static/*`: `max-age=31536000, immutable`
  - Security: `X-DNS-Prefetch-Control: on`, improved `Permissions-Policy` with `camera=(self), geolocation=(self)`
- Rewrites: `/manifest.json` → `/manifest.webmanifest` for compatibility

### SEO
- **Sitemap** (`src/app/sitemap.ts`): 14 static routes including `/videos`, `/track`, `/offline`, `/account`, `/install` with proper `changeFrequency` and `priority`
- **Robots** (`src/app/robots.ts`): Allow list for public routes, disallow for 25+ private workspace routes, separate rules for Googlebot, host field
- **Manifest** now includes screenshots for richer install UI

### UX
- **Loading states**: `src/app/loading.tsx`, `src/app/(store)/loading.tsx`, `src/app/(workspace)/loading.tsx`
- **Cart badge**: `src/contexts/CartContext.tsx` now calls `navigator.setAppBadge(count)` for PWA badge API
- **Header**: Install button (Download icon) when installable, offline indicator (Smartphone icon) when offline
- **Footer**: Added Links to Videos, Track Order, Install App
- **Offline CSS**: Full styles for install prompt, update prompt, offline indicator, offline page, standalone display-mode adjustments, iOS safe-area handling

### Assets
- `public/browserconfig.xml`: MS Tile config
- `public/offline.html`: Static offline fallback
- `public/icons/*`: 12 icons + favicons + maskable + apple-touch

### New Hooks & Libs
- `src/lib/pwa.ts`: Central PWA utilities
- `src/hooks/usePWAInstall.ts`
- `src/hooks/useOnlineStatus.ts`
- `src/hooks/useShare.ts`
- `src/components/store/OfflineClient.tsx`

## 3. What Else Can Be Upgraded (Recommendations)

### Immediate (Low Effort)
- [ ] Add Web Push subscription: `src/lib/push.ts` + `/api/push/subscribe` to notify order status
- [ ] Add IndexedDB wrapper (idb-keyval) for offline product cache and pending orders queue
- [ ] Add `src/lib/offlineQueue.ts` to store checkout attempts when offline and sync on `online`
- [ ] Add `src/components/store/ShareButton.tsx` using `useShare` to ProductCard and product detail page
- [ ] Add `src/app/(store)/shop/[id]/page.tsx` View Transitions API for product image
- [ ] Add `src/components/ui/Skeleton.tsx` for product grid skeleton loaders
- [ ] Add `reportWebVitals` and analytics (Vercel Analytics or Firebase Analytics)

### Medium Effort
- [ ] Add Background Sync for orders: register `sync-orders` when offline, retry when online
- [ ] Add Periodic Background Sync for product catalogue
- [ ] Add Notification Triggers for low feed, health attention (workspace)
- [ ] Add File System Access API for bulk document import
- [ ] Add Camera API direct capture for animal photos (`<input capture>`)
- [ ] Add Geolocation for delivery distance calculation
- [ ] Add Payment Request API (even if COD, for address autofill)
- [ ] Add Dark Mode toggle (currently light only) with `prefers-color-scheme`
- [ ] Add `src/app/global-error.tsx` offline handling
- [ ] Add Lighthouse CI in GitHub Actions

### Advanced
- [ ] Full offline-first with IndexedDB: cache Firestore reads for dashboard
- [ ] Workbox integration for more sophisticated caching (optional, currently custom SW is sufficient)
- [ ] Add `next-pwa` alternative evaluation — custom SW is preferred for control
- [ ] Add App Shortcuts dynamic (based on recent orders)
- [ ] Add Widgets (if Chrome widgets API)
- [ ] Add Digital Goods API for future in-app purchases
- [ ] Add Screen Wake Lock for farm operations during long tasks

## 4. Testing PWA

1. Build: `npm run build && npm start`
2. Open Chrome DevTools → Application → Manifest: should show all icons, shortcuts, screenshots
3. Application → Service Workers: should show `sw.js` activated, with caches `branch-farm-static-v2`, `images-v2`, `pages-v2`
4. Lighthouse → PWA: should score 100 (installable, offline, maskable, theme-color, etc.)
5. Offline: DevTools → Network → Offline, navigate — should show `/offline` page or cached content
6. Install: Address bar should show install icon, or custom banner after 3s
7. iOS: Safari → Share → Add to Home Screen → should use apple-touch-icon

## 5. Files Changed

- `public/sw.js` (rewritten)
- `public/offline.html` (new)
- `public/browserconfig.xml` (new)
- `public/icons/*` (12 new icons)
- `public/apple-touch-icon.png` (new)
- `public/favicon.ico` (new)
- `src/app/manifest.ts` (enhanced)
- `src/app/layout.tsx` (PWA meta)
- `src/app/providers.tsx` (PWA components)
- `src/app/loading.tsx` (new)
- `src/app/(store)/loading.tsx` (new)
- `src/app/(workspace)/loading.tsx` (new)
- `src/app/(store)/offline/page.tsx` (new)
- `src/app/(store)/install/page.tsx` (new)
- `src/app/sitemap.ts` (enhanced)
- `src/app/robots.ts` (enhanced)
- `src/components/ui/ServiceWorkerRegister.tsx` (enhanced)
- `src/components/ui/PWAInstallPrompt.tsx` (new)
- `src/components/ui/PWAUpdatePrompt.tsx` (new)
- `src/components/ui/OfflineIndicator.tsx` (new)
- `src/components/store/OfflineClient.tsx` (new)
- `src/components/store/SiteHeader.tsx` (install + offline icons)
- `src/components/store/SiteFooter.tsx` (extra links)
- `src/lib/pwa.ts` (new)
- `src/hooks/usePWAInstall.ts` (new)
- `src/hooks/useOnlineStatus.ts` (new)
- `src/hooks/useShare.ts` (new)
- `src/contexts/CartContext.tsx` (badge API)
- `src/app/globals.css` (PWA styles)
- `next.config.ts` (headers, image optimization)
- `PWA_UPGRADES.md` (this file)

## 6. Compatibility

- Chrome/Edge 80+ : Full support (install, badge, share, offline)
- Firefox 90+ : Install, offline, no badge
- Safari 16.4+ : Install via Add to Home Screen, offline, no badge
- iOS Safari 16.4+ : Full PWA with 180px icon, standalone display
- All browsers: Offline fallback works via `offline.html`

## 7. Security

- No secrets in SW or manifest
- SW scope `/` only handles same-origin + allowed image hosts
- API never cached except whitelisted GETs
- All uploads still via `/api/uploads` server route
