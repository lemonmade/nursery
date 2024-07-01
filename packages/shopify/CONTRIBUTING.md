# Contributing

TODO

## Building GraphQL schemas

Run the following command from the root of the repo:

```sh
SHOP=XXX API_VERSION=XXXX-YY ACCESS_TOKEN=XXX pnpm --filter shopify run generate-schema
```

You’ll also need to add an export to the `packages/shopify/package.json` that exposes the file to package importers.
