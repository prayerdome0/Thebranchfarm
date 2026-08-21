# The Branch Farm — Farm Management

A focused farm-management system for **The Branch Farm**, Mahlabane, Eswatini.

The system covers the actual farm operation plus a small public **storefront**: customers
browse farm produce and livestock, add to a cart and place an order without paying online.
Firebase is the single source of truth for identity, data and files. Orders are placed
against Firestore and fulfilled by staff — there is no payment gateway and no separate
storage vendor.

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
| **Shop** | Public storefront: browse produce and livestock, product details, cart, checkout and order tracking. |
| **Orders** | Staff fulfil customer orders — confirm, progress, mark ready/complete and record payment. |
| **Products** | Admin manages the catalogue: prices, units, stock levels, images and visibility. |

## The storefront

- **Public shop** at `/shop` — browse farm produce and livestock, search, filter by type/category.
- **Cart** is stored in the browser (`localStorage`) and works for guests — no sign-in to buy.
- **Checkout** collects name, phone, pickup/delivery and preferred payment method. No online
  payment: the customer pays by cash, EFT or mobile money on collection or delivery.
- **Order tracking** at `/track` — look up an order by its `TB-XXXXXX` reference.
- **Demo fallback**: when Firestore is unreachable (e.g. a preview without a deployed backend),
  a sample catalogue is shown and orders are stored locally in the browser. An admin can also
  seed the sample catalogue into Firestore from **Products → Add sample products**.

## The core flow

1. Admin buys a cow → **Animals → Add animal** → enter ID/tag, name, type, breed, sex,
   date of birth, date purchased, purchase price, supplier, location, weight, status and
   notes → **upload the photograph** → Save.
2. The photo is stored in **Firebase Storage**; the animal information is stored in **Firestore**.
3. **Animals → (the animal) → View** shows the actual photograph at the top, then all the
   basic information, then the health history, related documents and activity.
4. If a staff member notices something: **Animals → (the animal) → Add health record** —
   problem, observation, action taken, date and recorded-by. The admin sees it immediately
   when opening the animal.

Every record shows **who recorded it and when** — an animal is a complete, traceable
history, not a static profile.

## Roles

- **Admin** — add/edit/delete animals, upload animal photos, view everything, add health
  records, manage staff, manage documents, see activity/history.
- **Staff** — view animals, add observations, report animal problems, add health/medical
  records, upload relevant photos/documents and update records.

There is also a `user` (pending) role: anyone can register an account, but it has no farm
access until an administrator promotes it to staff or admin.

## Architecture

- **Firebase Authentication** — admin and staff accounts. Email/password sign-in.
- **Firestore** — `animals`, `animalHealth`, `users`, `farmDocuments`, `farmActivities`, `settings`.
- **Firebase Storage** — `animal-photos/{animalId}/…` for photographs and
  `documents/{uid}/…` for farm files (PDF, images, Word, Excel, videos, other).
- **Cloud Functions** — a small, focused set: `bootstrapInitialAdmin` (allowlist promotion),
  `setUserRole`, `setUserStatus` and `createStaffAccount`. Everything else runs directly
  against Firestore/Storage through the security rules.

No third-party APIs are used. Firebase alone handles storage, database and authentication.

## Technology

- Next.js 16 App Router + React 19 + TypeScript
- Firebase Auth, Firestore, Storage, callable Cloud Functions and Security Rules
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
`products`, `orders`.

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
