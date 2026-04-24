# Grass2Pro Coach Admin Prototype

Budget-first coach admin prototype for `coach.grass2pro.com`, designed for GitHub Pages plus a secure serverless Airtable API.

## What is included

- Dynamic coach profile pill with Airtable avatar support and initials fallback.
- Airtable-powered sidebar, player list, consent counts and KPI cards.
- Green, Amber, Red and Grey safeguarding consent states.
- Parent media consent form with granular photo/video/channel permissions.
- GitHub Pages deployment workflow for the static frontend.
- Cloudflare Worker API template that keeps Airtable tokens server-side.
- Optional Netlify Functions kept as a compatibility path only.
- Demo data fallback when Airtable variables are not configured.
- Fully static demo mode when `VITE_API_BASE_URL` is blank.

## Recommended low-cost hosting

Use:

- GitHub Pages for the Vite/React frontend.
- Cloudflare Workers for the Airtable API proxy.
- Namecheap DNS for `coach.grass2pro.com`.

Do not put Airtable API tokens in GitHub Pages or any `VITE_` variable. GitHub Pages is static browser code, so secrets would be public. Put Airtable credentials into Worker secrets instead.

## GitHub Pages setup

1. Push this project to a GitHub repo.
2. In the repo, go to Settings → Pages.
3. Set the source to GitHub Actions.
4. Add repository variables:
   - `VITE_API_BASE_URL`: blank for demo mode, or your Cloudflare Worker URL, for example `https://grass2pro-coach-api.yourname.workers.dev`
   - `CUSTOM_DOMAIN`: `coach.grass2pro.com`
5. The workflow in `.github/workflows/pages.yml` builds `dist`, adds `.nojekyll`, writes the `CNAME`, and deploys to GitHub Pages.

## Cloudflare Worker API

The Worker lives in `worker/`.

Set secrets:

```bash
cd worker
npm create cloudflare@latest
wrangler secret put AIRTABLE_TOKEN
wrangler secret put AIRTABLE_BASE_ID
wrangler deploy
```

Set non-secret Worker vars in `worker/wrangler.toml`.

## Airtable environment variables

```bash
AIRTABLE_TOKEN=pat_xxxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appxxxxxxxxxxxxxx
AIRTABLE_COACHES_TABLE=Coaches
AIRTABLE_PLAYERS_TABLE=Players
AIRTABLE_PARENTS_TABLE=Parents
AIRTABLE_MEDIA_CONSENTS_TABLE=Media Consents
AIRTABLE_COACH_FILTER={Primary Coach}=TRUE()
```

Do not prefix Airtable secrets with `VITE_`. The browser should call only the Worker API. If you later use Netlify Functions instead, set `VITE_API_BASE_URL=/.netlify/functions`.

## Expected Airtable fields

### Coaches

- Full Name
- Role
- Qualification or Credential
- Avatar Image
- Email
- Phone
- DBS Status
- First Aid Status

### Players

- Full Name
- Age Group
- Team
- Position
- Status
- Guardian Name
- Consent Status: Green, Amber, Red or Grey
- Photo Consent
- Video Consent
- Website Consent
- Social Consent
- Highlights Consent
- Review Due
- Progress Score

### Parents

- Full Name
- Email
- Phone
- Relationship
- Parental Responsibility

### Media Consents

The consent form writes:

- Child Full Name
- Age Group
- Parent/Guardian Name
- Parent/Guardian Email
- Parent/Guardian Phone
- Relationship
- Photo Permission
- Video Permission
- Internal Report Permission
- Website Permission
- Social Media Permission
- Press Permission
- Selected Permissions
- Usage Details
- Storage Duration
- Withdrawal Process Acknowledged
- Child Consulted
- Parental Responsibility Confirmed
- Consent State
- Withdrawal State
- Notes
- Submitted At

## Local commands

```bash
npm install
npm run build
npm run dev
```

For Worker API development:

```bash
cd worker
wrangler dev
```

## Custom domain

In GitHub Pages, set `coach.grass2pro.com` as the custom domain. In Namecheap DNS, create a CNAME record:

- Host: `coach`
- Value: your GitHub Pages hostname, usually `<github-username>.github.io`

Then enable HTTPS in GitHub Pages once DNS has propagated.
