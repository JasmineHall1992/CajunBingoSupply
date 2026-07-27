# Setup guide — Supabase backend, admin approval, Google sign-in, contact email, hosting

Everything in this repo's code is written and ready. This document is the list of manual steps
that only you/Joey can do (creating accounts, clicking through dashboards, DNS) — I can't do these
myself since they require your own logins.

Do these roughly in order — later steps depend on earlier ones.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → create a free account → "New project".
2. Once it's created, go to **SQL Editor** → New query, paste in the contents of
   [`supabase/schema.sql`](schema.sql), run it.
3. New query again, paste in [`supabase/seed.sql`](seed.sql), run it. This loads the 9 existing
   products (6 pull-tabs, 3 raffles) into the database.
4. Go to **Project Settings → API Keys**, copy the **Publishable key**. Go to **Project Settings →
   Data API**, copy the **Project URL** (or just use `https://<your-project-ref>.supabase.co` —
   the project ref is shown on the General settings page).
5. Open [`js/supabase-client.js`](../js/supabase-client.js) and paste those two values in place of
   `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY`. (Never paste the **Secret key** shown
   on that same page anywhere in this repo or in chat — that one's only used later, inside Edge
   Function secrets.)
6. Run [`supabase/storage.sql`](storage.sql) in the SQL Editor too — this creates both the
   `flyers` bucket (Joey's flyer uploads) and the `avatars` bucket (user profile pictures).
7. Run [`supabase/migration_avatar.sql`](migration_avatar.sql) — adds the `avatar_url` column to
   `profiles` that the profile-picture feature needs.

## 2. Turn off email-confirmation (approval is the only gate)

Project → **Authentication → Providers → Email** → turn off "Confirm email". (We decided admin
approval alone is the gate — no separate email-confirmation step.)

## 3. Create the first admin account (bootstrapping)

There's a chicken-and-egg problem: the first admin can't be approved by an admin, since none
exists yet.

1. Open the live site's `pages/login.html` → "Create Account" tab → sign up with Joey's real
   email and a real password, like any customer would.
2. In Supabase, go to **Table Editor → profiles**. Find the row that was just created.
3. Edit that row: set `role` to `admin` and `status` to `approved`. Save.
4. Joey can now sign in at `pages/admin.html` with that same email/password.

Any admin-approval after this point happens normally from the admin dashboard — this manual step
is only needed once, for the very first admin.

## 4. Google sign-in (real OAuth)

1. [Google Cloud Console](https://console.cloud.google.com) → create a project (or use an
   existing one) → **APIs & Services → OAuth consent screen** → fill in the basics (app name,
   support email) → publish it.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type:
   "Web application". Add an **Authorized redirect URI** — Supabase will tell you the exact value
   to use here (see next step); it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`.
3. Copy the generated **Client ID** and **Client Secret**.
4. In Supabase: **Authentication → Providers → Google** → toggle it on → paste in the Client ID
   and Client Secret → Save.

No code changes needed after this — the login page's Google button already calls the real
Supabase OAuth flow. Google sign-ins land in the same `pending` queue as email/password ones.

## 5. Deploy the Edge Functions

These need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed once
(`npm install -g supabase` or via Homebrew: `brew install supabase/tap/supabase`).

```
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy admin-delete-user
supabase functions deploy contact-email
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically available
inside every Edge Function already — no need to set those yourself. You only need to add the
Resend-related ones (**Project Settings → Edge Functions → Secrets**, or via CLI):

```
supabase secrets set RESEND_API_KEY=<from resend.com, next step>
supabase secrets set CONTACT_TO_EMAIL=cajunbingopulltabs@gmail.com
supabase secrets set CONTACT_FROM_EMAIL=<a Resend-verified sender address>
```

**The `service_role` key is a master key — never put it in any HTML/JS file.** It's only ever
used inside `admin-delete-user`, where it's already provided automatically.

## 6. Resend (emails inquiries to Joey's Gmail)

1. Create a free account at [resend.com](https://resend.com).
2. **Domains** → add Joey's GoDaddy domain → Resend gives you SPF/DKIM DNS records → add those in
   GoDaddy's DNS management for that domain → wait for Resend to show it as verified (can take a
   few hours). Until it's verified, you can test with Resend's shared sandbox sender instead.
3. **API Keys** → create one → this is the `RESEND_API_KEY` secret from step 5.
4. Once the domain is verified, set `CONTACT_FROM_EMAIL` to an address on that domain, e.g.
   `inquiries@yourdomain.com`.

## 7. Wire up the contact-form → email trigger

Supabase → **Database → Webhooks → Create a new hook**:
- Table: `inquiries`
- Events: `Insert`
- Type: **Supabase Edge Function**
- Function: `contact-email`

Now every contact-form submission inserts into `inquiries` (visible in Table Editor / a future
admin-panel tab) *and* emails Joey.

## 8. Deploy the site (Netlify)

1. Push this repo to GitHub if you haven't already (`git push`).
2. [netlify.com](https://netlify.com) → "Add new site" → "Import an existing project" → connect
   GitHub → pick this repo.
3. Build settings: leave **build command blank**, set **publish directory** to `.` (repo root) —
   this is a plain static site, nothing to build.
4. Deploy. Netlify gives you a `*.netlify.app` URL immediately — test the whole flow there
   (sign up → approve in admin panel → sign in → browse catalog → contact form) before moving the
   real domain over.

## 9. Point Joey's GoDaddy domain at Netlify

In Netlify: **Site settings → Domain management → Add a domain** → enter Joey's domain.
Netlify will show you what to do in GoDaddy — usually one of:
- **Easiest**: change the domain's nameservers in GoDaddy to the ones Netlify gives you (Netlify
  then manages all DNS + automatic HTTPS).
- **Alternative**: keep GoDaddy as the DNS host, and just add the specific `A`/`CNAME` records
  Netlify's UI shows you.

DNS changes can take anywhere from a few minutes to ~24 hours to fully propagate.

If it turns out GoDaddy *hosting* (not just the domain) was already purchased separately, it's
no longer needed once Netlify is live — the domain registration itself doesn't need to move.

## Verifying everything works end to end

1. Sign up a second (non-admin) test account through the live site.
2. Confirm it shows up under **Pending Signups** in `pages/admin.html`.
3. Approve it from the admin panel (not Supabase directly) — confirm the test account can now log
   in and browse the catalog.
4. Reject a different test signup — confirm that account is refused at login with a clear message.
5. As the test (non-admin) user, save a product to favorites, confirm it shows up in
   **Account → Saved Products**, and confirm it appears in the admin's **Activity Log** tab.
6. Add a new product from the admin **Catalog** tab, confirm it appears on `products.html` or
   `raffles.html` right away.
7. While adding/editing a product, upload a flyer file (PDF or image) — confirm the "Uploaded —
   filename" message appears, and confirm the flyer preview shows up on the catalog card (and that
   clicking it opens the full flyer, same as the "View Flyer" button).
8. Submit the contact form — confirm a row appears in Supabase's `inquiries` table and an email
   arrives at Joey's Gmail.
9. On `pages/account.html`, click the camera icon on the avatar circle and upload a photo — confirm
   it replaces the placeholder there, and that it also shows up as a small icon next to your name
   in the top nav on every page.
