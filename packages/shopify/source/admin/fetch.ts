import {createGraphQLHttpFetch} from '@quilted/graphql';
import type {GraphQLFetch} from '@quilted/graphql';

import {getCurrentApiVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  AdminGraphQLRequestURL,
  AdminGraphQLRequestHeaders,
  type AdminGraphQLRequestOptions,
} from './request.ts';

export function createAdminGraphQLFetch({
  shop = getShopURLFromEnvironment(),
  apiVersion = getCurrentApiVersion(),
  accessToken,
}: AdminGraphQLRequestOptions): GraphQLFetch {
  return createGraphQLHttpFetch({
    method: 'POST',
    url({name}) {
      const url = new AdminGraphQLRequestURL({shop, apiVersion});

      if (name) {
        url.searchParams.set('operationName', name);
      }

      return url;
    },
    headers() {
      return new AdminGraphQLRequestHeaders({accessToken});
    },
  });
}
