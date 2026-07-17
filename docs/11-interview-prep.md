# 11 — Interview Prep

> Cumulative across phases. This file grows as each phase is built — by
> Phase 7 it covers Node.js, Express, MongoDB, JWT, Cookies, MVC, URL
> shorteners, analytics, security, and system design, 100+ questions
> total. **Phase 1 section below covers what's actually built so far** —
> Node/Express fundamentals, MongoDB/Mongoose, MVC, and URL shortening
> mechanics.

---

## Node.js & Express fundamentals

**Q1. What is the event loop, and why does it matter for a backend like this one?**
Node.js runs JavaScript on a single thread but handles I/O (database
calls, file reads, network requests) asynchronously via the event loop —
expensive I/O work is delegated (to libuv's thread pool or the OS) while
the main thread stays free to handle other requests. This is *why* a
single Node process can serve thousands of concurrent requests despite
being single-threaded: as long as your code doesn't block the main thread
with synchronous, CPU-heavy work, I/O-bound work (like every database
call in this project) doesn't stall other requests.

**Q2. Where would Node's single-threaded model actually hurt this project?**
If you added CPU-heavy work on the main thread — e.g. synchronously
generating a large QR code (Phase 6) or doing heavy image processing —
that would block the event loop and stall *every other request* being
served by that process, not just the one doing the work. The fix is
offloading CPU-bound work (worker threads, a queue + separate worker
process, or an async library that uses native bindings) rather than
running it inline.

**Q3. What's the difference between `express.json()` and `express.urlencoded()`, and why does this project use both?**
They parse different `Content-Type`s into `req.body`: `json()` handles
`application/json` (what a JS `fetch()` call would send), `urlencoded()`
handles `application/x-www-form-urlencoded` (what a plain HTML `<form>`
submission sends). This project's homepage is a real HTML form (Phase 1
is usable with JavaScript disabled), so `urlencoded()` is required;
`json()` is included because Phase 2+ adds JSON API consumers.

**Q4. Why does middleware order matter in Express?**
Express executes middleware in the exact order it's `app.use()`'d, and
each middleware decides whether to call `next()` (continue) or end the
response. Body-parsing middleware must run before any route reads
`req.body`; the error handler must be registered last because Express
identifies it by its 4-argument signature and only invokes it via
`next(err)`. Get the order wrong and you get silent bugs — e.g. a route
reading `req.body` as `undefined` because the parser hadn't run yet.

**Q5. Why is the redirect route (`/:shortId`) registered last in the router?**
Express matches routes top-to-bottom and stops at the first match. A
single-segment wildcard like `/:shortId` matches almost any path
(`/anything`), so if it were registered before more specific routes like
`/api/shorten`, it would intercept those requests and try (and fail) to
look them up as short IDs instead. General/catch-all routes always go
last.

**Q6. What does `next(err)` actually do?**
It skips all remaining non-error-handling middleware and jumps straight
to the first error-handling middleware (a function with 4 params). It's
how this project funnels every thrown `AppError` into one place
(`middlewares/errorHandler.js`) instead of handling errors ad-hoc in
every controller.

**Q7. Why wrap async route handlers in try/catch and call `next(err)` instead of letting them throw?**
In Express 4.x, a rejected promise inside an `async` route handler is
**not** automatically caught by Express — it doesn't become a request
error in any sane way; depending on the situation the request can simply
hang with no response. Manually catching and calling `next(err)` is how
you reconnect that rejection back into Express's normal error flow.

---

## MongoDB & Mongoose

**Q8. Why does `Url.findOneAndUpdate({ shortId }, { $inc: { clicks: 1 } })` matter more than `find()` then `save()`?**
`$inc` is applied **atomically** by MongoDB itself — the increment
happens as a single, indivisible database operation. `find()` then
mutate-in-JS then `save()` is a read-modify-write with a race condition:
if two redirects happen at nearly the same instant, both could read
`clicks: 5`, both compute `6` in application memory, and both write back
`6` — one click is silently lost. This project's test suite
(`tests/url.service.test.js`) actually proves this by firing 10
concurrent click-tracking calls and asserting the count lands at exactly
10.

**Q9. What does a unique index actually guarantee, and what happens when it's violated?**
MongoDB rejects any insert/update that would create a duplicate value for
an indexed unique field, throwing an error with code `11000`. This
project relies on that as the *real* source of truth for `shortId`
uniqueness — the service layer doesn't pre-check "does this ID already
exist?" before inserting (that check-then-insert pattern has its own race
condition); it just attempts the insert and reacts to a `11000` error by
retrying with a new ID.

**Q10. Why is `shortId` a separate field instead of just using MongoDB's `_id`?**
`_id` (an ObjectId) is 24 hex characters — not short, and not meant to be
a public-facing identifier. ObjectIds also encode a creation timestamp
and counter, so exposing them in public URLs leaks some information
about document creation order/volume. A separate, intentionally short,
randomly-generated field decouples "the public identifier" from "the
database's internal identifier" — a generally good practice beyond just
this project.

**Q11. What's the tradeoff between embedding and referencing in MongoDB, and where does it show up in this project's roadmap?**
Embedding (nesting related data inside the parent document) is fast to
read (one query gets everything) but bounded by the 16MB document size
limit and gets unwieldy for unbounded one-to-many relationships.
Referencing (storing an ID and querying separately) avoids the size
problem and works for unbounded relationships, at the cost of needing a
second query (or `$lookup`). This project will hit this exact decision in
Phase 4: click events are referenced in a separate `Click` collection
(`urlId` foreign key), not embedded in `Url`, specifically because a
popular link could accumulate unbounded clicks over its lifetime — see
docs/03-database-design.md.

**Q12. Why MongoDB instead of a relational database for this project?**
Documented in full with honest tradeoffs in docs/03-database-design.md —
short version: the core entity (`Url`) is self-contained for its hottest
read path (no joins needed to redirect), and the schema is expected to
evolve phase by phase without formal migrations. The honest counterpoint
(also worth stating in an interview) is that Phase 4's analytics
aggregations are more naturally relational (`GROUP BY` + `JOIN`), and
MongoDB's aggregation pipeline, while capable, is more verbose for those
queries than SQL would be.

---

## MVC & Architecture

**Q13. What's the difference between "MVC" as commonly (loosely) taught and the architecture used in this project?**
Loosely-taught MVC often collapses "controller" into "everything that
isn't a model or a view," leading to controllers that validate input,
contain business rules, and query the database directly. This project
adds an explicit **service layer**: controllers only translate
HTTP ↔ service calls; all business logic and database access lives in
services. This is sometimes called MVCS. See docs/02-folder-structure.md
for the full layer-by-layer breakdown.

**Q14. Why introduce a service layer in Phase 1, when the logic is simple enough to fit in the controller?**
Two reasons: (1) it makes business logic unit-testable without an HTTP
server in the loop — `tests/url.service.test.js` calls `urlService`
functions directly; (2) it avoids a disruptive refactor later. By Phase
4 (analytics aggregation) and Phase 7 (input validation), controllers
would otherwise balloon with logic that has nothing to do with HTTP. The
honest counter-argument — *"isn't this over-engineering for a single
simple resource?"* — is fair, and the answer is that the cost of adding
the layer now is near-zero, while the cost of retrofitting it later
(once controllers are full of business logic) is real. That tradeoff
reasoning is itself worth saying in an interview.

**Q15. Where does input validation belong, architecturally — and where does this project currently do it?**
In Phase 1, basic validation (`isValidUrl`) is called from the service
layer, because "is this a URL we're willing to store and redirect to" is
a business rule, not just a shape check. Phase 7 adds a dedicated
validation **middleware** layer (using a library, not hand-rolled checks)
for request-shape validation that should reject obviously malformed
requests *before* they even reach the service — e.g. missing required
fields, wrong types. The two coexist: middleware validates request
*shape*, services validate business *rules*.

---

## URL Shortening Mechanics

**Q16. Why does this project use a 302 redirect, not a 301?**
A 301 (permanent) can get cached by browsers/ISPs, meaning repeat clicks
on the same short link may never hit your server again after the first
visit — which silently breaks click analytics. A 302 (temporary) is
revisited every time, keeping the click counter accurate. Full
explanation with a comparison table in docs/05-url-shortening-deep-dive.md.

**Q17. How do you generate short IDs, and what are the alternatives?**
This project uses `nanoid` for cryptographically random, URL-safe IDs.
Alternatives: a sequential counter encoded in base62 (collision-free but
creates write contention and leaks traffic volume), or a truncated hash
of the destination URL (deterministic, but collides more than expected
due to the birthday paradox, and breaks the "two different users can
shorten the same URL into two different links" requirement needed once
ownership exists in Phase 3). Full comparison table in
docs/05-url-shortening-deep-dive.md.

**Q18. Walk me through what happens, end to end, when someone visits a short link.**
Request hits `GET /:shortId` → router dispatches to
`redirectToOriginalUrl` → controller calls
`urlService.getUrlAndTrackClick(shortId)` → service runs an atomic
`findOneAndUpdate` against the unique-indexed `shortId` field,
incrementing `clicks` and returning the updated document in one
operation → if found, controller issues a 302 redirect to
`originalUrl`; if not found, the service throws a 404 `AppError` which
flows to the centralized error handler and renders an error page. Full
sequence diagram in docs/02-folder-structure.md.

**Q19. How would you estimate whether your short ID scheme is "safe enough" against collisions?**
Use the birthday-paradox approximation:
`n ≈ sqrt(2 × N × ln(1/(1-p)))` where `N` is the keyspace size and `p` is
your acceptable collision probability. For nanoid(7) (64 chars per
position, `N = 64⁷ ≈ 4.4×10¹²`), you'd need roughly 9 million generated
IDs before even a 1% chance of a single collision — and a collision,
when it does eventually happen, is handled gracefully by a unique-index
rejection + retry, not a crash. Full derivation in
docs/05-url-shortening-deep-dive.md.

---

*(Authentication, analytics, custom alias, QR code, and security
question sets are added to this file in their respective phases.)*
