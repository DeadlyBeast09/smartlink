# Phase 3 — User Dashboard & URL Management

## Goal

Phase 1 solved the core URL-shortening problem:

* Generate unique short URLs
* Store mappings in MongoDB
* Redirect users
* Track click counts

Phase 2 introduced authentication:

* User signup
* User login
* JWT-based authentication
* Protected routes

Phase 3 builds on top of these foundations by introducing ownership and URL management.

Users can now:

* View only their own URLs
* Edit existing URLs
* Delete URLs
* Track click counts from a personal dashboard

This transforms the application from a public URL shortener into a multi-user platform.

---

# Problem Statement

Before Phase 3, every URL existed independently.

Example:

```txt
User A creates:
abc123 → google.com

User B creates:
xyz789 → github.com
```

The database stored both URLs but had no concept of ownership.

```js
{
  originalUrl,
  shortId,
  clicks
}
```

As a result:

* URLs could not be grouped by user
* Dashboards were impossible
* Ownership checks were impossible
* Edit/Delete functionality would be unsafe

The application needed a way to associate URLs with users.

---

# Database Design Change

## Url Schema Before

```js
{
  originalUrl,
  shortId,
  clicks
}
```

## Url Schema After

```js
{
  originalUrl,
  shortId,
  clicks,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  }
}
```

---

# Why createdBy?

The `createdBy` field establishes ownership.

Example:

```js
{
  shortId: "abc123",
  originalUrl: "https://google.com",
  createdBy: ObjectId("userA")
}
```

```js
{
  shortId: "xyz789",
  originalUrl: "https://github.com",
  createdBy: ObjectId("userB")
}
```

Now every URL belongs to exactly one user.

---

# Why Use ObjectId?

Instead of storing:

```js
createdBy: "ishan@example.com"
```

the application stores:

```js
createdBy: ObjectId(...)
```

Benefits:

* Smaller storage footprint
* Faster lookups
* Referential integrity
* Supports MongoDB population

Example:

```js
Url.find().populate("createdBy")
```

---

# URL Creation Flow

## Before Phase 3

```js
await Url.create({
  originalUrl,
  shortId
});
```

## After Phase 3

```js
await Url.create({
  originalUrl,
  shortId,
  createdBy: userId
});
```

The authenticated user's id is attached during creation.

---

# Dashboard Architecture

## Route

```txt
GET /dashboard
```

Protected by:

```js
authenticate
```

Only logged-in users can access the dashboard.

---

## Controller

Responsibility:

* Receive request
* Call service
* Render dashboard

Controllers never contain business logic.

---

## Service

```js
Url.find({
  createdBy: userId
})
```

This returns only URLs belonging to the current user.

---

# Why Not Use Url.find({})?

Bad:

```js
Url.find({})
```

This would return:

```txt
User A URLs
User B URLs
User C URLs
```

for every user.

This creates a privacy violation.

Instead:

```js
Url.find({
  createdBy: userId
})
```

ensures user isolation.

---

# Dashboard Data

Each row displays:

```txt
Short URL
Original URL
Clicks
Created Date
Actions
```

Example:

```txt
abc123
https://google.com
42 clicks
20/06/2026
Edit | Delete
```

---

# Click Tracking

Phase 1 already introduced click tracking.

Implementation:

```js
$inc: { clicks: 1 }
```

used inside:

```js
findOneAndUpdate()
```

---

# Why Atomic Increment?

Bad:

```js
url.clicks++;
await url.save();
```

Problem:

```txt
Request A reads 5
Request B reads 5

A writes 6
B writes 6
```

Result:

```txt
One click lost
```

Good:

```js
$inc: { clicks: 1 }
```

MongoDB performs the increment atomically.

No clicks are lost under concurrency.

---

# Edit URL Feature

## Route

```txt
GET  /urls/:shortId/edit
POST /urls/:shortId/edit
```

---

# Why Use shortId Instead of MongoDB _id?

Possible route:

```txt
/urls/6855a4e89d91f0e97f1d8f65/edit
```

Chosen route:

```txt
/urls/T_Yqezn/edit
```

Reason:

`shortId` is the domain identifier users already understand.

The application revolves around short URLs, not MongoDB internals.

---

# Edit Flow

User:

```txt
Dashboard
  ↓
Edit
```

Application:

```txt
GET /urls/:shortId/edit
```

Service:

```js
findOne({
  shortId,
  createdBy: userId
})
```

The edit page is rendered only if ownership is verified.

---

# Update Flow

User submits:

```txt
New destination URL
```

Service:

```js
findOneAndUpdate(
  {
    shortId,
    createdBy: userId
  },
  {
    originalUrl
  }
)
```

---

# Delete URL Feature

## Route

```txt
POST /urls/:shortId/delete
```

---

# Delete Flow

User:

```txt
Dashboard
  ↓
Delete
```

Service:

```js
findOneAndDelete({
  shortId,
  createdBy: userId
})
```

---

# Why Include createdBy?

Bad:

```js
findOneAndDelete({
  shortId
})
```

Problem:

Anyone who knows the shortId can delete the URL.

Good:

```js
findOneAndDelete({
  shortId,
  createdBy: userId
})
```

Deletion succeeds only if ownership matches.

---

# Authorization vs Authentication

Authentication answers:

```txt
Who are you?
```

Implemented using:

```txt
JWT
Cookies
authenticate middleware
```

Authorization answers:

```txt
Are you allowed to do this?
```

Implemented using:

```js
createdBy === currentUser
```

checks.

---

# Security Considerations

## Horizontal Privilege Escalation

Example attack:

```txt
User A owns:
abc123

User B discovers:
abc123
```

Without ownership checks:

```txt
User B edits User A's URL
```

or

```txt
User B deletes User A's URL
```

This is called:

```txt
Horizontal Privilege Escalation
```

Phase 3 prevents it by including:

```js
createdBy: userId
```

inside every edit/delete query.

---

# Indexing Strategy

The schema uses:

```js
createdBy: {
  index: true
}
```

Reason:

Dashboard queries frequently execute:

```js
Url.find({
  createdBy: userId
})
```

Indexing improves lookup performance.

---

# MVC Responsibilities

## Routes

Responsible for:

```txt
HTTP method
URL path
Middleware registration
Controller mapping
```

---

## Controllers

Responsible for:

```txt
req
res
status codes
rendering views
```

No business logic.

---

## Services

Responsible for:

```txt
Validation
Ownership checks
Database operations
Business rules
```

---

## Models

Responsible for:

```txt
Schema definition
Indexes
Constraints
```

---

# Interview Questions

## Why introduce createdBy?

To establish ownership and support user-specific dashboards, authorization, and analytics.

---

## Why not store the user's email?

ObjectId is smaller, faster, and supports relationships through references.

---

## Why use shortId in routes?

shortId is the application's public identifier and avoids exposing MongoDB implementation details.

---

## Why verify ownership inside the database query?

It prevents unauthorized edits/deletions and avoids race conditions caused by separate validation steps.

---

## Why is $inc preferred over read-modify-write?

Because MongoDB performs $inc atomically, preventing lost updates under concurrent requests.

---

# Outcome

At the end of Phase 3, the application supports:

✓ User-owned URLs

✓ Personal dashboard

✓ Click statistics

✓ Edit URL

✓ Delete URL

✓ Authorization checks

✓ Ownership-based security

The project now behaves like a real multi-user SaaS application rather than a basic URL-shortening demo.
