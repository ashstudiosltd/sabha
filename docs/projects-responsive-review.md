# Projects responsive review — 2026-10-15

Shared workspace layout now uses content-container breakpoints as well as viewport breakpoints, so narrow columns beside the sidebar receive the same responsive treatment as phones. Project cards, facts, People rows, settings, repository review, action groups and filters wrap within available width. Navigation becomes a horizontal row below the navbar at 900px. Inputs use 16px text on small screens, controls preserve touch targets, and the bottom padding leaves room for the Anu launcher.

Navbar height is measured with ResizeObserver and supplies sticky rail offsets and settings scroll margins, including expanded mobile search. Custom dropdowns are clamped to the visual viewport and scroll their own active options into view without horizontal movement. Existing reduced-motion handling remains.

Validation performed:
- Sabha production build: passed, including TypeScript and route generation.
- Anu production build: passed, including TypeScript and route generation.
- Public /projects rendered locally; checked 320 × 740, 768 × 1024 and 1280 × 900.
- Document width matched viewport width at all three sizes.
- At 320px, opened the Stage menu; it remained inside the viewport and Escape closed it.
- Body computed font was Roboto.

Limits: public catalog had no published projects in this session, and the inspection browser was signed out. Populated project cards, owner-only settings, authenticated notifications, GitHub operations and permission flows were reviewed in source but not exercised with live account data. No remote deployment, Supabase mutation, GitHub mutation or automated test files were added. Next emits its existing middleware convention deprecation warning; it does not fail the build.
