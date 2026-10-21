# Canonical Anu companion

The companion uses Anu's shared `/embed` UI. The launcher SVG is the same character asset as the main Anu app. Only the host dialog belongs to Sabha.

Production uses https://anu.devvrats.in. For local development set NEXT_PUBLIC_ANU_URL to the running Anu origin, for example http://localhost:3000, and restart this app. ANU_API_URL must point to that service for server requests. Existing integration secret and shared Supabase account settings are required on both servers. No credential is sent through postMessage.

Page references are UUIDs; Anu forwards them through the existing authenticated bridge. Sabha continues to authorize records and actions. Profile context includes relevant introduction, role, skills and interests alongside private preferences; contact fields are excluded.

The iframe is mounted only while open. Native dialog handles modal focus and host Escape dismissal. The shared chat adapts to the available viewport; small screens use the full available height.
