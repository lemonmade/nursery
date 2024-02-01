import {createGraphQLFetch} from '@quilted/graphql';

import {getCurrentAPIVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  AdminGraphQLRequestURL,
  AdminGraphQLRequestHeaders,
  type AdminGraphQLRequestOptions,
} from './request.ts';

export function createAdminGraphQLFetch({
  shop = getShopURLFromEnvironment(),
  apiVersion = getCurrentAPIVersion(),
  accessToken,
}: AdminGraphQLRequestOptions) {
  return createGraphQLFetch({
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
