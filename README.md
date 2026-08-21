# The Branch Farm — Nayi Plug

A mobile-first agricultural commerce and operations platform for **The Branch Farm**, Mahlabane, Eswatini.

This repository is not a brochure template. It contains a connected Next.js marketplace, customer portal, staff workspace, admin command center, Firebase backend, signed Cloudinary uploads, digital signatures, PDF generation, QR verification, audit history, inventory and farm-production modules.

## What is implemented

### Public and customer experience

- Premium responsive homepage using the official brand imagery
- Active catalogue:
  - Raw Fresh Full-Fat Milk — E16/L (Ngculwini)
  - Sour Milk — Latsambile — E20
  - Sour Milk — Lashubile — E35
- Beef, eggs, pork and chicken are visibly **Coming Soon** and cannot be added to cart
- Searchable/filterable shop, product details, quantity controls and persisted cart
- Delivery policy: free around Manzini/Matsapha; other locations stay “To be arranged” with no invented fee
- Simple checkout: fill details, choose products, confirm purchase → order created. No customer signature required
- Price-secure Firebase callable order creation and transactional order numbering
- Optional WhatsApp continuation only after an order has been saved
- Customer-safe tracking with phone-last-four verification when not signed in
- Firebase registration, login, logout and password reset
- Customer overview, orders, documents, notifications and profile pages
- Contact form, map reference, gallery, about page and public QR verification
- Farm film journal and homepage video previews with local poster fallbacks
- User-initiated, locally synthesised farm ambience (no autoplay or third-party audio tracking)
- Animated farm story with reduced-motion support

### Staff workspace

- Role-protected mobile dashboard
- Operational orders with call, WhatsApp and email actions
- Controlled order-status transitions
- Livestock records for cattle, pigs and chicken/flocks
- Animal health records (vaccinations, treatments, medication, veterinary visits)
- Crops & seeds records (seed stock, planting, harvest and plots)
- Feed management with reorder alerts and low-stock warnings
- Farm equipment records with maintenance tracking
- Milk-production records with calculated totals and balance
- Egg-production records with calculated remaining stock
- General inventory and low-stock warnings
- Farm activity records
- Creator/updater traceability and archive-first record handling

### Admin command center

- Live, database-derived business statistics (no fake dashboard totals)
- Product editor, stock settings and one-click Coming Soon → Available control
- Secure Cloudinary gallery/product media flow
- User list, staff/admin assignment, enable/disable actions and self-lockout protection
- Farm-wide operations view across all management modules
- Quotations, invoices, receipts and agreements generated from orders
- Standalone quotations for any person — including walk-in customers with no existing order
- Per-staff/prepared-by signature management shown on official documents
- Cloudinary-backed document PDF storage for sharing and record keeping
- Professional branded PDF downloads and QR-linked verification records
- Sales/order/production reports with PDF export
- Notifications, append-only audit viewer, gallery content and business settings
- Homepage announcement/hero content updates from Firestore

### Backend and security

- Firebase Authentication is the only identity system
- Every new profile is forced to `role: "user"` by both code and Firestore Rules
- No public admin registration exists
- Admin/staff checks run again inside privileged callable functions
- Role and status changes update Firebase custom claims and Firestore through Admin SDK
- The browser sends only product IDs/quantities; the function reloads official products and calculates prices
- Order counters are allocated in Firestore transactions (`ORD-2026-000001` format)
- Stock deductions and order writes run transactionally
- Document numbers and verification codes are unique and database-backed
- Financial/archived records cannot be deleted by clients
- Strict Firestore and Storage Rules are included in `firebase/`
- Signed Cloudinary parameters are created server-side only after Firebase role verification
- Cloudinary secrets never enter browser code

## Technology

- Next.js 16 App Router + React 19 + TypeScript
- Firebase Auth, Firestore, callable Cloud Functions and Security Rules
- Cloudinary signed direct uploads
- jsPDF + QRCode
- Zod validation
- Custom accessible CSS design system (no template UI kit)
- Node test runner + TSX

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The Firebase web identifiers supplied for this project are also present as non-secret client fallbacks in `src/lib/firebase/config.ts`. Production deployments should still set the `NEXT_PUBLIC_FIREBASE_*` values explicitly.

Open `http://localhost:3000`.

### Required server-only environment variables

Set these in the Next.js hosting environment; never prefix them with `NEXT_PUBLIC_`:

```dotenv
FIREBASE_ADMIN_PROJECT_ID=thebranchfarm
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

The Cloudinary API secret included in the original project request is intentionally **not committed**. Rotate that secret before production because it was shared in plain text, then add the replacement only to the hosting provider's secret manager.

## Firebase deployment

The website can render without seeded Firestore products using the official read-only launch catalogue. Secure checkout, role changes, order tracking, document creation and settings writes require the included callable functions to be deployed.

1. Authenticate Firebase CLI with an account that owns `thebranchfarm`:

   ```bash
   firebase login
   ```

2. Install and build functions:

   ```bash
   npm --prefix functions install
   npm run functions:build
   ```

3. Configure `INITIAL_ADMIN_EMAILS` when Firebase prompts during deployment. Use a comma-separated owner allowlist. The Firestore user-created trigger promotes only an allowlisted registered account; there is no insecure public bootstrap form.

4. Deploy backend policy and functions:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage,functions
   ```

5. In Firebase Console, enable **Email/Password** under Authentication → Sign-in method.

6. Register the allowlisted owner through `/register`. The profile is initially created as `user`; the trusted trigger assigns `admin` and a custom claim.

7. Sign in as that admin and choose **Products → Initialize official catalog**.

8. Configure App Check before high-traffic production use. Once client attestation is active, enable enforced App Check on callable functions.

> Firebase CLI authentication is not available inside this repository by default, so deployment is deliberately not performed by build scripts. This prevents accidental modification of a production project.

### Automatic backend deployment (recommended)

The storefront redeploys automatically from `main`, but the Cloud Functions and security rules only deploy manually. If the two drift apart, **every callable answers HTTP 404 and checkout fails with "Something went wrong. Please try again."** while quotations, order tracking and staff actions fail the same way.

A ready-to-use `Deploy Firebase backend` workflow ships in this repository at `firebase/firebase-deploy.yml`: it deploys `firestore:rules,firestore:indexes,storage,functions` whenever backend files land on `main`, and fails loudly if any callable still answers 404. One-time setup:

1. Enable the workflow by copying the template into place (or adding it via the GitHub web UI → Actions → New workflow):

   ```bash
   mkdir -p .github/workflows && cp firebase/firebase-deploy.yml .github/workflows/firebase-deploy.yml
   ```

2. Firebase console → Project settings → **Service accounts** → **Generate new private key** (an account with the Firebase Admin role on `thebranchfarm`).
3. GitHub → repository **Settings → Secrets and variables → Actions** → add `FIREBASE_SERVICE_ACCOUNT` with the downloaded JSON.
4. Run the workflow once from **Actions → Deploy Firebase backend → Run workflow**. After that, any change under `functions/` or `firebase/` merged to `main` is published automatically.

### Troubleshooting

- **"We couldn't place the order — Something went wrong. Please try again."** → Open `https://us-central1-thebranchfarm.cloudfunctions.net/createOrder`. A Google "404 Page not found" means the backend functions are not deployed (or the deploy failed): run step 4 above or the GitHub workflow. Any other response (for example an HTTP 400 JSON error) means the service is live and the browser console's logged error (`Order placement failed: …`) has the real cause.
- **"Quotation is not working"** / staff actions failing with the generic message → same check with `…/createQuotation`. New callables exist only after the functions deploy completes.

### Firebase App Hosting

`apphosting.yaml` contains a production-ready Next.js runtime profile and the public Firebase web configuration. Create these App Hosting secrets before rollout:

```bash
firebase apphosting:secrets:set cloudinary-cloud-name
firebase apphosting:secrets:set cloudinary-api-key
firebase apphosting:secrets:set cloudinary-api-secret
```

Connect this GitHub repository to a Firebase App Hosting backend in the Firebase Console. App Hosting supplies Application Default Credentials, so `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` are not needed there. Other hosting providers should use the three Firebase Admin variables shown in `.env.example`.

## Cloudinary upload design

1. An authorized staff/admin browser asks `/api/cloudinary/sign` for upload parameters.
2. The API verifies the Firebase ID token and the current Firestore role using Firebase Admin.
3. The API signs a folder-limited, size-limited image transformation.
4. The browser uploads directly to Cloudinary.
5. Only the returned HTTPS URL is stored in Firestore.

Allowed media folders are `products`, `gallery`, `animals`, `documents` and `profiles`. Client-side type and 8 MB size checks are paired with Cloudinary-side transformation limits.

## Important collections

`users`, `products`, `orders`, `documents`, `documentVerifications`, `notifications`, `auditLogs`, `animals`, `milkProduction`, `eggProduction`, `inventory`, `farmActivities`, `gallery`, `settings`, `contactMessages`, and server-only `counters`.

Historical order/document items are embedded snapshots so later product edits do not rewrite old business records.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
npm run functions:build
```

The tests cover official launch prices/availability, delivery policy, Lilangeni formatting, checkout without any customer signature, and prevention of public privileged-role registration.

## Visual assets

- `public/logo.png` is the supplied official logo.
- Farm visuals in `public/media/` appear as natural farm content on the site.
- The `/videos` film journal uses short clips with local poster fallbacks, so the visual story remains useful when a remote video is unavailable or a visitor is offline.
- Administrators can replace/add gallery and product media through Cloudinary as authentic farm photographs and films become available.

## Current official configuration

- Business: The Branch Farm
- Slogan: Nayi Plug
- Location: GG67+P95 Mahlabane, Eswatini
- Phone: +268 79777668
- WhatsApp: +268 76581804
- Milk availability: Ngculwini
- Free delivery: Manzini and Matsapha
- Other locations: arranged upon request
