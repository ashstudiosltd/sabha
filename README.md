This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Blogs Anu

The blogs home uses the floating companion in `components/blogs/anu/anu-panel.tsx`,
with a hover/focus greeting and a responsive chat window independent of the sidebar.
Home chat context is retained in sessionStorage and bounded to 20 messages.
The article modal header has a Summary / See original toggle, implemented by
`components/blogs/anu/anu-summary.tsx`. A generated summary replaces only the
article body, with a word reveal on its first appearance. Summaries are cached
by article ID for the tab session, in memory and sessionStorage. Concurrent
requests are deduplicated; reopening an article or switching original/summary
reuses the cached text without another model request. Failed requests can retry.
The summary intent is handled by central Anu and returns plain article prose,
without a chat interface, preamble, or follow-up prompts.

The browser calls `/api/anu/blogs`. The server forwards to central Anu at
`ANU_API_URL` (development default `http://127.0.0.1:5173`, production/preview default `https://anu.devvrats.in`). Anu retrieves current
reference data from `/api/anu/blogs-context`, using an anonymous Supabase client
with existing RLS, no user cookies, and no service-role key. Only selected public
post fields and public author names/usernames are returned; comments and account
data are excluded. The existing schema treats posts as published and has no
separate draft/publication-status field. If drafts are introduced, enforce their
visibility in RLS and in this data endpoint before use.

Run Sabha on port 3000 and Anu on port 5173. If Sabha's port changes, set
`SABHA_PUBLIC_URL` in Anu's runtime configuration. Production requires setting
`ANU_API_URL` in Sabha and `SABHA_PUBLIC_URL` in Anu to their deployed HTTPS origins. Set the server-only `ANU_INTEGRATION_SECRET` in Sabha to the exact production value used by Anu. These two Sabha variables are configured on Vercel for Production and Preview. Deploy Sabha’s current source to activate the route fix and its `/api/anu/blogs-context` endpoint; changing environment variables does not update an existing deployment. No Sabha deployment was made during this connection fix. The per-instance rate budgets are local safeguards, not
durable production quotas. Blog content and messages are processed by Anu's
Gemini service; clearing session history does not erase provider-side data.

### Companion rendering

The floating chat is rendered into document.body after hydration, so page flow,
parent transforms and sidebar sizing cannot reposition it. All companion layout,
form and motion styles live in the statically imported CSS module alongside the
component. Its first render is closed and SSR-safe. Hover words start immediately
with a short stagger; opening takes 180ms, with reduced-motion support.

The launcher uses Anu's canonical living-dot markup and a bundled copy of
Anu's `public/anu-orb.css` in `components/blogs/anu/anu-orb.css`. This is the same
design, not a second orb design. Treat the CSS as a versioned design asset and
sync it from Anu when releasing visual changes. Rendering no longer depends on
a runtime stylesheet fetch from the Anu server. The chat header has no orb.
The central Anu server is still required for replies and initial blog summaries.

The companion measures its rendered conversation, header and composer with
ResizeObserver, then animates to that height up to a 570px/viewport cap. The
one-line composer grows to 100px. The hover greeting stays unmounted during both
opening and closing, preventing overlap with the chat window. Reset is removed.
Sources appear as small Reference links, deduplicated across the conversation.
New summaries return validated title/body fields from central Anu, revealed in
sequence and cached together. Legacy cached summary text is preserved without
regeneration, with an "In brief" title derived from the original article title.

### Anu connection configuration (2026-10-10)

Assistant chat and article summaries share `/api/anu/blogs`; both forward through the same validated HTTPS origin and server integration key. No Gemini key or integration key is sent to a browser. Local development uses `.env.local` and the running local Anu service; local production builds read ignored `.env.production.local`, prepared with the deployed Anu connection. Vercel Production and Preview variables have the same deployed origin and matching integration secret. Restart a running local server after environment edits.

Deploy the current Sabha source, including both `/api/anu/blogs` and `/api/anu/blogs-context`, together. Deployed Anu reads public blog context from `https://sabha.devvrats.in/api/anu/blogs-context`. Until this endpoint is deployed, Anu cannot retrieve the article content even if the shared secret is correct. Preview deployments use the same current public production blog collection, so preview-only articles are not visible to deployed Anu. Auth/database settings remain unchanged.
