import {
  GraphQLFetchRequest,
  type GraphQLAnyOperation,
  type GraphQLFetchRequestInit,
} from '@quilted/graphql';

import type {APIVersion} from '../types.ts';
import {getLatestAPIVersion} from '../shared/api-version.ts';

export interface AdminGraphQLRequestOptions {
  readonly shop?: string | URL;
  readonly apiVersion?: APIVersion;

  /**
   * @see https://shopify.dev/docs/apps/auth/admin-app-access-tokens
   */
  readonly accessToken?: string;
  url?(url: AdminGraphQLRequestURL): string | URL;
  headers?(headers: AdminGraphQLRequestHeaders): HeadersInit;
}

export class AdminGraphQLRequest<Data, Variables> extends GraphQLFetchRequest<
  Data,
  Variables
> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      shop,
      apiVersion,
      accessToken,
      url: customizeURL,
      headers: customizeHeaders,
    }: AdminGraphQLRequestOptions,
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
    // If no shop is provided, try to use Direct API access
    shop = 'shopify:/',
    apiVersion = getLatestAPIVersion(),
  }: Pick<AdminGraphQLRequestOptions, 'shop' | 'apiVersion'> = {}) {
    super(`/admin/api/${apiVersion}/graphql.json`, shop);
  }
}

export class AdminGraphQLRequestHeaders extends Headers {
  constructor(
    {accessToken}: Pick<AdminGraphQLRequestOptions, 'accessToken'>,
    headers?: HeadersInit,
  ) {
    super(headers);
    // Direct API access does not require an access token
    if (accessToken) this.set('X-Shopify-Access-Token', accessToken);
  }
}
