# `@lemonmade/shopify`

## Storefront

This package provides a set of utilities for working with the [Shopify Storefront API](https://shopify.dev/docs/api/storefront). It includes a set of functions for running GraphQL queries and mutations, as well as a few helpers

### Running Storefront queries and mutations

TODO

```ts
import {createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch();
```

```ts
import {createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch({
  apiVersion: 'unstable',
  shop: 'https://my-shop.com',
  accessToken: MY_PUBLIC_ACCESS_TOKEN,
});
```

```ts
import {createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch({
  apiVersion: 'unstable',
  shop: 'https://shop.myshopify.com',
  accessToken: {
    access: 'authenticated',
    token: MY_ACCESS_TOKEN,
  },
});
```

```ts
import {createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch({
  apiVersion: 'unstable',
  shop: 'https://shop.myshopify.com',
  accessToken: {
    access: 'authenticated',
    token: env.SHOPIFY_STOREFRONT_AUTHENTICATED_ACCESS_TOKEN,
    buyerIP: request.headers.get('CF-Connecting-IP'),
  },
});
```

```ts
import {gql, createStorefrontGraphQLFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLFetch();

const shopQuery = gql`
  query {
    shop {
      name
    }
  }
`;

const {data, errors} = await fetchGraphQL(shopQuery);
```

```ts
import {gql, StorefrontGraphQLQuery} from '@lemonmade/shopify/storefront';

const shopQuery = gql`
  query {
    shop {
      name
    }
  }
`;

const query = new StorefrontGraphQLQuery(shopQuery);
const {data, errors} = await query.run(shopQuery);
```

### Using the `@defer` directive

Handling the streamed responses of the `@defer` directive takes a bit more work than a “standard” GraphQL request, so this library provides a dedicated `createStorefrontGraphQLStreamingFetch()` function. You can use this to create a function that will handle the construction of GraphQL requests, and the parsing of the streamed response body.

When creating your GraphQL fetch function, you can pass in the same `shop`, `accessToken`, and `apiVersion` options that are documented above, for `createStorefrontGraphQLFetch()`. Like with that function, you can omit any of the options, and they will be inferred from the global environment.

```ts
import {createStorefrontGraphQLStreamingFetch} from '@lemonmade/shopify/storefront';

const fetchGraphQL = createStorefrontGraphQLStreamingFetch({
  apiVersion: 'unstable',
  shop: 'https://my-shop.com',
  accessToken: MY_PUBLIC_ACCESS_TOKEN,
});
```

The resulting function can be used like ones created by `createStorefrontGraphQLFetch()`, to run GraphQL queries and mutations without the `@defer` directive:

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

More importantly, though, this function will return an [async iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncIterator). Each incremental result will cause this iterator to yield the curent, combined response value, as well as details about the last incremental result that was received.

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
