# `@lemonmade/ucp-schema`

Tools for composing Universal Commerce Protocol (UCP) schemas.

## Basic usage

```ts
import {UcpSchemaComposer} from '@lemonmade/ucp-schema';

const composer = await UcpSchemaComposer.fromProfile({
  ucp: {
    capabilities: {
      // ... record of capabilities ...
    },
  },
});

const checkoutFile = composer.get(
  'https://ucp.dev/schemas/shopping/checkout.json',
);
const checkoutGetSchema = checkoutFile.composedSchema();
const checkoutCreateSchema = checkoutFile.composedSchema({operation: 'create'});

// ... use the JSON schemas to validate and transform UCP requests
```
