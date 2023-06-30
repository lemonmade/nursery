import {createGraphQLHttpFetch} from '@quilted/graphql';
import type {
  GraphQLFetch,
  GraphQLOperation,
  GraphQLResult,
  GraphQLData,
  GraphQLVariables,
  GraphQLVariableOptions,
} from '@quilted/graphql';

import {getCurrentApiVersion} from '../shared/api-version.ts';
import {
  getShopURLFromEnvironment,
  StorefrontGraphQLRequestURL,
  StorefrontGraphQLRequestHeaders,
  type StorefrontGraphQLRequestOptions,
} from './request.ts';

export type {
  GraphQLFetch,
  GraphQLOperation,
  GraphQLResult,
  GraphQLData,
  GraphQLVariables,
  GraphQLVariableOptions,
};

export interface StorefrontGraphQLFetchContext {
  response?: Response;
}

declare module '@quilted/graphql' {
  interface GraphQLFetchContext extends StorefrontGraphQLFetchContext {}
}

export function createStorefrontGraphQLFetch<
  Extensions = Record<string, unknown>,
>({
  shop = getShopURLFromEnvironment(),
  apiVersion = getCurrentApiVersion(),
  accessToken,
}: StorefrontGraphQLRequestOptions): GraphQLFetch<Extensions> {
  return createGraphQLHttpFetch({
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
