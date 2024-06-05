import {createGraphQLFetch} from '@quilted/graphql';

import {getCurrentAPIVersion} from '../shared/api-version.ts';
import {
  AdminGraphQLRequestURL,
  AdminGraphQLRequestHeaders,
  type AdminGraphQLRequestOptions,
} from './request.ts';

export function createAdminGraphQLFetch({
  shop,
  apiVersion = getCurrentAPIVersion(),
  accessToken,
  url: customizeURL,
  headers: customizeHeaders,
}: AdminGraphQLRequestOptions = {}) {
  return createGraphQLFetch({
    method: 'POST',
    url({name}) {
      const url = new AdminGraphQLRequestURL({shop, apiVersion});

      if (name) {
        url.searchParams.set('operationName', name);
      }

      return customizeURL ? customizeURL(url) : url;
    },
    headers() {
      const headers = new AdminGraphQLRequestHeaders({accessToken});
      return customizeHeaders ? customizeHeaders(headers) : headers;
    },
  });
}
