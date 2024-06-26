import {createGraphQLStreamingFetch} from '@quilted/graphql';

import {getLatestAPIVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  StorefrontGraphQLRequestURL,
  StorefrontGraphQLRequestHeaders,
  type StorefrontGraphQLRequestOptions,
} from './request.ts';

export function createStorefrontGraphQLStreamingFetch({
  shop = getShopURLFromEnvironment(),
  apiVersion = getLatestAPIVersion(),
  accessToken,
  url: customizeURL,
  headers: customizeHeaders,
}: StorefrontGraphQLRequestOptions) {
  return createGraphQLStreamingFetch({
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
