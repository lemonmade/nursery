const HASHED_ASSET_REGEX = /\.[\w+]\.js$/;

export default {
  async fetch(request: Request, env: {ASSETS: any}) {
    if (request.url.endsWith('.js')) {
      const response = await env.ASSETS.fetch(request);

      return new Response(response.body, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': `public, ${HASHED_ASSET_REGEX.test(request.url) ? 'max-age=31536000, immutable' : 'max-age=60'}`,
          'Access-Control-Allow-Origin': '*',
          'Timing-Allow-Origin': '*',
        },
      });
    }

    return new Response('Hello world!');
  },
};
