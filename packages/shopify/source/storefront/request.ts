import {
  GraphQLFetchRequest,
  type GraphQLAnyOperation,
  type GraphQLFetchRequestInit,
} from '@quilted/graphql';

import type {APIVersion} from '../types.ts';
import {getLatestAPIVersion} from '../shared/api-version.ts';

import type {StorefrontAccessToken} from './types.ts';

export interface StorefrontGraphQLRequestOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: APIVersion;
  readonly accessToken?: string | StorefrontAccessToken;
  url?(url: StorefrontGraphQLRequestURL): string | URL;
  headers?(headers: StorefrontGraphQLRequestHeaders): HeadersInit;
}

export class StorefrontGraphQLRequest<
  Data,
  Variables,
> extends GraphQLFetchRequest<Data, Variables> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      shop,
      apiVersion,
      accessToken,
      url: customizeURL,
      headers: customizeHeaders,
    }: StorefrontGraphQLRequestOptions = {},
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
    apiVersion = getLatestAPIVersion(),
  }: Pick<StorefrontGraphQLRequestOptions, 'shop' | 'apiVersion'> = {}) {
    let baseURL: string | URL | undefined;
    let isDirectAPIAccess = false;

    if (typeof shop === 'string') {
      if (shop.startsWith(SHOPIFY_PROTOCOL)) {
        baseURL = shop;
        isDirectAPIAccess = true;
      } else {
        baseURL = shop;
        if (!shop.includes('.')) baseURL = `${baseURL}.myshopify.com`;
        if (!shop.startsWith('https:')) baseURL = `https://${baseURL}`;
      }
    } else if (shop != null) {
      baseURL = shop;
    }

    super(
      `${isDirectAPIAccess ? '/storefront' : ''}/api/${apiVersion}/graphql.json`,
      baseURL,
    );
  }
}

export class StorefrontGraphQLRequestHeaders extends Headers {
  constructor(
    {
      accessToken: accessTokenOrString,
    }: Pick<StorefrontGraphQLRequestOptions, 'accessToken'> = {},
    headers?: HeadersInit,
  ) {
    super(headers);

    if (!accessTokenOrString) return;

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
  // If we are in the browser, assume this is a storefront
  if (typeof document === 'object') return new URL('/', location.href);

  // Otherwise, if this looks like a worker, try to use direct API access
  // (only available in Checkout UI extensions)
  if (typeof (globalThis as any).WorkerGlobalScope !== 'undefined') {
    return 'shopify:/';
  }
}
