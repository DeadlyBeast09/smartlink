# 09 — API Documentation

> This file is cumulative — each phase appends its new endpoints below
> rather than starting a new file, so this stays the single source of
> truth for "what does this API actually do."

## Phase 1 endpoints

### `GET /`

Renders the homepage with the shorten form.

- **Auth required:** No
- **Response:** `200` — renders `home.ejs`

---

### `POST /api/shorten`

Creates a new short URL.

- **Auth required:** No (Phase 1 — anonymous shortening is allowed;
  Phase 3 adds *optional* ownership when a user is logged in)
- **Content-Type:** `application/x-www-form-urlencoded` (HTML form) —
  JSON support is added when this becomes a documented public API in a
  later phase

**Request body:**
```json
{
  "originalUrl": "https://example.com/some/very/long/path"
}
```

**Success response — `200`** (renders `home.ejs` with the result):
the page displays the generated short URL, e.g.
`http://localhost:3000/aZ3kP9x`.

**Error responses** (rendered inline on the same page, not a separate
error page):

| Status | Condition | Message |
|---|---|---|
| `400` | `originalUrl` missing | `originalUrl is required` |
| `400` | `originalUrl` is not a valid `http`/`https` URL | `originalUrl must be a valid http/https URL` |
| `500` | Could not generate a unique ID after 5 retries (practically never happens — see docs/05-url-shortening-deep-dive.md) | `Could not generate a unique short URL, please try again` |

---

### `GET /:shortId`

Redirects to the original URL and increments its click counter.

- **Auth required:** No
- **Path params:** `shortId` — the generated short identifier (e.g. `aZ3kP9x`)

**Success response:** `302 Found`, `Location` header set to the original
URL. (See docs/05-url-shortening-deep-dive.md for why 302, not 301.)

**Error response:**

| Status | Condition | Behavior |
|---|---|---|
| `404` | No URL document matches `shortId` | Renders `error.ejs` with "Short URL not found" |

---

## Conventions used across this API (apply to every phase going forward)

- **Error response shape (JSON clients):**
  ```json
  { "success": false, "error": "human-readable message" }
  ```
- **Error response shape (HTML clients):** renders `views/error.ejs`
  with `statusCode` and `message`.
- Which shape you get is decided by `errorHandler` based on the
  `Accept` header and whether the path starts with `/api` — see
  `middlewares/errorHandler.js` and docs/07-routing-and-middleware.md.
- Status codes follow standard semantics: `400` = bad input from the
  client, `401`/`403` = auth/authorization (from Phase 2), `404` = not
  found, `500` = unexpected server-side failure.

## Endpoints planned for upcoming phases (not yet implemented)

| Phase | Endpoints |
|---|---|
| 2 | `POST /signup`, `POST /login`, `POST /logout` |
| 3 | `GET /dashboard`, `PUT /api/urls/:id`, `DELETE /api/urls/:id` |
| 4 | `GET /api/urls/:id/analytics` |
| 5 | `POST /api/shorten` gains an optional `customAlias` field |
| 6 | `GET /api/urls/:id/qr` |
