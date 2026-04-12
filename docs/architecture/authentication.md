---
type: architecture
status: current
updated: 2026-04-12
---

# Authentication

Spent uses **JWT-based authentication** with the `jose` library for token signing and `bcryptjs` for password hashing. Tokens are stored in `Auth-Token` cookies and verified on protected endpoints.

## Token Flow

### Signup / Login

1. User submits email and password
2. Server validates credentials (query user, bcrypt compare)
3. If valid, sign a JWT with `jose.SignJWT()` using `JWT_SECRET` env var
4. Return token in `Auth-Token` cookie (HttpOnly, secure)
5. Frontend stores it for future requests (auto-sent with each request)

### Token Structure

```typescript
const token = await new SignJWT({ userId: user.id, email: user.email })
  .setProtectedHeader({ alg: 'HS256' })
  .setExpirationTime('7d')
  .sign(new TextEncoder().encode(JWT_SECRET))
```

Tokens are HS256-signed and expire after 7 days.

## Backend Protection

Global middleware `server/middleware/auth.ts` runs on all requests:

1. Extract token from `Auth-Token` cookie
2. Verify using `jose.jwtVerify()` with `JWT_SECRET`
3. If valid, set `event.context.user` with decoded payload
4. If invalid/missing, return 401 Unauthorized (handled per endpoint)

Protected endpoints check `event.context.user` and reject unauthenticated requests.

## Frontend

**Composable:** `app/composables/useAuth.ts`
- `login(email, password)` — calls `/api/auth/login`
- `logout()` — clears token and redirects
- `currentUser()` — returns `event.context.user` or null

**Route Guard:** `app/middleware/auth.global.ts`
- Redirects unauthenticated users to `/login`
- Skips guard on public pages (login, signup)

## OAuth Integration

The app supports OAuth for third-party integrations (e.g., Google, GitHub). Flow:

1. User clicks "Sign in with [Provider]"
2. Redirect to provider's OAuth endpoint with `client_id` and `redirect_uri`
3. Provider redirects back to `/api/auth/callback` with `code`
4. Server exchanges code for provider's access token
5. Fetch user profile from provider
6. Create or link user account, return JWT

State is stored in `oauthCodes` table to prevent CSRF attacks.

## Password Security

- Passwords hashed with bcryptjs (default 10 salt rounds)
- Never stored in plaintext
- `/api/auth/reset-password` supports secure password reset via email

## Key Files

- `server/middleware/auth.ts` — global auth middleware
- `server/api/auth/login.post.ts` — login endpoint
- `server/api/auth/logout.post.ts` — logout endpoint
- `app/composables/useAuth.ts` — frontend auth composable
- `app/middleware/auth.global.ts` — frontend route guard
