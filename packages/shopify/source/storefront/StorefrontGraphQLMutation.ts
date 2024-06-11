import {GraphQLMutation, type GraphQLAnyOperation} from '@quilted/graphql';

import {createStorefrontGraphQLFetch} from './fetch.ts';

type GraphQLMutationOptions<Data, Variables> = NonNullable<
  ConstructorParameters<typeof GraphQLMutation<Data, Variables>>[1]
>;

export class StorefrontGraphQLMutation<Data, Variables> extends GraphQLMutation<
  Data,
  Variables
> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createStorefrontGraphQLFetch(),
    }: NoInfer<
      {
        /**
         * The function used to run the GraphQL mutation. If not provided,
         * a default Storefront GraphQL fetch function will be used, which
         * will only work in environments like UI extensions where both the
         * `shop` and `accessToken` options are optional.
         */
        fetch?: GraphQLMutationOptions<Data, Variables>['fetch'];
      } & Omit<GraphQLMutationOptions<Data, Variables>, 'fetch'>
    > = {},
  ) {
    super(operation, {fetch});
  }
}
