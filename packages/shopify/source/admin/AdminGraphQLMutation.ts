import {GraphQLMutation, type GraphQLAnyOperation} from '@quilted/graphql';

import {createAdminGraphQLFetch} from './fetch.ts';

type GraphQLMutationOptions<Data, Variables> = NonNullable<
  ConstructorParameters<typeof GraphQLMutation<Data, Variables>>[1]
>;

export class AdminGraphQLMutation<Data, Variables> extends GraphQLMutation<
  Data,
  Variables
> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createAdminGraphQLFetch(),
    }: {
      /**
       * The function used to run the GraphQL mutation. If not provided,
       * a default Admin GraphQL fetch function will be used, which
       * will only work in environments that support Direct API access.
       *
       * @see https://shopify.dev/docs/api/admin-extensions/unstable#direct-api-access
       * @see https://shopify.dev/docs/api/app-bridge-library#direct-api-access
       */
      fetch?: GraphQLMutationOptions<Data, Variables>['fetch'];
    } & Omit<GraphQLMutationOptions<Data, Variables>, 'fetch'> = {},
  ) {
    super(operation, {fetch});
  }
}
