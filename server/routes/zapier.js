import { Router } from 'express';
import { getZapierConnection, setZapierConnection, clearZapierConnection } from '../store.js';

const ZAPIER_AUTHORIZE_URL = 'https://api.zapier.com/v2/authorize';
const ZAPIER_TOKEN_URL = 'https://api.zapier.com/v2/token';

function getRedirectUri(req) {
  const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || '';
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}/zapier-callback`;
  }
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || (req.connection?.encrypted ? 'https' : 'http');
  return `${protocol}://${host}/zapier-callback`;
}

export const zapierRouter = Router();

zapierRouter.get('/status', (_req, res) => {
  try {
    const conn = getZapierConnection();
    res.json({
      connected: !!conn,
      connectionId: conn?.connectionId || undefined,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Zapier status' });
  }
});

zapierRouter.get('/connect-url', (req, res) => {
  try {
    const clientId = process.env.ZAPIER_CLIENT_ID;
    if (!clientId) {
      res.status(503).json({
        error: 'Zapier integration not configured. Set ZAPIER_CLIENT_ID and APP_URL in server environment.',
      });
      return;
    }
    const redirectUri = getRedirectUri(req);
    const state = `bh-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const url = new URL(ZAPIER_AUTHORIZE_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'zap zap:write');
    url.searchParams.set('state', state);
    url.searchParams.set('response_mode', 'query');
    res.json({ url: url.toString(), state });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build connect URL' });
  }
});

zapierRouter.post('/callback', async (req, res) => {
  try {
    const code = req.body?.code?.trim();
    if (!code) {
      res.status(400).json({ error: 'Authorization code is required' });
      return;
    }
    const clientId = process.env.ZAPIER_CLIENT_ID;
    const clientSecret = process.env.ZAPIER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      res.status(503).json({
        error: 'Zapier integration not configured. Set ZAPIER_CLIENT_ID and ZAPIER_CLIENT_SECRET.',
      });
      return;
    }
    const redirectUri = getRedirectUri(req);
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const tokenRes = await fetch(ZAPIER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Zapier token exchange failed:', tokenRes.status, errText);
      res.status(502).json({ error: 'Zapier authorization failed. Invalid or expired code.' });
      return;
    }
    const data = await tokenRes.json();
    const connectionId = data.access_token ? `zapier-${Date.now()}` : null;
    setZapierConnection(undefined, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      connectionId,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    });
    res.json({ connected: true, connectionId });
  } catch (err) {
    console.error('Zapier callback error:', err);
    res.status(500).json({ error: 'Failed to complete Zapier connection' });
  }
});

zapierRouter.post('/disconnect', (_req, res) => {
  try {
    clearZapierConnection();
    res.json({ connected: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Zapier' });
  }
});
