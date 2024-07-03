# @lemonmade/shopify

## 0.5.8

### Patch Changes

- [`523993c`](https://github.com/lemonmade/nursery/commit/523993c0c4af69b240d3e931eb48837b759a3de3) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `latest` alias for latest GraphQL schemas

## 0.5.7

### Patch Changes

- [`9f1eb4d`](https://github.com/lemonmade/nursery/commit/9f1eb4d8a617c607db41bbc89cf49f6cef0b9a34) Thanks [@lemonmade](https://github.com/lemonmade)! - Add exports for storefront GraphQL schemas

- [`d0b80f6`](https://github.com/lemonmade/nursery/commit/d0b80f6e075410081ed39441005d0bf148c9cd79) Thanks [@lemonmade](https://github.com/lemonmade)! - Export `getLatestAPIVersion` helper

- [`10bb470`](https://github.com/lemonmade/nursery/commit/10bb470082be3fe8848d4c6f34732a3b616b3331) Thanks [@lemonmade](https://github.com/lemonmade)! - Add `@lemonmade/shopify/graphql` entrypoint and export schema utilities

## 0.5.6

### Patch Changes

- [`9260e91`](https://github.com/lemonmade/nursery/commit/9260e91a8d51d0370fdbc47697c4a918c13a9b17) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix Shopify query class types

- [`7ab8917`](https://github.com/lemonmade/nursery/commit/7ab8917bd0e3357d55b1fdb5ce7551a815975470) Thanks [@lemonmade](https://github.com/lemonmade)! - Update quilt dependencies

## 0.5.5

### Patch Changes

- [`1df29ee`](https://github.com/lemonmade/nursery/commit/1df29eebd4ad8346949044610b8fc81cf808d69e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add Direct API Access support for admin helpers

- [`1df29ee`](https://github.com/lemonmade/nursery/commit/1df29eebd4ad8346949044610b8fc81cf808d69e) Thanks [@lemonmade](https://github.com/lemonmade)! - Add query and mutation classes for observable GraphQL queries

## 0.5.4

### Patch Changes

- [`5deb156`](https://github.com/lemonmade/nursery/commit/5deb15611e4eace7a37fe9a0142f4ed8fb94c0a6) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve the default logic for GraphQL creator functions

## 0.5.3

### Patch Changes

- [`c38d333`](https://github.com/lemonmade/nursery/commit/c38d333e3835747933fc9409ea543895a30e5326) Thanks [@lemonmade](https://github.com/lemonmade)! - Improve API version types

## 0.5.2

### Patch Changes

- [`86ca9b7`](https://github.com/lemonmade/nursery/commit/86ca9b704bc9afb778286423197f2e8ec9dd1d96) Thanks [@lemonmade](https://github.com/lemonmade)! - Add ability to override URL and headers

- [`91fab53`](https://github.com/lemonmade/nursery/commit/91fab53bfb3bf236a3e3e39f2441276ff51c4bad) Thanks [@lemonmade](https://github.com/lemonmade)! - Update list of supported API versions

## 0.5.1

### Patch Changes

- [`89af76d`](https://github.com/lemonmade/nursery/commit/89af76d57d5ca80130823d7009d6ff7b0d6e33cc) Thanks [@lemonmade](https://github.com/lemonmade)! - Fix missing types

## 0.5.0

### Minor Changes

- [`46eca9f`](https://github.com/lemonmade/nursery/commit/46eca9f324732d0df433412d11b04e6bdb506f40) Thanks [@lemonmade](https://github.com/lemonmade)! - Removed CommonJS outputs

### Patch Changes

- [`e45c8bb`](https://github.com/lemonmade/nursery/commit/e45c8bb1d13942255bff29ce30eb04a221c24604) Thanks [@lemonmade](https://github.com/lemonmade)! - Update GraphQL dependency

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
