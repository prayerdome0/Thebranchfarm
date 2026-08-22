# The Branch Farm — Farm Management

A focused farm-management system for **The Branch Farm**, Mahlabane, Eswatini.

The system covers the actual farm operation plus a small public **storefront**: customers
browse farm produce and livestock, add to a cart and place an order without paying online.
Firebase is the source of truth for identity and application data; Cloudinary stores all
uploaded media and downloadable files. Orders are placed against Firestore and fulfilled by
staff — there is no payment gateway.

## Full farm operations center

The private workspace follows one operating principle:

> **Staff operate and record. Admin monitors, reviews, approves where necessary, investigates problems, and exports reports.**

| Area | Purpose |
| --- | --- |
| **Remote farm dashboard** | Live animals, health attention, vaccinations due, births, low feed, incidents, tasks and equipment warnings; production/cost snapshot and immutable recent staff activity. |
| **Animals** | Permanent cattle, pig, poultry, goat, sheep and other-animal profiles with identity, acquisition, photos, status and full creator/updater attribution. |
| **Health & vaccination** | Vaccines, medication, symptoms, treatment, veterinary visits, next dates and supporting evidence, classified as Attention Required / Upcoming / Up to Date. |
| **Weight & growth** | Every weigh-in updates the current profile while preserving previous weight, recorder and growth history. |
| **Breeding & births** | Mating, pregnancy, expected dates, outcomes and complications. A birth creates the newborn’s animal profile and connects its mother, father and offspring links atomically. |
| **Acquisitions & movements** | Purchased/transferred-in animals create permanent profiles. Sales/transfers update status rather than removing the animal from history. |
| **Feed & inventory** | Received → Used → Remaining records for feed, medicine, vaccines, equipment, tools, cleaning stock, packaging and parts, including low-stock warnings. |
| **Milk & egg production** | Morning/evening milk totals, waste/sales/farm use; egg collection, quality, sold/used/remaining calculations. |
| **Daily farm log** | Feeding, cleaning, checks, vaccinations, treatments, births/deaths, purchases/sales, repairs, deliveries, problems and observations. |
| **Problems & incidents** | Prominent problem reporting with category, Low/Medium/High/Critical severity, photos/documents, immediate action, investigation and resolution. |
| **Tasks** | Admin assigns work and due dates; assigned staff update Pending → In Progress → Completed and attach completion evidence. |
| **Equipment & maintenance** | Asset/serial records, condition, location, assignment and matching repair/maintenance history with parts, cost and next service. |
| **Farm expenses** | Staff records operational costs and receipts; admins approve or return the entry. |
| **Report Center** | 20 date-filtered animal, health, vaccination, breeding, birth, purchase, movement, feed, inventory, production, expense, asset, staff, incident, daily, monthly and custom reports. |
| **Audit trail** | Append-only Who → What → When ledger; updates and deletes are denied even to admins. |
| **Professional exports** | Branded PDF-ready views with The Branch Farm logo, report reference, photos, full details, financial fields, staff attribution and signature/approval areas. |
| **Commerce & content** | The existing shop, products, orders, customers, quotations, invoices, receipts, media, videos, gallery and settings remain available. |

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
- **Quotations, receipts & invoices — fully functional documents.**
  * **Quotations** (`/documents/quotations`): pick a customer (from the customer book or a
    new one) and products from the farm/store catalogue, set quantity, price, discount and
    tax — subtotal, tax, total and balance calculate live. Professional numbers
    (`QF-YYYY-NNNN`) are generated automatically. The document is saved to Firebase and a
    printable copy is stored in **Cloudinary** (URL + public ID recorded on the record).
    Status flow is enforced: **Draft → Sent → Accepted/Rejected → Converted**, with view,
    edit, print/save-PDF and download on every quotation.
  * **Convert to receipt/order**: an *Accepted* quotation converts in one click — its
    customer, items, totals and notes are copied into a new receipt (nothing re-entered),
    optionally creating the matching order (with the stock transaction), and the quotation
    is marked **Converted** with links to the new receipt/order.
  * **Receipts** (`/documents/receipts`): automatic `RCP-YYYY-NNNN` numbers, start from an
    existing order or accepted quotation, full items, subtotal, discount, tax, total,
    **amount paid**, **balance due**, payment method, notes and the authorized person.
    A **mobile-first signature pad** (sign with your finger — Clear / Undo / Save) captures
    the signature on the device; it is stored on the receipt and printed on the document as
    *Authorized Signature · [signed digitally] · Authorized by: …*.
  * **Customer history**: opening a customer (`/customers/{id}`) shows their orders,
    quotations and receipts together with total spent and outstanding balance.
  * The cart's *Download quotation* button (`POST /api/quotations`) and the order page's
    printable **receipt/invoice** (`/api/orders/{id}/receipt|invoice`) still work as before.
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
| `GET /api/quotations/{id}/print` | Staff: printable view of a stored quotation (Bearer token or `?token=`). |
| `GET /api/receipts/{id}/print` | Staff: printable view of a stored receipt, signature included. |
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

- **Admin** — sees the complete farm, staff activity and audit history; reviews/approves
  sensitive records; investigates alerts; manages staff permissions, users, commerce and
  settings; views every individual record; and exports professional reports.
- **Staff** — runs farm operations: animals, health/vaccination, growth, breeding, births,
  acquisitions, movements, feed, inventory, production, daily logs, incidents, assigned tasks,
  equipment, maintenance, expenses, documents and evidence. Every write is attributed.
- **Registered user** — a normal storefront customer account at `/account` with profile,
  personal orders, quotations, receipts, downloadable PDF-ready documents and status
  notifications. It has no private farm access; staff/admin access must be explicitly granted
  by an administrator.

Workspace permissions are explicit. New staff receive Farm Operations, Animals and Reports by
default alongside the existing commerce/document areas; admins can change the visible areas on
the Staff page.

## Architecture

- **Firebase Authentication** — admin and staff accounts. Email/password sign-in.
- **Firestore** — `animals`, `animalHealth`, `farmOperations`, append-only `auditTrail`, `users`,
  `farmDocuments`, `farmActivities`, commerce collections and `settings`.
- **Cloudinary** — all uploaded photos, product media, operational evidence, videos and downloadable documents,
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
