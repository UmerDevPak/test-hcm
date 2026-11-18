# AdPulse SEM — Firestore Security Specification

## 1. Roles & Scopes
- **ADMIN** (`ADMIN`, `SUPER_ADMIN`, `Admin`, or verified email `umerraza92261988@gmail.com`): Full agency MCC governance, client workspace provisioning, campaign/keyword/conversion writes, and role management.
- **MANAGER** (`MANAGER`, `SEM_MANAGER`, `STRATEGIST`, `Manager`): Full operational access to `campaigns`, `ad_groups`, `keywords`, `ad_creatives`, and `conversions` across assigned accounts, plus Setup Wizard launches.
- **CLIENT** (`CLIENT`, `ADVERTISER`, `Client`): Strictly scoped via `getUserData().clientId`. May read only their brand's `sem_clients`, `campaigns`, `ad_groups`, `keywords`, `ad_creatives`, and `conversions` documents, and may update only approval fields (`approvalStatus`, `reviewNote`, `updatedAt` on `ad_creatives`; `status`, `approvalStatus`, `updatedAt` on `campaigns`).

## 2. Hardening Guarantees
- Global `match /{document=**} { allow read, write: if false; }` default-deny fallback.
- `isValidId(id)` enforced on every path parameter (`1..128` alphanumeric, underscore, hyphen).
- Explicit `hasAll` + `hasOnly` field allow-lists and type/size bounds on all 9 collections (anti-update-gap).
- Immutable `ownerUid` and `createdAt` enforced on campaign updates.
- Bounded array lengths (`geoTargets <= 10`, `headlines <= 15`, `descriptions <= 4`, `sitelinks <= 6`).
- Self-signup privilege escalation prevention on `/users/{userId}` (`CLIENT` only unless first-run workspace setup).
