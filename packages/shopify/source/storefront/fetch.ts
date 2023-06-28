import type {
  GraphQLFetch,
  GraphQLOperation,
  GraphQLResult,
  GraphQLData,
  GraphQLVariables,
  GraphQLVariableOptions,
} from '@quilted/graphql';

import type {ApiVersion} from '../types.ts';
import {getCurrentApiVersion} from '../shared/api-version.ts';

export type {
  GraphQLFetch,
  GraphQLOperation,
  GraphQLResult,
  GraphQLData,
  GraphQLVariables,
  GraphQLVariableOptions,
};

export type StorefrontAccessToken =
  | {
      /**
       * A client-side public access token.
       * @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-public-access
       */
      readonly access?: 'public';
      readonly token: string;
      readonly buyerIP?: never;
    }
  | {
      /**
       * A server-side authenticated access token.
       * @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-authenticated-access
       */
      readonly access: 'authenticated' | 'private';
      readonly token: string;
      readonly buyerIP?: string;
    };

export interface StorefrontGraphQLFetchOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: ApiVersion;
  readonly accessToken: string | StorefrontAccessToken;
}

export interface StorefrontGraphQLFetchContext {
  response?: Response;
}

declare module '@quilted/graphql' {
  interface GraphQLFetchContext extends StorefrontGraphQLFetchContext {}
}

export function createStorefrontGraphQLFetch<
  Extensions = Record<string, unknown>,
>({
  shop = getShopFromEnvironment(),
  apiVersion = getCurrentApiVersion(),
  accessToken,
}: StorefrontGraphQLFetchOptions): GraphQLFetch<Extensions> {
  const fetchGraphQL: GraphQLFetch<Extensions> = async function fetchGraphQL(
    operation,
    options,
    context,
  ) {
    const {url, headers} = createStorefrontGraphQLRequestOptions({
      shop,
      accessToken,
      apiVersion,
    });

    // Helpful for debugging operations in the browser developer console
    if (operation.name) {
      url.searchParams.set('operation', operation.name);
    }

    const request: RequestInit = {
      method: 'POST',
      headers,
      signal: options?.signal,
      body: JSON.stringify({
        query: operation.source,
        variables: options?.variables ?? {},
        operationName: operation.name,
      }),
    };

    const response = await fetch(url, request);

    if (context) context.response = response;

    if (!response.ok) {
      return {
        errors: [
          {
            response,
            message: `GraphQL fetch failed with status: ${
              response.status
            }, response: ${await response.text()}`,
          },
        ],
      };
    }

    const result = await response.json();
    return result;
  };

  return fetchGraphQL;
}

export interface StorefrontGraphQLRequestOptions {
  readonly url: URL;
  readonly headers: Headers;
}

export function createStorefrontGraphQLRequestOptions({
  shop = getShopFromEnvironment(),
  apiVersion = getCurrentApiVersion(),
  accessToken: accessTokenOrString,
}: StorefrontGraphQLFetchOptions): StorefrontGraphQLRequestOptions {
  const url = new URL(`/api/${apiVersion}/graphql.json`, shop);

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  const accessToken: StorefrontAccessToken =
    typeof accessTokenOrString === 'string'
      ? {access: 'public', token: accessTokenOrString}
      : accessTokenOrString;

  switch (accessToken.access) {
    // @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-public-access
    case 'public':
    case undefined: {
      const {token} = accessToken;
      headers.set('X-Shopify-Storefront-Access-Token', token);
      break;
    }
    // @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-authenticated-access
    case 'private':
    case 'authenticated': {
      const {token, buyerIP} = accessToken;
      headers.set('Shopify-Storefront-Private-Token', token);
      if (buyerIP) headers.set('Shopify-Storefront-Buyer-IP', buyerIP);
      break;
    }
  }

  return {url, headers};
}

function getShopFromEnvironment() {
  if (typeof location === 'object') return new URL('/', location.href);
}
