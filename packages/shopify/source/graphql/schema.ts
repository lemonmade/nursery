import {GraphQLRun} from '@quilted/graphql';
import {
  buildClientSchema,
  getIntrospectionQuery,
  type IntrospectionQuery,
} from 'graphql';

export async function fetchIntrospectionQuery({
  fetch,
}: {
  fetch: GraphQLRun<any, any>;
}) {
  const result = await fetch<IntrospectionQuery>(getIntrospectionQuery());

  if (result.data == null) {
    throw new Error(`Could not fetch introspection query`);
  }

  return result.data;
}

export async function fetchGraphQLSchema({
  fetch,
}: {
  fetch: GraphQLRun<any, any>;
}) {
  const result = await fetchIntrospectionQuery({fetch});

  return buildClientSchema(result);
}
