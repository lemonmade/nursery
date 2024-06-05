import {createGraphQLFetch} from '@quilted/graphql';

import {getCurrentAPIVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  StorefrontGraphQLRequestURL,
  StorefrontGraphQLRequestHeaders,
  type StorefrontGraphQLRequestOptions,
} from './request.ts';

export function createStorefrontGraphQLFetch({
  shop = getShopURLFromEnvironment(),
  apiVersion = getCurrentAPIVersion(),
  accessToken,
  url: customizeURL,
  headers: customizeHeaders,
}: StorefrontGraphQLRequestOptions = {}) {
  return createGraphQLFetch({
    method: 'POST',
    url({name}) {
      const url = new StorefrontGraphQLRequestURL({shop, apiVersion});

      if (name) {
        url.searchParams.set('operationName', name);
      }

      return customizeURL ? customizeURL(url) : url;
    },
    headers() {
      const headers = new StorefrontGraphQLRequestHeaders({accessToken});
      return customizeHeaders ? customizeHeaders(headers) : headers;
    },
  });
}
