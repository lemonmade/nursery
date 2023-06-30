import {
  GraphQLFetchRequest,
  type GraphQLFetchRequestInit,
} from '@quilted/graphql';

import type {ApiVersion} from '../types.ts';
import {getCurrentApiVersion} from '../shared/api-version.ts';

import type {StorefrontAccessToken} from './types.ts';

export interface StorefrontGraphQLRequestOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: ApiVersion;
  readonly accessToken: string | StorefrontAccessToken;
}

export class StorefrontGraphQLRequest<
  Data,
  Variables,
> extends GraphQLFetchRequest<Data, Variables> {
  constructor(
    {shop, apiVersion, accessToken}: StorefrontGraphQLRequestOptions,
    init: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    super(new StorefrontGraphQLRequestURL({shop, apiVersion}), {
      ...init,
      headers: new StorefrontGraphQLRequestHeaders({accessToken}),
    });
  }
}

export class StorefrontGraphQLRequestURL extends URL {
  constructor({
    shop = getShopURLFromEnvironment(),
    apiVersion = getCurrentApiVersion(),
  }: Pick<StorefrontGraphQLRequestOptions, 'shop' | 'apiVersion'>) {
    super(`/api/${apiVersion}/graphql.json`, shop);
  }
}

export class StorefrontGraphQLRequestHeaders extends Headers {
  constructor({
    accessToken: accessTokenOrString,
  }: Pick<StorefrontGraphQLRequestOptions, 'accessToken'>) {
    super({
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
