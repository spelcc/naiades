import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';
import { env } from 'cloudflare:workers';
import config from 'virtual:keystatic-config';

const keystaticHandler = makeGenericAPIRouteHandler({
  config,
  clientId: env.KEYSTATIC_GITHUB_CLIENT_ID,
  clientSecret: env.KEYSTATIC_GITHUB_CLIENT_SECRET,
  secret: env.KEYSTATIC_SECRET,
}, {
  slugEnvName: 'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG',
});

async function handler(context) {
  const result = await keystaticHandler(context.request);
  return new Response(result.body, {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
  });
}

export const all = handler;
export const ALL = handler;
export const prerender = false;
