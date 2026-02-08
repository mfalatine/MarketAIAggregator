# Future: "Share My Briefing" Options

## Context

The MVP covers scenarios 1-3 (single-user generation with export/import for transferability). This document captures options for Scenario 4: **one person generates, many people consume** — without requiring readers to have their own API key or setup.

---

## Option A: Netlify + Cloud Storage (Supabase / Firebase)

- Generator clicks "Publish" → briefing JSON gets pushed to a cloud database
- Readers open a `/read` view (or the same app in read-only mode) → pulls latest briefing
- **Effort to add later:** Medium. Add a publish function and a fetch-from-cloud reader. The current app structure (JSON briefing records) maps directly to a database row.
- **Cost:** Supabase/Firebase free tiers would easily cover this

---

## Option B: Netlify Functions + Simple File Storage

- Generator clicks "Publish" → Netlify serverless function saves the briefing as a JSON file to Netlify Blobs or S3
- Readers hit a URL like `yoursite.netlify.app/briefings/latest`
- **Effort to add later:** Low-Medium. One serverless function to write, one to read. Existing briefing JSON format is the payload — no transformation needed.
- **Cost:** Netlify free tier covers it

---

## Option C: GitHub Pages + GitHub API

- Generator clicks "Publish" → briefing gets committed to a GitHub repo (via GitHub API + a personal access token)
- Readers access the raw JSON or a rendered page via GitHub Pages
- **Effort to add later:** Low. Export JSON format already exists. Publishing = one API call to create/update a file in a repo.
- **Cost:** Free
- **Downside:** GitHub token management, slight delay for Pages to rebuild

---

## Option D: RSS/Atom Feed Generation

- Each published briefing also generates an RSS feed entry
- Readers subscribe in any RSS reader or you build a simple feed page
- **Effort to add later:** Low add-on to any of the above. Once briefings land somewhere public, generating an XML feed is straightforward.

---

## Option E: Email Distribution (SendGrid / Resend)

- Generator clicks "Publish & Email" → serverless function sends the briefing to a subscriber list
- **Effort to add later:** Medium. Need a Netlify Function + email service + subscriber management.
- **Cost:** Free tiers cover low volume (Resend = 100 emails/day free)

---

## What the MVP Should Do to Keep These Doors Open

The current design already does the right things:

1. **Briefings are structured JSON** — any future publishing mechanism just takes that object and puts it somewhere
2. **Export functionality exists** — "Publish" is essentially "Export but to a server instead of a file download"
3. **The HTML rendering logic exists** — readers need the same display code already on Dashboard

### One Implementation Note

**Keep the briefing rendering a clean, separable function** — so it can later be dropped into a read-only page without pulling in all the admin/settings/generation code. This is a code organization concern, not an architecture change.

---

## Recommended Path

When ready for Scenario 4, **Options B or C are the lightest lifts** from the current architecture.
