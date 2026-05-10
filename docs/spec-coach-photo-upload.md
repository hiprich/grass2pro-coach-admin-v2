# Coach photo upload — spec

Status: Proposed
Author: Cobby + Computer
Date: 11 May 2026
Scope: 1 feature, ~3 PRs, ~3 hours total

## Problem

The Logo Studio lets coaches design a partner badge and save the config to Airtable (PR #53). But the coach's avatar — the image that appears on their `/c/:slug` page hero and in social unfurls — is still a static file in `/public/coaches/` that requires a code change and redeploy to update.

This means Hope (and every future coach) can't update their own headshot. Hope wants to swap photos seasonally, after a new pitch shoot, or whenever their existing image looks tired.

## Goal

Coaches upload their own avatar from inside Logo Studio. Within a minute, the new image is live on `/c/:slug` and visible in WhatsApp/iMessage/Slack/Twitter unfurls.

## Non-goals (this feature)

- Multi-image galleries — one avatar per coach
- Animated avatars (GIF/MP4) — JPG/PNG only
- Body shots, action photos, full-page hero images — only the square avatar used in cards and social unfurls
- AI-generated images — direct upload only
- Cropping anything other than a centered square — the user picks the square they want, no algorithmic suggestions

## User flow

1. Coach goes to `/admin/logo-studio`
2. Sees a new "Avatar" section (sits above or below Save, depending on visual fit)
3. Drag-and-drops a photo, or clicks to pick a file
4. UI shows a square crop preview at the same 600×600 pixel size that the unfurl will render
5. Coach drags inside the preview to choose which part of the image is the square
6. Hits "Save Photo" (admin code already entered from the Save flow, persisted via the same localStorage key)
7. Backend writes the cropped image, returns success
8. Preview updates to show "Live" state with a small "Updated 5 seconds ago" timestamp
9. Optional: a "Test unfurl" button that opens a URL to the Facebook Sharing Debugger pre-populated with `coach.grass2pro.com/c/hope`

## Architecture

### Storage choice: Netlify Blobs

- Built into Netlify, no separate account
- Generous free tier (more than enough for 100 coaches × 1 MB avatars)
- Permanent URLs (no token expiry games unlike Airtable attachments)
- Consistent regional latency

Alternative: Cloudinary. Better image-processing API (auto-format, auto-resize on the fly), but adds a third-party account. Reject for v1 — adopt only if image-processing limits bite.

Alternative: Airtable attachments. The `Avatar Image` field already exists, so persistence is free. But Airtable's CDN URLs expire after 2 hours unless served through your own domain proxy, which negates the simplicity. Reject.

### Public URL pattern

The avatar must be served from `coach.grass2pro.com` so the URL stays stable in unfurl caches and CORS-free in the SPA.

Pattern: `https://coach.grass2pro.com/coaches/:slug/avatar.jpg`

Implementation:

- Static `/public/coaches/hope-avatar.jpg` stays as the fallback
- A new Netlify Function at `/.netlify/functions/coach-avatar?slug=hope` proxies the request:
  - If a Blob exists at `coaches/hope/avatar.jpg`, stream it (1-hour Cache-Control + s-maxage 1 day, with versioned URLs for cache busting)
  - Otherwise 302 to `/coaches/hope-avatar.jpg` (the static fallback in `/public`)
- A redirect rule in `_redirects` maps `/coaches/:slug/avatar.jpg` → `/.netlify/functions/coach-avatar?slug=:slug 200`

This means the URL is identical whether the coach has uploaded a custom photo or not — clean and cache-friendly.

### Cache busting

Each upload increments a counter or stores a timestamp. The public URL becomes `…/avatar.jpg?v=1715432100`. The edge function (prerender) reads the current `v` from Airtable and injects the full versioned URL into `og:image`. Social platforms see a "new" URL and refresh their cache.

## API

### POST /api/coach-photo-upload

Request:
```
multipart/form-data
- adminCode: string (matches LOGO_STUDIO_ADMIN_CODE env var)
- slug: string (which coach to update — for now defaults to "hope" if absent)
- image: File (JPG or PNG, max 2 MB, must be exactly square, 600×600 to 2000×2000)
```

Response 200:
```
{
  "ok": true,
  "slug": "hope",
  "url": "https://coach.grass2pro.com/coaches/hope/avatar.jpg?v=1715432100",
  "uploadedAt": "2026-05-11T00:30:00Z"
}
```

Errors:
- 400: not square, wrong type, too large/small
- 401: wrong/missing admin code
- 503: Netlify Blobs not configured (env-gated)

Server-side validation:
- MIME sniff: only image/jpeg, image/png
- Dimensions: exactly square, min 600×600, max 2000×2000
- File size: max 2 MB
- If JPG: re-encode at 85 quality to strip EXIF + compress
- If PNG: re-encode as JPG (smaller for photos)
- Final output: 600×600 JPG, ~50-100 KB

### GET /coaches/:slug/avatar.jpg

(Proxied via redirect rule to the avatar function.) Returns the JPG with appropriate cache headers.

## UI changes

### New section in `src/LogoStudio.tsx`

Visually similar to the existing Save section. Sits in its own collapsible card so it doesn't crowd the partner-badge editor.

Structure:
```
<section className="logo-studio-avatar-section">
  <h3>Avatar</h3>
  <p className="muted">Update the headshot shown on your /c page and in social previews.</p>

  <div className="logo-studio-avatar-current">
    <img src="..." alt="Current avatar" />
    <p>Currently live since 5 May 2026</p>
  </div>

  <div className="logo-studio-avatar-dropzone" /* drag handlers */>
    <p>Drag a photo here or click to choose</p>
    <input type="file" accept="image/jpeg,image/png" />
  </div>

  {/* When a file is selected: */}
  <CropPreview src={selectedFile} onCropChange={setCrop} />
  <button onClick={handleUpload} disabled={!cropConfirmed || !adminCode}>
    Save Photo
  </button>
</section>
```

Reuse the `adminCode` state and `g2p:logoStudioAdminCode` localStorage key from the existing Save flow — same gating, same value.

### Crop component

Use `react-easy-crop` (3KB gzipped, no dependencies). It gives a touch-friendly cropper with pinch-to-zoom on mobile.

After the user confirms the crop, draw the cropped region to an off-screen canvas at 600×600, export as JPG blob, attach to FormData, POST.

## Edge function update

The prerender (`netlify/edge-functions/c-slug-prerender.ts`) currently has a static `imagePath` per slug. Update it to:

1. Optionally fetch current avatar metadata from Airtable at request time (slug → `Avatar Version`)
2. If fetched, override `imagePath` to `/coaches/{slug}/avatar.jpg?v={version}`
3. Cache the Airtable response in the edge function's `caches` API for 60 seconds so we don't hit Airtable on every request
4. Fall back to the static `imagePath` if Airtable is unavailable

This part is small (~30 lines added) and aligns the prerender with the upload flow.

## Airtable schema additions

Coaches table needs:
- `Avatar Version` — Number (integer, increments on each upload, used for cache-busting URL)
- `Avatar Last Uploaded At` — Date+time (set to now() on each upload, displayed in UI as "Updated X ago")

## Rollout plan

3 PRs, mergeable independently. Each is small and verifiable.

**PR A — Backend (upload + proxy + Blobs)**
- New `netlify/functions/coach-photo-upload.mjs`
- New `netlify/functions/coach-avatar.mjs` (proxy)
- New redirect rule in `public/_redirects`
- Schema docs: tell Cobby to add `Avatar Version` + `Avatar Last Uploaded At` fields manually
- Test via curl with a sample image
- Estimated: 1 hour

**PR B — UI (Upload card in Logo Studio)**
- New section in `src/LogoStudio.tsx`
- New CSS in `src/index.css`
- `react-easy-crop` added to `package.json`
- Manual test: upload through the UI, confirm `/coaches/hope/avatar.jpg` reflects the new image
- Estimated: 1 hour

**PR C — Wire into prerender**
- Edge function reads Airtable at request time
- Falls back to static `imagePath` on Airtable failure
- Cache-busting URL via the version number
- Manual test: upload a new photo via PR B's UI, immediately curl `/c/hope` raw HTML and see the new versioned URL in `og:image`
- Estimated: 30 minutes

Total estimate: ~2.5 hours of focused work, spread across one or two sessions.

## Open questions

1. Do we want server-side face detection to suggest a default crop? Probably no for v1 — over-engineering. Coaches know which part of their photo they want shown.
2. Should we keep a history of past avatars (audit trail)? Probably no for v1. Add later if needed.
3. Phase G ties this to per-coach login. Until then, the shared admin code is the gate. Once Phase G lands, the admin code disappears and uploads use the session.
4. Should we let coaches upload a separate hero image (the bigger 900×1140 in the `/c/:slug` hero section)? Different aspect ratio, different UI, separate feature. Defer.

## Acceptance criteria

- Cobby can upload a square JPG from `/admin/logo-studio` and see it reflected at `coach.grass2pro.com/c/hope` within 30 seconds
- The new image survives a deploy (no need to commit it to the repo)
- Social unfurl previews show the new image after Facebook Sharing Debugger / Twitter Card Validator force-refreshes their caches
- An upload with the wrong admin code is rejected with a clear error
- An upload of a non-square or non-image file is rejected client-side before the request fires
- The existing static fallback `/public/coaches/hope-avatar.jpg` still works if Blobs is unavailable
