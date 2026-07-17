# 12 — Cheatsheet

> Three depths per topic: a 30-second answer (elevator pitch), a 2-minute
> answer (interview-room depth), and a 5-minute answer (whiteboard depth,
> with tradeoffs). Cumulative across phases — Phase 1 covers MVC,
> Middleware, MongoDB basics, and URL Shortening. JWT, Cookies,
> Authentication, Analytics, and Security are added in later phases.

---

## MVC (+ Service layer)

**30 sec:** MVC splits an app into Models (data/schema), Views
(presentation), and Controllers (request handling). This project adds a
fourth layer, Services, so controllers stay HTTP-only and all business
logic/database calls live in one testable place.

**2 min:** Routes map a URL + verb to a controller function. The
controller's only job is reading the request and shaping the response —
it never talks to the database directly or contains business rules. The
service layer owns business logic (e.g. "a short URL must be globally
unique," "retry on ID collision") and is the only layer that calls
Mongoose models. Models define schema, types, and indexes. This
separation means you can unit-test business logic without spinning up
Express, and a change to "how we validate URLs" never requires touching
a controller.

**5 min:** The tradeoff worth discussing: a 4-layer split is more
ceremony than strictly necessary for a single simple resource (you could
argue Phase 1's logic would fit fine directly in the controller). The
payoff shows up as the app grows — by the time analytics aggregation
(Phase 4) and request validation middleware (Phase 7) exist, controllers
that mixed in business logic would have become unmanageable, and
retrofitting a service layer onto an already-bloated controller is a
much bigger refactor than introducing the layer up front. The real skill
being demonstrated isn't "I know what MVC is" — it's recognizing *when*
an architectural investment pays for itself, and being able to defend
that timing choice out loud.

---

## Middleware

**30 sec:** A middleware is a function `(req, res, next)` that runs
between the incoming request and the final response — it can inspect/
modify the request, end the response early, or call `next()` to pass
control along. Express executes them in registration order.

**2 min:** This project's middleware chain: `express.json()` and
`express.urlencoded()` parse the request body before any route reads
`req.body`; `express.static()` serves CSS/JS files directly; routes
handle business requests; `notFound` catches anything unmatched and
turns it into a structured error; `errorHandler` (recognized by Express
via its 4-argument signature) is the final stop for every error in the
app, called via `next(err)`. Order is not cosmetic — body parsers must
come before routes that need `req.body`, and the error handler must be
registered dead last.

**5 min:** Middleware is also the right place for *cross-cutting*
concerns that shouldn't be duplicated per-route — authentication checks
(Phase 2), input validation (Phase 7), rate limiting (Phase 7), and
security headers (Phase 7) are all implemented as middleware rather than
inline in every controller, precisely because "does this request have a
valid token" or "is this request shape valid" applies to many routes at
once and shouldn't be copy-pasted. A common interview follow-up: *"how
would you apply a middleware to only some routes, not all?"* — answer:
either mount it on a sub-router (`router.use(middleware)` on a specific
`express.Router()` instance) or pass it directly into a specific route
definition (`router.get('/path', middleware, controller)`), rather than
`app.use()`-ing it globally.

---

## MongoDB / Mongoose

**30 sec:** MongoDB stores JSON-like documents in collections, with no
fixed schema enforced by the database itself. Mongoose adds a schema
layer on top in application code — types, validation, defaults, and
indexes — while keeping Mongo's flexibility for evolving the shape of
data over time.

**2 min:** Documents are looked up via indexes for performance — without
one, a query does a full collection scan. This project puts a unique
index on `shortId` for two reasons at once: it makes the hot redirect
path fast (O(log n) lookup instead of scanning every document), and it
makes the database itself the enforcer of uniqueness, so a duplicate
insert fails loudly (`error code 11000`) instead of silently succeeding.
Writes that need to be safe under concurrency (like incrementing a click
counter) use atomic operators like `$inc` inside `findOneAndUpdate`,
rather than reading a value into application memory, modifying it, and
writing it back — the latter has a race condition under concurrent
requests.

**5 min:** The bigger design question MongoDB forces you to answer
explicitly (that a relational DB often hides behind "just add a foreign
key") is **embed vs. reference**. Embedding nests related data directly
inside the parent document — fast single-query reads, but bounded by the
16MB document size limit and awkward for unbounded relationships.
Referencing stores just an ID and queries separately (or via `$lookup`)
— scales to unbounded relationships, costs an extra query. This project
will embed nothing for click events (Phase 4) — referencing them in a
separate `Click` collection — specifically because a single popular link
could accumulate unbounded clicks over years, and an embedded array has
no natural ceiling. Being able to name *which* relationship you'd embed
vs. reference, and why, is one of the most common MongoDB-specific
interview questions.

---

## URL Shortening

**30 sec:** Generate a short, unique ID, store it mapped to the original
URL, and issue an HTTP redirect (302, not 301 — caching a 301 would
silently break click analytics) whenever the short ID is visited,
incrementing a click counter atomically on the way.

**2 min:** ID generation has three common strategies: random strings
(this project, via `nanoid` — simple, no shared state, tiny non-zero
collision risk handled by unique-index + retry), sequential counters in
base62 (collision-free, but creates a single point of write contention
and leaks request-volume information), or hashing the destination URL
(deterministic — same URL always produces the same ID — which sounds
like a feature but actually breaks "two different users get two
different links for the same destination" once link ownership exists).
The redirect itself must be a real HTTP redirect (not a server-side
proxy or client-side JS redirect) for correctness, speed, and to
preserve the destination site's own HTTPS trust.

**5 min:** The system design conversation starts once you ask "what's
actually the hot path here?" Creation happens once per link; the
redirect happens on every single click — often orders of magnitude more
often. That asymmetry drives almost every design decision: the unique
index exists primarily to make *reads* fast, not just to enforce
uniqueness; click tracking must be atomic because redirects can be
highly concurrent for a popular link; and at real scale (see
docs/10-system-design.md, added later) you'd introduce caching
(Redis) in front of the database specifically for the redirect lookup,
because it's the path that matters most for latency and throughput.
