import {
  GraphQLFetchRequest,
  type GraphQLAnyOperation,
  type GraphQLFetchRequestInit,
} from '@quilted/graphql';

import type {APIVersion} from '../types.ts';
import {getCurrentAPIVersion} from '../shared/api-version.ts';

import type {StorefrontAccessToken} from './types.ts';

export interface StorefrontGraphQLRequestOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: APIVersion;
  readonly accessToken: string | StorefrontAccessToken;
}

export class StorefrontGraphQLRequest<
  Data,
  Variables,
> extends GraphQLFetchRequest<Data, Variables> {
  constructor(
    {shop, apiVersion, accessToken}: StorefrontGraphQLRequestOptions,
    operation: GraphQLAnyOperation<Data, Variables>,
    init?: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    const headers = new StorefrontGraphQLRequestHeaders(
      {accessToken},
      init?.headers,
    );

    super(new StorefrontGraphQLRequestURL({shop, apiVersion}), operation, {
      ...init,
      headers,
    });
  }
}

export class StorefrontGraphQLRequestURL extends URL {
  constructor({
    shop = getShopURLFromEnvironment(),
    apiVersion = getCurrentAPIVersion(),
  }: Pick<StorefrontGraphQLRequestOptions, 'shop' | 'apiVersion'>) {
    super(`/api/${apiVersion}/graphql.json`, shop);
  }
}

export class StorefrontGraphQLRequestHeaders extends Headers {
  constructor(
    {
      accessToken: accessTokenOrString,
    }: Pick<StorefrontGraphQLRequestOptions, 'accessToken'>,
    headers?: HeadersInit,
  ) {
    super(headers);

    const accessToken: StorefrontAccessToken =
      typeof accessTokenOrString === 'string'
        ? {access: 'public', token: accessTokenOrString}
        : accessTokenOrString;

    switch (accessToken.access) {
      // @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-public-access
      case 'public':
      case undefined: {
        const {token} = accessToken;
        this.set('X-Shopify-Storefront-Access-Token', token);
        break;
      }
      // @see https://shopify.dev/docs/api/usage/authentication#getting-started-with-authenticated-access
      case 'private':
      case 'authenticated': {
        const {token, buyerIP} = accessToken;
        this.set('Shopify-Storefront-Private-Token', token);
        if (buyerIP) this.set('Shopify-Storefront-Buyer-IP', buyerIP);
        break;
      }
    }
  }
}

export function getShopURLFromEnvironment() {
  if (typeof location === 'object') return new URL('/', location.href);
}
