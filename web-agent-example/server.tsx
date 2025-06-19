import '@quilted/quilt/globals';

import {RequestRouter} from '@quilted/quilt/request-router';
import {
  renderAppToHTMLResponse,
  HTML,
  HTMLPlaceholderSerializations,
  HTMLPlaceholderEntryAssets,
  HTMLPlaceholderContent,
} from '@quilted/quilt/server';
import {BrowserAssets} from 'quilt:module/assets';

import {App} from './App.tsx';

const router = new RequestRouter();
const assets = new BrowserAssets();

// For all GET requests, render our Preact application.
router.get(async (request) => {
  const response = await renderAppToHTMLResponse(<App />, {
    request,
    assets,
    template: <HTMLTemplate />,
  });

  return response;
});

function HTMLTemplate() {
  return (
    <HTML>
      <HTMLPlaceholderSerializations />
      <HTMLPlaceholderEntryAssets />

      {/* <script
        type="application/agent-manifest"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            tools: [
              {name: 'get_message', }
            ],
          }),
        }}
      /> */}

      <div id="app">
        <HTMLPlaceholderContent />
      </div>
    </HTML>
  );
}

export default router;
