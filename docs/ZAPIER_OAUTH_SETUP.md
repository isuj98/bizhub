# Zapier OAuth 2.0 Setup Guide (BusinessHub)

This guide explains how to configure the **real** Zapier.com OAuth 2.0 integration so that the "Connect Zapier" button in BusinessHub redirects users to Zapier, completes authorization, and stores the connection in the app.

---

## 1. Prerequisites

- A **Zapier** account.
- Your app must be a **public integration** in Zapier’s platform to get Client ID and Client Secret. For development you can use the Zapier Developer Platform and (when available) test credentials or a published app.

---

## 2. Create / Use a Zapier App (Developer Platform)

1. Go to **[Zapier Developer Platform](https://developer.zapier.com/)** (or [platform.zapier.com](https://platform.zapier.com)).
2. Sign in and open **My Apps** (or create a new app).
3. Create a new app or select an existing one that will represent “BusinessHub” (or your product name).
4. You need this app to be **published as a public integration** to get **Client ID** and **Client Secret**. Until then, the Embed/Credentials section may not show them. Follow Zapier’s process to publish the app if you need production credentials.

---

## 3. OAuth / Auth Type in Zapier

- In the Zapier app, open the **Authentication** (or **Auth**) section.
- Choose **OAuth v2** (or **OAuth 2.0**).
- Zapier will use the **Authorization Code** grant type; no need to change that.

---

## 4. Redirect URI (Callback URL)

Zapier will send the user back to **your backend** after they approve access. The callback URL must be:

- **Backend base URL** + `/zapier/callback`
- Examples:
  - Local: `http://localhost:5001/zapier/callback`
  - Production: `https://api.yourdomain.com/zapier/callback`

In the Zapier Developer Platform:

1. Open **Embed** (or **Settings**) → **Redirect URIs** (or **OAuth Redirect URLs**).
2. Add the exact callback URL(s) you will use (e.g. `http://localhost:5001/zapier/callback` for local dev).
3. Save. The redirect URI used in the OAuth request **must match** one of these exactly (including scheme and path).

---

## 5. Client ID and Client Secret

1. In the Zapier Developer Platform, go to **Embed** → **Settings** → **Credentials** (or the equivalent for your app).
2. Copy the **Client ID** and **Client Secret**.
3. These are only available for apps that are set up (and often published) as a public integration; if you don’t see them, check Zapier’s docs for your app type.

**Important:** The client secret must stay **server-side only**. Never put it in frontend code or in a repo.

---

## 6. Environment Variables (Backend)

Set these in your **backend** `.env` (e.g. `bizhub-server/.env`):

| Variable | Required | Description |
|----------|----------|-------------|
| `ZAPIER_CLIENT_ID` | Yes | Client ID from Zapier Embed → Credentials. |
| `ZAPIER_CLIENT_SECRET` | Yes | Client Secret from Zapier Embed → Credentials. |
| `BASE_URL` | Yes | Public URL of your backend (e.g. `http://localhost:5001` or `https://api.yourdomain.com`). Used as base for `redirect_uri`. |
| `APP_ORIGIN` | Yes | Origin of your frontend (e.g. `http://localhost:5173` or `https://app.yourdomain.com`). Used to redirect the user after OAuth. |
| `ZAPIER_OAUTH_SCOPE` | No | Space-separated OAuth scopes. Default: `zap zap:write authentication`. |
| `JWT_SECRET` | Yes | Used to sign the OAuth `state` parameter; must be set for auth in general. |

Example (local):

```env
BASE_URL=http://localhost:5001
APP_ORIGIN=http://localhost:5173
ZAPIER_CLIENT_ID=your_client_id_from_zapier
ZAPIER_CLIENT_SECRET=your_client_secret_from_zapier
JWT_SECRET=your_jwt_secret
```

---

## 7. Backend URLs This App Exposes

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/zapier/status` | Returns whether the current user has an active Zapier connection (requires auth). |
| GET | `/zapier/connect` | Redirects the user to Zapier’s authorization URL (requires auth). |
| GET | `/zapier/connect-url` | Returns the Zapier authorization URL as JSON (requires auth). |
| GET | `/zapier/callback` | **OAuth callback.** Zapier redirects here with `code` and `state`. Backend exchanges the code for tokens and redirects the user to the frontend. |
| POST | `/zapier/disconnect` | Revokes the current user’s Zapier connection (requires auth). |

The **callback** must be reachable by the user’s browser (Zapier redirects to it). So `BASE_URL` must be the base of the server that serves `/zapier/callback`.

---

## 8. OAuth Flow Summary

1. User clicks **Connect Zapier** in the app.
2. Frontend calls `GET /zapier/connect-url` (or user is sent to `GET /zapier/connect`) and is redirected to Zapier’s authorization URL with `client_id`, `redirect_uri`, `scope`, `state`, etc.
3. User signs in to Zapier (if needed) and approves access.
4. Zapier redirects to `BASE_URL/zapier/callback?code=...&state=...`.
5. Backend validates `state`, exchanges `code` for access (and refresh) token at `https://zapier.com/oauth/token/`, stores the connection in MongoDB, then redirects the user to `APP_ORIGIN/zapier-callback?success=1` (or `?error=...`).
6. Frontend `/zapier-callback` page shows success or error and redirects to the dashboard.

---

## 9. Auth / Test Endpoints in Zapier

- In Zapier’s Auth configuration, the **Authorization URL** is Zapier’s: `https://api.zapier.com/v2/authorize` (our app does not host this).
- **Access Token Request URL**: Zapier’s token endpoint: `https://zapier.com/oauth/token/`. Our backend uses this URL to exchange the code for tokens; you don’t need to “configure” it in our app, but Zapier may show it in their docs.
- For “Test” or “Verify” in Zapier’s UI, use a valid redirect URI and a real run through the flow; the backend’s `/zapier/status` can be used to verify that a connection was stored.

---

## 10. Testing Locally

1. Start backend: from `bizhub-server`, run `npm run dev` (or your start command) so it listens on `BASE_URL` (e.g. `http://localhost:5001`).
2. Start frontend: from project root, run `npm run dev` so the app is at `APP_ORIGIN` (e.g. `http://localhost:5173`).
3. In Zapier, add redirect URI: `http://localhost:5001/zapier/callback`.
4. Log in to BusinessHub, click **Connect Zapier**.
5. You should be redirected to Zapier, then back to `http://localhost:5001/zapier/callback`, then to `http://localhost:5173/zapier-callback?success=1`.
6. Confirm the UI shows “Zapier connected” and that `GET /zapier/status` returns `connected: true`.

---

## 11. Verifying the Callback

- After approving in Zapier, the browser should hit:  
  `BASE_URL/zapier/callback?code=...&state=...`
- Backend logs (if you add them) should show a successful token exchange and redirect to `APP_ORIGIN/zapier-callback?success=1`.
- If you see `error=invalid_state`, the `state` expired or was tampered with; try connecting again.
- If you see `error=missing_code`, Zapier did not return a code (e.g. user denied or error on Zapier’s side).

---

## 12. Confirming the Zapier Connection Is Stored

- Call `GET /zapier/status` with the user’s auth token; response should be `{ "connected": true, "connectionId": "..." }`.
- In MongoDB, check the `zapierconnections` collection for a document with that user’s `userId`, `status: 'active'`, and non-empty `accessToken` (and optionally `refreshToken`).

---

## 13. Before Publishing

- [ ] Use HTTPS for `BASE_URL` and `APP_ORIGIN` in production.
- [ ] Add the production callback URL (e.g. `https://api.yourdomain.com/zapier/callback`) to Zapier’s Redirect URIs.
- [ ] Ensure `JWT_SECRET` and `ZAPIER_CLIENT_SECRET` are strong and not committed.
- [ ] Test the full flow in production (connect, disconnect, status).
- [ ] If Zapier requires app review or publishing for your app type, complete that so Client ID and Client Secret are valid in production.

---

## 14. Troubleshooting

| Issue | What to check |
|-------|----------------|
| "ZAPIER_CLIENT_ID is not configured" | Set `ZAPIER_CLIENT_ID` (and `ZAPIER_CLIENT_SECRET`) in backend `.env`. |
| Redirect URI mismatch | Callback URL in Zapier must exactly match `BASE_URL/zapier/callback` (no trailing slash unless you use it in Zapier too). |
| invalid_state | User took too long or state was reused; try again. Ensure `JWT_SECRET` is set and consistent. |
| Token exchange failed | Confirm `ZAPIER_CLIENT_SECRET` is correct and that the code was used once and within a short time (Zapier codes expire quickly). |
| Database not available | Ensure MongoDB is running and `MONGO_URI` is set so the backend can store the connection. |

---

## 15. References

- [Zapier – User Access Token (OAuth)](https://docs.zapier.com/powered-by-zapier/authentication/methods/user-access-token)
- [Zapier – OAuth v2](https://docs.zapier.com/platform/build/oauth)
- [Zapier Developer Platform](https://developer.zapier.com/)
