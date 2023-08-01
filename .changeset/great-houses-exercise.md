---
'@lemonmade/shopify': minor
---

Added GID parsing utilities. You can now import `parseGID` and/ or the `ShopifyGID` class from `@lemonmade/shopify`, as well as from the `/storefront` and `/admin` entrypoints for that package. These utilities allow you to parse the [global IDs (GIDs) returned by most of Shopify’s APIs](https://shopify.dev/docs/api/usage/gids). This is most useful for extracting the legacy resource ID, resource type, and additional query parameters that are embedded in the GID.

```ts
import {parseGID, ShopifyGID} from '@lemonmade/shopify';

// You will usually receive these GIDs from Shopify APIs.
const {id, resource, searchParams} = parseGID(
  'gid://shopify/Product/1234567890',
);

// Or, you can construct a GID manually yourself:
const {gid} = ShopifyGID.from({id: '1234567890', resource: 'Product'});
```
