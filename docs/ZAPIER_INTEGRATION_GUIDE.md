# BusinessHub – Zapier Integration Developer Guide

This guide explains how to configure BusinessHub so users can connect their Zapier account from the app (**Connect Zapier** flow) and how to publish BusinessHub as an integration in the Zapier platform so it appears in Zapier’s app directory.

---

## Part A: “Connect Zapier” in BusinessHub (OAuth client)

This is the flow where a logged-in user clicks **Connect Zapier** in BusinessHub and authorizes the app to access their Zapier account. BusinessHub is the **OAuth client**; Zapier is the **OAuth server**.

### Prerequisites

- A Zapier developer account and an app (integration) created in the [Zapier Developer Platform](https://developer.zapier.com/).
- The app must be published (or in invite-only mode) so you can get **Client ID** and **Client Secret** and configure redirect URIs.

### 1. Local setup

1. **Backend (server)**  
   From the project root, the API runs from the `server/` folder (e.g. `npm run server` or `node server/index.js`). Ensure the server is running (default port **5001**).

2. **Frontend**  
   Set `VITE_API_URL` to your backend (e.g. `http://localhost:5001`). Run the client with `npm run dev` (default port **3000**).

3. **Environment variables (server)**  
   Create or edit `server/.env` (or set env vars where the server runs):

   ```env
   PORT=5001
   # Zapier OAuth (for "Connect Zapier" in the app)
   ZAPIER_CLIENT_ID=your_zapier_client_id
   ZAPIER_CLIENT_SECRET=your_zapier_client_secret
   # Must match the URL where the frontend is served (including /zapier-callback)
   APP_URL=http://localhost:3000
   ```

   - **ZAPIER_CLIENT_ID** and **ZAPIER_CLIENT_SECRET**: from the Zapier app’s Embed → Settings → Credentials (or equivalent in the Zapier platform).
   - **APP_URL**: base URL of the frontend. The server will use `APP_URL + /zapier-callback` as `redirect_uri` for the Zapier OAuth flow. For local dev this is usually `http://localhost:3000`.

### 2. Backend endpoints used by “Connect Zapier”

The client uses these endpoints (relative to the API base, e.g. `http://localhost:5001`):

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/zapier/status` | Check if a Zapier connection exists (returns `{ connected, connectionId? }`). |
| GET | `/zapier/connect-url` | Get the Zapier authorization URL. Frontend redirects the user here. |
| POST | `/zapier/callback` | Exchange `code` for tokens and store the connection. Body: `{ code: string }`. |
| POST | `/zapier/disconnect` | Remove the stored Zapier connection. |

- **Auth flow**:  
  1. Frontend calls `GET /zapier/connect-url`.  
  2. Backend builds `https://api.zapier.com/v2/authorize?...` with `client_id`, `redirect_uri`, `scope`, `state`, etc.  
  3. User is sent to that URL, signs in to Zapier, and authorizes.  
  4. Zapier redirects to `APP_URL/zapier-callback?code=...&state=...`.  
  5. Frontend (ZapierCallback page) sends `code` to `POST /zapier/callback`.  
  6. Backend exchanges `code` for tokens at `https://api.zapier.com/v2/token` and stores the connection.

### 3. Zapier platform configuration (for “Connect Zapier”)

1. In the [Zapier Developer Platform](https://developer.zapier.com/), open your app.
2. Under **Embed** (or equivalent) → **Settings** → **Redirect URIs**, add:
   - Local: `http://localhost:3000/zapier-callback`
   - Production: `https://your-production-domain.com/zapier-callback`
3. Under **Credentials**, copy **Client ID** and **Client Secret** into `ZAPIER_CLIENT_ID` and `ZAPIER_CLIENT_SECRET`.

### 4. Testing “Connect Zapier” locally

1. Start the server with the env vars above.
2. Start the frontend with `VITE_API_URL=http://localhost:5001`.
3. Log in, go to the Hub, switch to **Add Zap** and click **Connect Zapier**.
4. You should be redirected to Zapier, then back to `/zapier-callback` and then to the dashboard with “Zapier connected”.
5. If you see “Zapier integration not configured”, the server is missing `ZAPIER_CLIENT_ID` or `APP_URL`.

---

## Part B: BusinessHub as a Zapier integration (in the Zapier app directory)

Here, BusinessHub is the **OAuth server**: Zapier sends users to your app to log in; your app issues tokens that Zapier uses to call your API (triggers, actions, etc.).

### 1. High-level architecture

- **Authentication**: OAuth 2 (Authorization Code). You provide:
  - Authorization URL (your app).
  - Token URL (your app).
  - Optional: Refresh Token URL.
- **Test**: A test request (e.g. GET `/api/me` or similar) that Zapier runs with the access token to verify the connection.
- **Triggers / Actions / Searches**: Defined in the Zapier UI or CLI; each calls your API with the stored token.

### 2. Backend endpoint requirements (your app as OAuth server)

You need an API that:

1. **Authorization URL**  
   - Renders a login/consent page.  
   - On success, redirects to Zapier’s redirect URI with `?code=...&state=...`.  
   - Uses the same `state` Zapier sent you.

2. **Token URL**  
   - Accepts `POST` with `grant_type=authorization_code`, `code`, `redirect_uri`, `client_id`, `client_secret`.  
   - Returns JSON with `access_token` (and optionally `refresh_token`, `expires_in`).  
   - Validates `client_id`/`client_secret` (from Zapier; you get these when you register the app in Zapier).

3. **Test request (e.g. “Test API” in Zapier)**  
   - An endpoint that requires the access token (e.g. `Authorization: Bearer <token>` or query param).  
   - Returns 2xx when the token is valid (e.g. current user or minimal JSON).  
   - Example: `GET /api/me` returning `{ id, email }`.

4. **Triggers / actions**  
   - Endpoints your integration will call (e.g. list businesses, create task).  
   - Same auth (Bearer token or as required by your API).

If your current `server/` does not yet implement the OAuth server (authorize + token endpoints), add:

- `GET /oauth/authorize` – login/consent, then redirect to Zapier with `code` and `state`.
- `POST /oauth/token` – exchange `code` for `access_token` (and optionally `refresh_token`).
- Optionally `POST /oauth/token` with `grant_type=refresh_token` for refresh.

Store issued tokens keyed by a user/session identifier so you can later validate the Bearer token on API requests.

### 3. Zapier developer platform setup (your app as integration)

1. **Create or open the integration**  
   [Zapier Developer Platform](https://developer.zapier.com/) → Your app (or create one).

2. **Authentication**  
   - Type: **OAuth v2**.  
   - **Authorization URL**: e.g. `https://your-api.com/oauth/authorize` (or your frontend URL that then redirects to the API).  
   - **Access Token Request URL**: e.g. `https://your-api.com/oauth/token`.  
   - **Scope**: optional; e.g. `read write` if you use scopes.  
   - Add your app’s **Client ID** and **Client Secret** in the Zapier UI (Step 3).  
   - In **your** app’s settings, add the **Zapier OAuth Redirect URL** from Zapier as an allowed redirect URI.

3. **Test API request**  
   - In Zapier, add a test request: e.g. `GET https://your-api.com/api/me` with the access token in the header.  
   - This must succeed when the user has completed OAuth.

4. **Connection label**  
   - Optionally set a “Connection Label” so users see a friendly name (e.g. email) in Zapier.

5. **Triggers**  
   - Example: “New Business” (polling or webhook).  
   - Configure the request (URL, method, auth).  
   - Map response fields to the trigger’s output.

6. **Actions**  
   - Example: “Create Task” (POST to your API).  
   - Input fields: e.g. business_id, title, priority.  
   - Test with a real connection.

7. **Searches** (optional)  
   - e.g. “Find Business by ID” (GET by id).  
   - Define the request and output.

### 4. Environment variables and secrets (your app as integration)

- **Your backend (OAuth server)**  
  - `CLIENT_ID` / `CLIENT_SECRET`: the credentials Zapier gives you when you register the integration (Zapier sends these when exchanging the code).  
  - Or you generate them and register them in Zapier.  
  - Store them in env (e.g. `ZAPIER_OAUTH_CLIENT_ID`, `ZAPIER_OAUTH_CLIENT_SECRET`) and never expose them to the frontend.

- **Zapier**  
  - In the Zapier UI you paste your **Authorization URL**, **Token URL**, **Client ID**, **Client Secret**, and optionally **Refresh Token URL**.

### 5. Webhooks / polling

- **Polling trigger**: Zapier periodically calls your API (e.g. “list recent businesses”) and deduplicates by id.  
- **Webhook trigger**: You expose a URL that Zapier subscribes to; your app POSTs to Zapier when events occur.  
- Implement per Zapier’s [REST hook](https://platform.zapier.com/build/rest-hooks) or [polling](https://platform.zapier.com/build/trigger) docs.

### 6. Testing the integration (your app in Zapier)

1. In Zapier, open your integration and go to **Testing** (or “Test” tab).  
2. Click **Connect an account**.  
3. Complete the OAuth flow (redirect to your app, log in, redirect back to Zapier).  
4. Run “Test API” – it should succeed.  
5. Create a test Zap: choose your integration as trigger or action and run a test.

### 7. Publish readiness checklist

- [ ] OAuth authorize and token endpoints implemented and secured (HTTPS in production).  
- [ ] Redirect URIs allow only Zapier’s redirect URL (no open redirect).  
- [ ] Test API request works with the issued access token.  
- [ ] At least one trigger or action defined and tested.  
- [ ] Connection label set (optional but recommended).  
- [ ] Error responses are clear and non-revealing of secrets.  
- [ ] Env vars and secrets (client id/secret) are not committed; use a secrets manager in production.

### 8. Submitting / publishing

- In the Zapier Developer Platform, use **Invite** to share the integration with test users.  
- When ready, submit for **public listing** (review process).  
- Ensure your app’s terms and privacy policy URLs are set in the Zapier app settings.

---

## Required environment variables summary

| Variable | Where | Purpose |
|----------|--------|--------|
| `PORT` | Server | API port (default 5001). |
| `ZAPIER_CLIENT_ID` | Server | Zapier OAuth client ID for “Connect Zapier” (Part A). |
| `ZAPIER_CLIENT_SECRET` | Server | Zapier OAuth client secret for “Connect Zapier” (Part A). |
| `APP_URL` | Server | Frontend base URL for redirect_uri (e.g. `http://localhost:3000`). |
| `VITE_API_URL` | Frontend build | API base URL (e.g. `http://localhost:5001`). |
| (Part B) OAuth server credentials | Server | Client ID/Secret for when BusinessHub is the OAuth server (Zapier app directory). |

---

## Manual QA checklist

### Hub and radial

- [ ] Hub loads and shows radial nodes (businesses and zaps).  
- [ ] Selecting a business shows business detail, tasks, and Run Analysis.  
- [ ] Selecting a zap shows zap detail and Run Analysis.  
- [ ] Run Analysis works for a selected business (existing behavior).  
- [ ] Run Analysis works for a selected zap (returns tasks/recommendations).  
- [ ] Adding a business refreshes the hub and the new business appears on the radial.  
- [ ] Adding a zap (after connecting Zapier or with mock) refreshes the hub and the new zap appears on the radial.

### Zapier connection (Part A)

- [ ] Without `ZAPIER_CLIENT_ID` / `APP_URL`, “Connect Zapier” shows a clear error or “not configured” message.  
- [ ] With env set, “Connect Zapier” redirects to Zapier and back to `/zapier-callback`.  
- [ ] After success, status shows “Zapier connected” and the Zap form is available.  
- [ ] Creating a zap after connecting succeeds and the zap appears in the hub.

### API

- [ ] `GET /api/hub/nodes` returns normalized business and zap nodes.  
- [ ] `POST /api/analyze` with `businessId` returns tasks and recommendations.  
- [ ] `POST /api/analyze` with `zapId` returns tasks and recommendations.  
- [ ] `GET /zapier/status`, `/zapier/connect-url`, `/zapier/callback`, `/zapier/disconnect` behave as documented above when env is set.

---

## References

- [Zapier OAuth (platform)](https://platform.zapier.com/build/oauth)  
- [Zapier REST hooks](https://platform.zapier.com/build/rest-hooks)  
- [Zapier Trigger/Action setup](https://platform.zapier.com/build/trigger)
