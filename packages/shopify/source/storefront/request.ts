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
  url?(url: StorefrontGraphQLRequestURL): string | URL;
  headers?(headers: StorefrontGraphQLRequestHeaders): HeadersInit;
}

export class StorefrontGraphQLRequest<
  Data,
  Variables,
> extends GraphQLFetchRequest<Data, Variables> {
  constructor(
    {
      shop,
      apiVersion,
      accessToken,
      url: customizeURL,
      headers: customizeHeaders,
    }: StorefrontGraphQLRequestOptions,
    operation: GraphQLAnyOperation<Data, Variables>,
    init?: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    const url = new StorefrontGraphQLRequestURL({shop, apiVersion});
    const headers = new StorefrontGraphQLRequestHeaders(
      {accessToken},
      init?.headers,
    );

    super(customizeURL ? customizeURL(url) : url, operation, {
      ...init,
      headers: customizeHeaders ? customizeHeaders(headers) : headers,
    });
  }
}

const SHOPIFY_PROTOCOL = 'shopify:';

export class StorefrontGraphQLRequestURL extends URL {
  constructor({
    shop = getShopURLFromEnvironment(),
    apiVersion = getCurrentAPIVersion(),
  }: Pick<StorefrontGraphQLRequestOptions, 'shop' | 'apiVersion'>) {
    let baseURL: string | URL | undefined;

    if (typeof shop === 'string') {
      if (shop.startsWith(SHOPIFY_PROTOCOL)) {
        baseURL = shop;
      } else {
        baseURL = shop;
        if (!shop.includes('.')) baseURL = `${baseURL}.myshopify.com`;
        if (!shop.startsWith('https:')) baseURL = `https://${baseURL}`;
      }
    } else if (shop != null) {
      baseURL = shop;
    }

    super(`/api/${apiVersion}/graphql.json`, baseURL);
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
