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
}

export class AdminGraphQLRequest<Data, Variables> extends GraphQLFetchRequest<
  Data,
  Variables
> {
  constructor(
    {shop, apiVersion, accessToken}: AdminGraphQLRequestOptions,
    operation: GraphQLAnyOperation<Data, Variables>,
    init?: GraphQLFetchRequestInit<Data, Variables>,
  ) {
    const headers = new AdminGraphQLRequestHeaders(
      {accessToken},
      init?.headers,
    );

    super(new AdminGraphQLRequestURL({shop, apiVersion}), operation, {
      ...init,
      headers,
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
