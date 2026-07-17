# 05 — URL Shortening Deep Dive

## Why URL shorteners exist (the actual product reasons, not just "it's shorter")

1. **Character limits.** Twitter historically capped tweets at 140
   characters — `t.co` exists because of this constraint directly.
2. **Readability / shareability.** A link spoken aloud, printed on a
   billboard, or typed by hand needs to be short and memorable. This is
   the entire reason Phase 5 (custom aliases) exists — `myapp.com/sale`
   is sayable, `myapp.com/aZ3kP9x` is not.
3. **Click analytics.** This is the real product, and it's why every
   major link shortener is free to use: the shortener owner gets to see
   *who* clicked, *when*, *from where*, and *on what device* — data the
   original long URL never would have surfaced. (Phase 4 builds this.)
4. **Link management at scale.** Marketing teams running campaigns need
   to create, track, and retire hundreds of links without touching the
   destination infrastructure. The shortener becomes a layer of
   indirection they fully control.

## How Bitly works (conceptually)

- A link is submitted → a short, **base62-encoded** ID is generated
  (characters `a-z A-Z 0-9`, 62 possible characters per position).
- The ID and destination are stored in a fast key-value-style lookup
  (Bitly's actual infra is far more elaborate, but conceptually it's
  `shortId → originalUrl`).
- On every visit to the short link, the system looks up the destination,
  logs an analytics event, and issues an **HTTP redirect** (a 301 or 302
  response, not a server-side proxy of the content).
- Custom domains and branded short domains (`bit.ly`, or a company's own
  domain) are layered on top of the same core mechanic.

## How TinyURL works (conceptually)

Functionally very similar to Bitly at the core (ID → destination →
redirect), but historically with a much lighter focus on analytics —
useful as the "what's the absolute minimum viable version of this
product" reference point. This project's Phase 1 is closer to TinyURL's
scope; by Phase 4 it's closer to Bitly's.

## Redirect architecture: 301 vs 302

This project currently uses Express's default `res.redirect()`, which
sends a **302 Found** (temporary redirect). This is a deliberate choice,
not a default left unexamined:

| | 301 Moved Permanently | 302 Found (used here) |
|---|---|---|
| Browser caching | Browsers and some ISPs **cache** the redirect target after the first visit | Not cached the same way — every visit re-requests the short URL |
| Effect on click tracking | Catastrophic for analytics: a cached 301 means the browser skips your server entirely on subsequent visits, so clicks 2-N never even hit your backend | Every click reliably hits the server, so the click counter stays accurate |
| Correct use case | The destination changed forever and you want search engines to update their index | The short link is meant to be visited repeatedly and tracked every time — exactly this product's use case |

This is a frequently-asked interview question (*"why would a URL
shortener use a 302 instead of a 301?"*) and the answer is precisely the
tradeoff above: **301 breaks analytics, 302 preserves it.**

## Short ID generation strategies (and why this project picked nanoid)

| Strategy | How it works | Pros | Cons |
|---|---|---|---|
| **Random string (this project, via nanoid)** | Generate N random URL-safe characters | Simple, no shared state needed between servers, not enumerable | Tiny non-zero collision chance (handled via retry — see below) |
| **Sequential counter → base62** | A global auto-incrementing counter, encoded as base62 | No collisions ever, shortest possible IDs | Single point of contention at high write volume (everyone needs the "next" number); leaks traffic volume (a competitor watching ID growth can estimate your request rate) |
| **Hash of the URL (e.g. MD5/SHA, truncated)** | Hash `originalUrl`, take first N characters | Same URL always → same short ID (can be a feature) | Same URL always → same short ID (can also be a *bug* — two different users shortening the same URL get the same link, which breaks Phase 3's "these are *my* links" ownership model); truncated hashes collide more than you'd expect (birthday paradox again) |

**This project uses nanoid** (`utils/generateShortId.js`) because:
- It's cryptographically random (unlike `Math.random()`), so IDs aren't
  guessable/enumerable — relevant defense-in-depth even though nothing
  here is secret.
- No coordination needed between concerns (no shared counter, no lock).
- The collision rate at 7 characters is low enough to handle with a
  simple retry-on-conflict strategy rather than needing to eliminate
  collisions architecturally.

## Collision probability — the actual math

nanoid(7) draws from a 64-character alphabet (`A-Za-z0-9_-`), giving
64⁷ ≈ 4.4 × 10¹² possible IDs.

Using the birthday-paradox approximation, the number of IDs you'd need to
generate before a 1% chance of *any* collision is roughly:

```
n ≈ sqrt(2 × N × ln(1 / (1 - p)))
  ≈ sqrt(2 × 4.4×10¹² × 0.01)
  ≈ ~9.4 million IDs
```

So you'd need on the order of **~9 million short links** before even a
1% chance of a single collision — and even then, the unique index +
retry logic in `services/urlService.js` means a collision is a harmless,
invisible retry, not a bug. This is exactly the kind of number you should
be ready to roughly derive (not memorize) in a system design interview
when asked "how do you know your ID scheme is safe?"

## Collision handling in this codebase

```js
// services/urlService.js (simplified)
while (attempt < MAX_COLLISION_RETRIES) {
  const shortId = generateShortId();
  try {
    return await Url.create({ originalUrl, shortId });
  } catch (err) {
    if (err.code === 11000) { attempt++; continue; } // duplicate key — retry
    throw err; // anything else is a real error, don't swallow it
  }
}
throw new AppError("Could not generate a unique short URL", 500);
```

The unique index on `shortId` is the **source of truth** for uniqueness
(not an application-level "check if it exists, then insert" — that has a
race condition between the check and the insert). The application only
*reacts* to the database's rejection. This pattern (let the database
enforce the invariant, catch the specific error code, retry) generalizes
well beyond URL shorteners — it's the same idea behind handling duplicate
usernames/emails in Phase 2's signup flow.

## What happens at the redirect (analytics integration point)

Phase 1's `getUrlAndTrackClick` does two things atomically: increments
`clicks` and returns the destination. This single counter is intentionally
the *seed* of the analytics system — Phase 4 doesn't replace it, it adds
a parallel, richer event log (`Click` collection) alongside it, while
`clicks` remains the cheap, always-available "total clicks" number shown
without needing an aggregation query. See docs/06-analytics-system.md
(added in Phase 4) for how the two coexist.

## Alternative approaches not taken (and why)

- **Server-side proxying instead of redirecting** (fetching the
  destination content and streaming it back, so the URL bar never
  changes): rejected because it breaks the open web's expectations (the
  user should see where they actually landed), adds bandwidth cost to
  your server for every visit, and breaks HTTPS certificate trust for the
  destination site. Real link shorteners universally redirect, they don't
  proxy.
- **Client-side redirect via an HTML meta-refresh or JS `window.location`**:
  rejected because it's slower (requires downloading and parsing an HTML
  page first) and invisible to non-JS clients/crawlers. An HTTP-level
  redirect is faster and is what every production shortener does.
