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
}: StorefrontGraphQLRequestOptions) {
  return createGraphQLFetch({
    method: 'POST',
    url({name}) {
      const url = new StorefrontGraphQLRequestURL({shop, apiVersion});

      if (name) {
        url.searchParams.set('operationName', name);
      }

      return url;
    },
    headers() {
      return new StorefrontGraphQLRequestHeaders({accessToken});
    },
  });
}
