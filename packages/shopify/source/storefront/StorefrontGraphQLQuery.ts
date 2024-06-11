import {GraphQLQuery, type GraphQLAnyOperation} from '@quilted/graphql';

import {createStorefrontGraphQLFetch} from './fetch.ts';

type GraphQLQueryOptions<Data, Variables> = NonNullable<
  ConstructorParameters<typeof GraphQLQuery<Data, Variables>>[1]
>;

export class StorefrontGraphQLQuery<Data, Variables> extends GraphQLQuery<
  Data,
  Variables
> {
  constructor(
    operation: GraphQLAnyOperation<Data, Variables>,
    {
      fetch = createStorefrontGraphQLFetch(),
      cached,
    }: NoInfer<
      {
        /**
         * The function used to run the GraphQL query. If not provided,
         * a default Storefront GraphQL fetch function will be used, which
         * will only work in environments like UI extensions where both the
         * `shop` and `accessToken` options are optional.
         */
        fetch?: GraphQLQueryOptions<Data, Variables>['fetch'];
      } & Omit<GraphQLQueryOptions<Data, Variables>, 'fetch'>
    > = {} as any,
  ) {
    super(operation, {fetch, cached});
  }
}
