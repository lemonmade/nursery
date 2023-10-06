# @lemonmade/shopify

## 0.4.0

### Minor Changes

- [`2fc9dfd`](https://github.com/lemonmade/nursery/commit/2fc9dfd04aac18f59aa2b50e2697e3b5a9daef23) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade `@quilted/graphql` to latest major version

## 0.3.2

### Patch Changes

- [`a19241c`](https://github.com/lemonmade/nursery/commit/a19241c71db4e39cb0868e485c79c314edae39ae) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade @quilted/graphql peer dependency

## 0.3.1

### Patch Changes

- [`114eb50`](https://github.com/lemonmade/nursery/commit/114eb50da5e4c65bd29565b31580d261154862e5) Thanks [@lemonmade](https://github.com/lemonmade)! - Update quilt dependencies to 1.0 versions

## 0.3.0

### Minor Changes

- [`d22add1`](https://github.com/lemonmade/nursery/commit/d22add1944ded0f7d1a62199c0cc9bd22313b455) Thanks [@lemonmade](https://github.com/lemonmade)! - Added GID parsing utilities. You can now import `parseGID` and/ or the `ShopifyGID` class from `@lemonmade/shopify`, as well as from the `/storefront` and `/admin` entrypoints for that package. These utilities allow you to parse the [global IDs (GIDs) returned by most of Shopify’s APIs](https://shopify.dev/docs/api/usage/gids). This is most useful for extracting the legacy resource ID, resource type, and additional query parameters that are embedded in the GID.

  ```ts
  import {parseGID, ShopifyGID} from '@lemonmade/shopify';

  // You will usually receive these GIDs from Shopify APIs.
  const {id, resource, searchParams} = parseGID(
    'gid://shopify/Product/1234567890',
  );

  // Or, you can construct a GID manually yourself:
  const {gid} = ShopifyGID.from({id: '1234567890', resource: 'Product'});
  ```

## 0.2.0

### Minor Changes

- [`4c95db5`](https://github.com/lemonmade/nursery/commit/4c95db5555a4fb609438e05563b5de14f494c2dd) Thanks [@lemonmade](https://github.com/lemonmade)! - Add admin GraphQL utilities

* [`80691ff`](https://github.com/lemonmade/nursery/commit/80691ffd84773d94359f15a91ebcb1c6e29ec418) Thanks [@lemonmade](https://github.com/lemonmade)! - Update GraphQL dependency

## 0.1.3

### Patch Changes

- [`6bb0e0e`](https://github.com/lemonmade/nursery/commit/6bb0e0edf23a615c7f6e11a9807609a8d58ed69a) Thanks [@lemonmade](https://github.com/lemonmade)! - Upgrade to support streaming GraphQL client

## 0.1.2

### Patch Changes

- [`7313cd0`](https://github.com/lemonmade/nursery/commit/7313cd0b28270399ec1c8f4c191e609f9a1ca8ee) Thanks [@lemonmade](https://github.com/lemonmade)! - Update Quilt GraphQL dependency

* [`7313cd0`](https://github.com/lemonmade/nursery/commit/7313cd0b28270399ec1c8f4c191e609f9a1ca8ee) Thanks [@lemonmade](https://github.com/lemonmade)! - Web-ify Shopify Storefront API access

## 0.1.1

### Patch Changes

- [`aa11a1b`](https://github.com/lemonmade/nursery/commit/aa11a1b786b8b28083628e6deabfa4dc286a1e4a) Thanks [@lemonmade](https://github.com/lemonmade)! - Update to latest @quilted/graphql
