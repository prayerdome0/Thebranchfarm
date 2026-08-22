# The Branch Farm — Farm Management

A focused farm-management system for **The Branch Farm**, Mahlabane, Eswatini.

The system covers the actual farm operation plus a small public **storefront**: customers
browse farm produce and livestock, add to a cart and place an order without paying online.
Firebase is the source of truth for identity and application data; Cloudinary stores all
uploaded media and downloadable files. Orders are placed against Firestore and fulfilled by
staff — there is no payment gateway.

## The seven modules

| Module | Purpose |
| --- | --- |
| **Dashboard** | Live counts — animals, active animals, animals needing attention, health records, documents and staff. |
| **Animals** | Add, edit, view and (admin) delete animal records with a photograph, full details, health history, documents and activity. |
| **Animal health** | Health records across the herd: problems, observations, vaccinations, treatments, examinations. |
| **Staff** | Admin provisions staff/admin accounts, changes roles and enables/disables accounts. |
| **Farm documents** | Upload PDFs, images, Word and Excel files, videos and other farm files; view/download them. |
| **Activity** | Feeding, cleaning, inspections and other daily work, logged with who did it and when. |
| **Settings** | Farm name, slogan, location, contact details and currency. |
| **Shop** | Public storefront: browse produce and livestock, product details, gallery, cart, checkout and order tracking. |
| **Orders** | Staff fulfil customer orders — confirm, progress, mark ready/complete, record payment and capture a proof-of-delivery signature. |
| **Products** | Staff add and edit the catalogue — prices, sale prices, backorder, multiple images, stock levels and visibility; admin removes. |
| **Videos** | Staff upload farm videos with thumbnails; a public `/videos` page shares them with customers. |
| **About / Contact / Gallery** | Public pages with the farm story, WhatsApp contact form, and a photo gallery with a lightbox. |

## The storefront

- **Public shop** at `/shop` — browse farm produce and livestock, search, filter by type/category.
- **Live dairy lines** — fresh milk at **E16/litre**, and the two sour-milk (emasi) lines:
  **Latsambile** at **E20** and **Lashubile** at **E35**. Every other catalogue line is listed
  with a **Coming soon** badge — visible, priced indicatively, but not buyable until the farm
  flips it live (per-product *Coming soon* checkbox in Products).
- **Cart** is stored in the browser (`localStorage`) and works for guests — no sign-in to buy.
- **Checkout** collects name, phone, pickup/delivery and preferred payment method. No online
  payment: the customer pays by cash, EFT or mobile money on collection or delivery.
- **Order tracking** at `/track` — look up an order by its `TB-XXXXXX` reference. Because the
  `orders` collection is staff-only, tracking goes through the public `trackOrder` Cloud
  Function, which returns only what a customer may see (no phone/email/signature). Orders
  placed on the same device are also cached locally, so the success page
  (`/order/TB-XXXXXX`) shows the order number and track button immediately after checkout —
  even if the live backend is temporarily unreachable. A `/track?ref=TB-…` link pre-fills the
  tracker.
- **Videos** at `/videos` — farm tours, livestock and daily-life clips uploaded by staff/admin
  (MP4/WebM up to 200 MB, with an optional thumbnail) and played back inline on the public site.
  Four sample **photo-films** (cinematic slideshows cut from gallery stills) ship in
  `public/media/videos/` and play out of the box; admins can seed them into Firestore from
  **Videos → Add sample videos**.
- **Quotations, receipts & invoices** — the cart has a *Download quotation* button
  (`POST /api/quotations` renders a printable quote); staff can print a **receipt** or
  **invoice** for any order from the order page (`/api/orders/{id}/receipt|invoice`); and
  supporting paperwork files are uploaded through **Cloudinary** (below).
- **Animations** — scroll-reveal fades and cinematic stills are used across the homepage, shop
  and videos pages (with `prefers-reduced-motion` respected).
- **Store settings** — currency, delivery fee, free-delivery threshold, a promo code and the
  homepage hero product are all configured in **Settings** and read live by the shop.
- **Promo codes & sales** — set a promo code + percentage in Settings; mark products on sale or
  allow pre-orders when out of stock.
- **Order notifications** — a `notifyOrderCreated` Cloud Function posts new orders to a
  configurable `NOTIFICATION_WEBHOOK_URL` (WhatsApp/email/chat of your choice).
- **Transactional stock** — order placement atomically checks and decrements stock so an order
  can never oversell an inventory-tracked product.
- **PWA** — installable web-app manifest plus a minimal service worker that caches static assets.
- **SEO** — per-storefront OpenGraph/Twitter metadata, JSON-LD `Farm` schema, `sitemap.xml` and
  `robots.txt`.
- **Demo fallback**: when Firestore is unreachable (e.g. a preview without a deployed backend),
  a sample catalogue is shown and orders are stored locally in the browser. An admin can also
  seed the sample catalogue into Firestore from **Products → Add sample products**.

## Cloudinary uploads and downloads

All animal and health photos, product images, farm videos and thumbnails, and every farm
document upload **straight from the browser to Cloudinary**. Every upload uses the same fixed
unsigned preset, **`branch_farm`** — callers and saved settings cannot override it. Assets are
organised under `branch_farm/animals`, `branch_farm/health`, `branch_farm/products`,
`branch_farm/videos`, `branch_farm/video-posters`, `branch_farm/documents`, and the dedicated
quotation, receipt and invoice folders. Stored secure Cloudinary URLs power viewing, playback
and document downloads.

Setup:

1. In Cloudinary → Settings → Upload presets, create an **unsigned** preset named `branch_farm`.
2. Put your **cloud name** (Cloudinary dashboard → Product Environment) in
   **Settings → Media uploads**, or set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
3. All upload surfaces now use Cloudinary. A missing cloud name or invalid preset produces a
   clear upload error instead of silently storing the file with another provider.

## REST API

Next.js route handlers under `/api` make the storefront scriptable (POS systems, WhatsApp
bots, integrations). Public reads work everywhere; writes and staff reads require
`Authorization: Bearer <firebase id token>` of an active staff/admin account. Without
`FIREBASE_ADMIN_*` credentials the public endpoints serve the sample catalogue and protected
endpoints answer `503` — nothing breaks.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Service status + backend configuration. |
| `GET /api/products` | Public catalogue — `?kind=`, `?category=`, `?q=`, `?comingSoon=0/1`. |
| `POST /api/products` | Staff: create a product. |
| `GET/PATCH/DELETE /api/products/{id}` | Fetch / staff update / admin delete a product. |
| `POST /api/orders` | Place an order — server-side pricing and atomic stock decrement. |
| `GET /api/orders` | Staff: list orders. |
| `GET/PATCH /api/orders/{id}` | Staff: fetch / update status, payment, signature, notes. |
| `GET /api/orders/{id}/receipt` | Printable receipt (by id or `?reference=TB-…`). |
| `GET /api/orders/{id}/invoice` | Printable invoice (by id or `?reference=TB-…`). |
| `POST /api/quotations` | Printable quotation for a list of items (cart button uses this). |
| `GET /api/quotations` | Staff: list archived quotations. |
| `GET /api/videos` · `POST /api/videos` | Public video list · staff publish a video. |
| `DELETE /api/videos/{id}` | Admin: remove a video. |
| `GET /api/settings` | Public storefront settings. |
| `GET/POST /api/documents` | Staff: index of farm documents (`?docType=quotation|receipt|invoice`) · register an uploaded file. |
| `DELETE /api/documents/{id}` | Admin: remove a document record. |
| `GET /api/track/{reference}` | Public order tracking by `TB-XXXXXX` reference. |

## The core flow

1. Admin buys a cow → **Animals → Add animal** → enter ID/tag, name, type, breed, sex,
   date of birth, date purchased, purchase price, supplier, location, weight, status and
   notes → **upload the photograph** → Save.
2. The photo is stored in **Cloudinary**; the animal information is stored in **Firestore**.
3. **Animals → (the animal) → View** shows the actual photograph at the top, then all the
   basic information, then the health history, related documents and activity.
4. If a staff member notices something: **Animals → (the animal) → Add health record** —
   problem, observation, action taken, date and recorded-by. The admin sees it immediately
   when opening the animal.

Every record shows **who recorded it and when** — an animal is a complete, traceable
history, not a static profile.

## Roles

- **Admin** — add/edit/delete animals, upload animal photos, view everything, add health
  records, manage staff, manage documents, see activity/history, manage settings, and delete
  products/videos.
- **Staff** — view animals, add observations, report animal problems, add health/medical
  records, upload relevant photos/documents, update records, add/edit products, upload videos
  and fulfil customer orders.

There is also a `user` (pending) role: anyone can register an account, but it has no farm
access until an administrator promotes it to staff or admin.

## Architecture

- **Firebase Authentication** — admin and staff accounts. Email/password sign-in.
- **Firestore** — `animals`, `animalHealth`, `users`, `farmDocuments`, `farmActivities`, `settings`.
- **Cloudinary** — all uploaded photos, product media, videos and downloadable documents,
  using the fixed unsigned `branch_farm` upload preset.
- **Cloud Functions** — a small, focused set: `bootstrapInitialAdmin` (allowlist promotion),
  `setUserRole`, `setUserStatus`, `createStaffAccount` and `notifyOrderCreated` (order
  webhook notification). Everything else runs directly against Firestore and Cloudinary.

Firebase handles authentication and data; Cloudinary handles all newly uploaded files.

## Technology

- Next.js 16 App Router + React 19 + TypeScript
- Firebase Auth, Firestore, callable Cloud Functions and Security Rules; Cloudinary media delivery
- Zod validation
- Custom accessible CSS design system (no template UI kit)
- Node test runner + TSX

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The Firebase web identifiers are present as non-secret client fallbacks in
`src/lib/firebase/config.ts`. Production deployments should still set the
`NEXT_PUBLIC_FIREBASE_*` values explicitly.

Open `http://localhost:3000`.

## Firebase deployment

1. Authenticate Firebase CLI with an account that owns `thebranchfarm`:

   ```bash
   firebase login
   ```

2. Build the functions:

   ```bash
   npm --prefix functions install
   npm run functions:build
   ```

3. Configure `INITIAL_ADMIN_EMAILS` when Firebase prompts during deployment. Use a
   comma-separated owner allowlist. The Firestore user-created trigger promotes only an
   allowlisted registered account; there is no insecure public bootstrap form.

   Optionally set `NOTIFICATION_WEBHOOK_URL` to a webhook endpoint (WhatsApp/email/chat) to
   receive a ping whenever a customer places an order.

4. Deploy backend policy and functions:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage,functions
   ```

5. In Firebase Console, enable **Email/Password** under Authentication → Sign-in method.

6. Register the allowlisted owner through `/register`. The profile is initially created as
   `user`; the trusted trigger assigns `admin` and a custom claim.

7. Sign in as that admin and use **Staff → Add staff member** to provision team accounts,
   or promote already-registered accounts.

### Automatic backend deployment

A ready-to-use `Deploy Firebase backend` workflow ships in `firebase/firebase-deploy.yml`:
it deploys `firestore:rules,firestore:indexes,storage,functions` whenever backend files land
on `main`, and fails loudly if any callable still answers 404.

1. Enable the workflow: `mkdir -p .github/workflows && cp firebase/firebase-deploy.yml .github/workflows/firebase-deploy.yml`.
2. Firebase console → Project settings → **Service accounts** → **Generate new private key**.
3. GitHub → repository **Settings → Secrets and variables → Actions** → add `FIREBASE_SERVICE_ACCOUNT` with the downloaded JSON.
4. Run the workflow once from **Actions → Deploy Firebase backend → Run workflow**.

## Important collections

`users`, `animals`, `animalHealth`, `farmDocuments`, `farmActivities`, `settings`,
`products`, `orders`, `videos`.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
npm run functions:build
```

The tests cover the official farm identity and currency, animal and health record validation,
document-type categorisation, Lilangeni formatting, registration canonicalisation and the
prevention of public privileged-role registration.

## Current official configuration

- Business: The Branch Farm
- Slogan: Nayi Plug
- Location: GG67+P95 Mahlabane, Eswatini
- Phone: +268 79777668
- WhatsApp: +268 76581804
