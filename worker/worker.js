// Open Calls relay (Cloudflare Worker). The site on GitHub Pages sends its requests here, and this
// forwards them to the Apps Script web app and adds the permission header the browser needs.
// Deploy it in your own Cloudflare account (see the steps in Manual setup.md).

// 1. Paste your Apps Script web app address (ends in /exec) between the quotes.
const SCRIPT_URL = 'PASTE_APPS_SCRIPT_WEB_APP_URL';

// 2. The only website allowed to use this relay.
const SITE_ORIGIN = 'https://gaba512.github.io';

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': SITE_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
    if (request.headers.get('Origin') !== SITE_ORIGIN) return new Response('Forbidden', { status: 403, headers: cors });

    const body = await request.text();
    const upstream = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors)
    });
  }
};
