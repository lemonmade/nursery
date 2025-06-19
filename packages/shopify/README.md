# `@lemonmade/shopify`

## Storefront

This package provides a set of utilities for working with the [Shopify Storefront API](https://shopify.dev/docs/api/storefront). It includes a set of functions for running GraphQL queries and mutations, as well as a few helpers

### Running Storefront queries and mutations

TODO

```ts
import {gql, createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

// Default values:
// - `shop` is inferred from the current page
// - `apiVersion` is the most recent stable API version
// - `accessToken` is omitted, relying on tokenless or environment-provided tokens
const fetchGraphQL = createStorefrontGraphQLFetch();

// gql is just a helper that improves syntax highlighting in some editors
const shopQuery = gql`
  query {
    shop {
      name
    }
  }
`;

// Make your query
const {data, errors} = await fetchGraphQL(shopQuery);
```

Available options:

```ts
import {createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

// Hardcoded shop URL
const fetchGraphQL = createStorefrontGraphQLFetch({
  shop: 'https://my-shop.com',
});

// Hardcoded API version
const fetchGraphQL = createStorefrontGraphQLFetch({
  apiVersion: 'unstable',
});

// Unauthenticated Storefront API access token
const accessToken = document.querySelector(
  'script[type="shopify/storefront-access-token"]',
)?.textContent;

const fetchGraphQL = createStorefrontGraphQLFetch({
  accessToken,
});

// Authenticated Storefront API access token
const fetchGraphQL = createStorefrontGraphQLFetch({
  shop: 'shop.myshopify.com',
  accessToken: {
    access: 'authenticated',
    token: env.SHOPIFY_STOREFRONT_AUTHENTICATED_ACCESS_TOKEN,
  },
});

// Authenticated Storefront API access token with buyer IP
const fetchGraphQL = createStorefrontGraphQLFetch({
  shop: 'shop.myshopify.com',
  accessToken: {
    access: 'authenticated',
    token: env.SHOPIFY_STOREFRONT_AUTHENTICATED_ACCESS_TOKEN,
    buyerIP: request.headers.get('CF-Connecting-IP'),
  },
});
```

There is also an object-based wrapper around the `fetch()` function. This wrapper, based on [`@quilted/graphql`’s `GraphQLQuery`](https://github.com/lemonmade/quilt/tree/main/packages/graphql#fetching-graphql-queries-and-mutations) which can be used to run and re-run a query over time while observing the state of each individual run:

```ts
import {effect} from '@preact/signals';
import {
  createStorefrontGraphQLFetch,
  StorefrontGraphQLQuery,
} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch();

const productDetailsQuery = new StorefrontGraphQLQuery(
  `
  query ProductDetails($id: ID!) {
    product(id: $id) {
      id
      title
    }
  }
`,
  {fetch: fetchGraphQL},
);

// StorefrontGraphQLQuery is backed by Preact signals, so you can easily observe and reach to changes
// in the underlying value as the query is used.
effect(() => {
  console.log(
    `Latest query value: ${productDetailsQuery.value}, startedAt: ${productDetailsQuery.latest?.startedAt}, finishedAt: ${productDetailsQuery.latest?.finishedAt}`,
  );
});

const result1 = await productDetailsQuery.fetch({
  variables: {id: 'gid://shopify/Product/1'},
});

// Later...

const result2 = await productDetailsQuery.fetch({
  variables: {id: 'gid://shopify/Product/1'},
});
```

### Using the `@defer` directive

Handling the streamed responses of the `@defer` directive takes a bit more work than a “standard” GraphQL request, so this library provides a dedicated `createStorefrontGraphQLStreamingFetch()` function. You can use this to create a function that will handle the construction of GraphQL requests, and the parsing of the streamed response body.

When creating your GraphQL fetch function, you can pass in the same `shop`, `accessToken`, and `apiVersion` options that are documented above, for `createStorefrontGraphQLFetch()`. Like with that function, you can omit any of the options, and they will be inferred from the global environment. The resulting function can be used like ones created by `createStorefrontGraphQLFetch()`, to run GraphQL queries and mutations without the `@defer` directive:

```ts
import {
  gql,
  createStorefrontGraphQLStreamingFetch,
} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLStreamingFetch();

const shopQuery = gql`
  query {
    shop {
      name
    }
  }
`;

const {data, errors} = await fetchGraphQL(shopQuery);
```

More importantly, though, this function will return an [async iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator). Each incremental result will cause this iterator to yield the current, combined response value, as well as details about the last incremental result that was received.

```ts
import {
  gql,
  createStorefrontGraphQLStreamingFetch,
} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLStreamingFetch();

const productsQuery = gql`
  query {
    product(id: $id) {
      id
      title
    }
    ... on QueryRoot @defer {
      productRecommendations(productId: $id) {
        id
        title
      }
    }
  }
`;

for await (const {data, errors, incremental, hasNext} of fetchGraphQL(
  productsQuery,
)) {
  // ...
}
```
