import {createGraphQLHttpFetch} from '@quilted/graphql';
import type {GraphQLFetch} from '@quilted/graphql';

import {getCurrentApiVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  StorefrontGraphQLRequestURL,
  StorefrontGraphQLRequestHeaders,
  type StorefrontGraphQLRequestOptions,
} from './request.ts';

export function createStorefrontGraphQLFetch({
  shop = getShopURLFromEnvironment(),
  apiVersion = getCurrentApiVersion(),
  accessToken,
}: StorefrontGraphQLRequestOptions): GraphQLFetch {
  return createGraphQLHttpFetch({
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
