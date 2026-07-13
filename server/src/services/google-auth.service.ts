import { AppError } from '../utils/errors';

type FetchLike = (url: string) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export interface GoogleIdentity {
  subject: string;
  email: string;
}

export async function verifyGoogleAccessToken(
  accessToken: string,
  expectedClientId: string,
  fetchImpl: FetchLike = fetch
): Promise<GoogleIdentity> {
  const url = new URL('https://oauth2.googleapis.com/tokeninfo');
  url.searchParams.set('access_token', accessToken);
  const response = await fetchImpl(url.toString());
  const parsedBody = await response.json().catch(() => ({}));
  const body = parsedBody && typeof parsedBody === 'object' ? parsedBody as Record<string, unknown> : {};
  if (
    !response.ok ||
    body.aud !== expectedClientId ||
    body.email_verified !== 'true' ||
    typeof body.sub !== 'string' ||
    typeof body.email !== 'string'
  ) {
    throw new AppError(401, 'Google 登录凭证无效');
  }
  return { subject: body.sub, email: body.email.toLowerCase() };
}
