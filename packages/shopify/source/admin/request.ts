import {
  GraphQLFetchRequest,
  type GraphQLAnyOperation,
  type GraphQLFetchRequestInit,
} from '@quilted/graphql';

import type {APIVersion} from '../types.ts';
import {getCurrentAPIVersion} from '../shared/api-version.ts';

export interface AdminGraphQLRequestOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: APIVersion;

  /**
   * @see https://shopify.dev/docs/apps/auth/admin-app-access-tokens
   */
  readonly accessToken: string;
  url?(url: AdminGraphQLRequestURL): string | URL;
  headers?(headers: AdminGraphQLRequestHeaders): HeadersInit;
}

export class AdminGraphQLRequest<Data, Variables> extends GraphQLFetchRequest<
  Data,
  Variables
> {
  constructor(
    {
      shop,
      apiVersion,
      accessToken,
      url: customizeURL,
      headers: customizeHeaders,
    }: AdminGraphQLRequestOptions,
    operation: GraphQLAnyOperation<Data, Variables>,
    init?: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    const url = new AdminGraphQLRequestURL({shop, apiVersion});
    const headers = new AdminGraphQLRequestHeaders(
      {accessToken},
      init?.headers,
    );

    super(customizeURL ? customizeURL(url) : url, operation, {
      ...init,
      headers: customizeHeaders ? customizeHeaders(headers) : headers,
    });
  }
}

export class AdminGraphQLRequestURL extends URL {
  constructor({
    shop = getShopURLFromEnvironment(),
    apiVersion = getCurrentAPIVersion(),
  }: Pick<AdminGraphQLRequestOptions, 'shop' | 'apiVersion'>) {
    super(`/admin/api/${apiVersion}/graphql.json`, shop);
  }
}

export class AdminGraphQLRequestHeaders extends Headers {
  constructor(
    {accessToken}: Pick<AdminGraphQLRequestOptions, 'accessToken'>,
    headers?: HeadersInit,
  ) {
    super(headers);
    this.set('X-Shopify-Access-Token', accessToken);
  }
}

export function getShopURLFromEnvironment() {
  if (typeof location === 'object') return new URL('/', location.href);
}
