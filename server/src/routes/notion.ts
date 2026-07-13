import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

function requireNotionConfig() {
  if (!env.NOTION_CLIENT_ID || !env.NOTION_CLIENT_SECRET) {
    throw new Error('Notion OAuth is not configured.');
  }
}

router.get('/oauth/start', (req: Request, res: Response) => {
  requireNotionConfig();
  const redirectUri = String(req.query.redirect_uri || '');
  const state = String(req.query.state || '');
  if (!redirectUri || !state) return res.status(400).json({ code: 400, data: null, message: 'redirect_uri and state are required.' });
  const query = new URLSearchParams({ owner: 'user', client_id: env.NOTION_CLIENT_ID!, redirect_uri: redirectUri, response_type: 'code', state });
  return res.json({ code: 200, data: { authorizationUrl: `https://api.notion.com/v1/oauth/authorize?${query}` }, message: 'ok' });
});

router.post('/oauth/exchange', async (req: Request, res: Response) => {
  requireNotionConfig();
  const code = String(req.body?.code || '');
  const redirectUri = String(req.body?.redirectUri || '');
  if (!code || !redirectUri) return res.status(400).json({ code: 400, data: null, message: 'code and redirectUri are required.' });
  const authorization = Buffer.from(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
  });
  const body: any = await response.json();
  if (!response.ok) return res.status(response.status).json({ code: response.status, data: null, message: body?.error_description || body?.message || 'Notion authorization failed.' });
  return res.json({ code: 200, data: { accessToken: body.access_token, workspaceId: body.workspace_id, workspaceName: body.workspace_name, workspaceIcon: body.workspace_icon, botId: body.bot_id }, message: 'ok' });
});

export default router;
