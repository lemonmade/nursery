import {GraphQLQuery, type GraphQLAnyOperation} from '@quilted/graphql';

import {createAdminGraphQLFetch} from './fetch.ts';

type GraphQLQueryOptions<Data, Variables> = NonNullable<
  ConstructorParameters<typeof GraphQLQuery<Data, Variables>>[1]
>;

export class AdminGraphQLQuery<Data, Variables> extends GraphQLQuery<
  Data,
  Variables
> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createAdminGraphQLFetch(),
      cached,
    }: {
      /**
       * The function used to run the GraphQL query. If not provided,
       * a default Admin GraphQL fetch function will be used, which
       * will only work in environments that support Direct API access.
       *
       * @see https://shopify.dev/docs/api/admin-extensions/unstable#direct-api-access
       * @see https://shopify.dev/docs/api/app-bridge-library#direct-api-access
       */
      fetch?: GraphQLQueryOptions<Data, Variables>['fetch'];
    } & Omit<GraphQLQueryOptions<Data, Variables>, 'fetch'> = {},
  ) {
    super(operation, {fetch, cached});
  }
}
