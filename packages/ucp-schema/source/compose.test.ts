import {describe, it, expect} from 'vitest';

import {UcpSchemaComposer, type UcpProfileSchemaFetcher} from './compose.ts';

describe('UcpSchemaComposer', () => {
  it('creates a schema from an empty profile', async () => {
    const composer = await UcpSchemaComposer.fromProfile({
      ucp: {
        version: '2026-01-11',
        services: {},
        capabilities: {},
      },
    });

    expect(
      composer.get('https://ucp.dev/schemas/shopping/checkout.json'),
    ).toBeUndefined();
  });

  it('rejects schemas if a schema fails to fetch', async () => {
    const composerPromise = UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
          },
        },
      },
      {
        fetch() {
          throw new Error();
        },
      },
    );

    await expect(composerPromise).rejects.toThrow(
      'Schema not found for URL: https://ucp.dev/schemas/shopping/checkout.json',
    );
  });

  it('rejects schemas if a schema has a name that does not match its URL', async () => {
    const composerPromise = UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://mischief.dev/schemas/shopping/checkout.json',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://mischief.dev/schemas/shopping/checkout.json': {
            type: 'object',
          },
        }),
      },
    );

    await expect(composerPromise).rejects.toThrow(
      'Invalid schema name: dev.ucp.shopping.checkout does not match URL https://mischief.dev/schemas/shopping/checkout.json',
    );
  });

  it('creates an object that can look up schemas by URL', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
          },
        }),
      },
    );

    expect(
      composer
        .get('https://ucp.dev/schemas/shopping/checkout.json')
        ?.composedSchema(),
    ).toEqual({
      type: 'object',
    });
  });

  it('creates an object that can look up schemas by name', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
          },
        }),
      },
    );

    expect(composer.get('dev.ucp.shopping.checkout')?.composedSchema()).toEqual(
      {
        type: 'object',
      },
    );
  });

  it('merges schemas from extensions', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
            'dev.ucp.shopping.fulfillment': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/fulfillment',
                schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
                extends: 'dev.ucp.shopping.checkout',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
            },
            required: ['id'],
          },
          'https://ucp.dev/schemas/shopping/fulfillment.json': {
            $defs: {
              'dev.ucp.shopping.checkout': {
                allOf: [
                  {$ref: 'checkout.json'},
                  {
                    properties: {
                      fulfillment: {
                        $ref: '#/$defs/fulfillment',
                      },
                    },
                  },
                ],
              },
              fulfillment: {
                type: 'object',
                properties: {
                  methods: {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/fulfillment_method',
                    },
                  },
                },
                required: ['methods'],
              },
              fulfillment_method: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                },
                required: ['id'],
              },
            },
          },
        }),
      },
    );

    expect(
      composer
        .get('https://ucp.dev/schemas/shopping/checkout.json')
        ?.composedSchema(),
    ).toEqual({
      type: 'object',
      allOf: [
        {type: 'object', $ref: '#/$defs/dev.ucp.shopping.checkout'},
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout',
        },
      ],
      $defs: {
        'dev.ucp.shopping.checkout': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
          title: 'dev.ucp.shopping.checkout (base)',
        },
        'dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout': {
          properties: {
            fulfillment: {
              $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment',
            },
          },
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment': {
          properties: {
            methods: {
              items: {
                $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment_method',
              },
              type: 'array',
            },
          },
          required: ['methods'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment_method': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
        },
      },
    });
  });

  it('merges schemas from extensions that target multiple base capabilities', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
            'dev.ucp.shopping.cart': [
              {
                version: '2026`-01-11',
                spec: 'https://ucp.dev/specification/cart',
                schema: 'https://ucp.dev/schemas/shopping/cart.json',
              },
            ],
            'dev.ucp.shopping.fulfillment': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/fulfillment',
                schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
                extends: ['dev.ucp.shopping.checkout', 'dev.ucp.shopping.cart'],
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
            },
            required: ['id'],
          },
          'https://ucp.dev/schemas/shopping/cart.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
            },
            required: ['id'],
          },
          'https://ucp.dev/schemas/shopping/fulfillment.json': {
            $defs: {
              'dev.ucp.shopping.checkout': {
                allOf: [
                  {$ref: 'checkout.json'},
                  {
                    properties: {
                      fulfillment: {
                        $ref: '#/$defs/fulfillment',
                      },
                    },
                  },
                ],
              },
              'dev.ucp.shopping.cart': {
                allOf: [
                  {$ref: 'cart.json'},
                  {
                    properties: {
                      fulfillment: {
                        $ref: '#/$defs/fulfillment',
                      },
                    },
                  },
                ],
              },
              fulfillment: {
                type: 'object',
                properties: {
                  methods: {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/fulfillment_method',
                    },
                  },
                },
                required: ['methods'],
              },
              fulfillment_method: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                },
                required: ['id'],
              },
            },
          },
        }),
      },
    );

    expect(
      composer
        .get('https://ucp.dev/schemas/shopping/cart.json')
        ?.composedSchema(),
    ).toEqual({
      type: 'object',
      allOf: [
        {type: 'object', $ref: '#/$defs/dev.ucp.shopping.cart'},
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.fulfillment~dev.ucp.shopping.cart',
        },
      ],
      $defs: {
        'dev.ucp.shopping.cart': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
          title: 'dev.ucp.shopping.cart (base)',
        },
        'dev.ucp.shopping.fulfillment~dev.ucp.shopping.cart': {
          properties: {
            fulfillment: {
              $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment',
            },
          },
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment': {
          properties: {
            methods: {
              items: {
                $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment_method',
              },
              type: 'array',
            },
          },
          required: ['methods'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment_method': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
        },
      },
    });
  });

  it('merges schemas from multiple extensions', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
            'dev.ucp.shopping.fulfillment': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/fulfillment',
                schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
                extends: 'dev.ucp.shopping.checkout',
              },
            ],
            'dev.ucp.shopping.discount': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/discount',
                schema: 'https://ucp.dev/schemas/shopping/discount.json',
                extends: 'dev.ucp.shopping.checkout',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
            },
            required: ['id'],
          },
          'https://ucp.dev/schemas/shopping/discount.json': {
            type: 'object',
            $defs: {
              'dev.ucp.shopping.checkout': {
                allOf: [
                  {$ref: 'checkout.json'},
                  {
                    properties: {
                      allocations: {items: {$ref: '#/$defs/allocation'}},
                    },
                    required: ['allocations'],
                  },
                ],
              },
              allocation: {
                type: 'object',
                properties: {
                  path: {type: 'string'},
                  amount: {type: 'integer'},
                },
                required: ['path', 'amount'],
              },
            },
          },
          'https://ucp.dev/schemas/shopping/fulfillment.json': {
            $defs: {
              'dev.ucp.shopping.checkout': {
                allOf: [
                  {$ref: 'checkout.json'},
                  {
                    properties: {
                      fulfillment: {
                        $ref: '#/$defs/fulfillment',
                      },
                    },
                  },
                ],
              },
              fulfillment: {
                type: 'object',
                properties: {
                  methods: {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/fulfillment_method',
                    },
                  },
                },
                required: ['methods'],
              },
              fulfillment_method: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                },
                required: ['id'],
              },
            },
          },
        }),
      },
    );

    expect(
      composer
        .get('https://ucp.dev/schemas/shopping/checkout.json')
        ?.composedSchema(),
    ).toEqual({
      type: 'object',
      allOf: [
        {type: 'object', $ref: '#/$defs/dev.ucp.shopping.checkout'},
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout',
        },
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.discount~dev.ucp.shopping.checkout',
        },
      ],
      $defs: {
        'dev.ucp.shopping.checkout': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
          title: 'dev.ucp.shopping.checkout (base)',
        },
        'dev.ucp.shopping.discount~dev.ucp.shopping.checkout': {
          properties: {
            allocations: {
              items: {$ref: '#/$defs/dev.ucp.shopping.discount~allocation'},
            },
          },
          required: ['allocations'],
          type: 'object',
        },
        'dev.ucp.shopping.discount~allocation': {
          properties: {
            path: {type: 'string'},
            amount: {type: 'integer'},
          },
          required: ['path', 'amount'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout': {
          properties: {
            fulfillment: {
              $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment',
            },
          },
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment': {
          properties: {
            methods: {
              items: {
                $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment_method',
              },
              type: 'array',
            },
          },
          required: ['methods'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment_method': {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
        },
      },
    });
  });

  it('does not merge schemas from extensions that are not in the extends list', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
            'dev.ucp.shopping.fulfillment': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/fulfillment',
                schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
            },
          },
          'https://ucp.dev/schemas/shopping/fulfillment.json': {
            $defs: {
              'dev.ucp.shopping.checkout': {
                properties: {
                  fulfillment: {$ref: '#/$defs/fulfillment'},
                },
              },
            },
          },
        }),
      },
    );

    expect(
      composer
        .get('https://ucp.dev/schemas/shopping/checkout.json')
        ?.composedSchema(),
    ).toEqual({
      type: 'object',
      properties: {
        id: {type: 'string'},
      },
    });
  });

  it('can restrict schemas based on operation name and the ucp_request annotations in the schema', async () => {
    const composer = await UcpSchemaComposer.fromProfile(
      {
        ucp: {
          version: '2026-01-11',
          services: {},
          capabilities: {
            'dev.ucp.shopping.checkout': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/checkout',
                schema: 'https://ucp.dev/schemas/shopping/checkout.json',
              },
            ],
            'dev.ucp.shopping.fulfillment': [
              {
                version: '2026-01-11',
                spec: 'https://ucp.dev/specification/fulfillment',
                schema: 'https://ucp.dev/schemas/shopping/fulfillment.json',
                extends: 'dev.ucp.shopping.checkout',
              },
            ],
          },
        },
      },
      {
        fetch: createMockSchemaFetcher({
          'https://ucp.dev/schemas/shopping/checkout.json': {
            type: 'object',
            properties: {
              id: {type: 'string'},
              line_items: {
                items: {
                  $ref: '#/$defs/line_item',
                },
                ucp_request: {
                  complete: 'omit',
                },
              },
            },
            required: ['id', 'line_items'],
            $defs: {
              line_item: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                },
                required: ['id'],
              },
            },
          },
          'https://ucp.dev/schemas/shopping/fulfillment.json': {
            $defs: {
              'dev.ucp.shopping.checkout': {
                allOf: [
                  {$ref: 'checkout.json'},
                  {
                    properties: {
                      fulfillment: {
                        $ref: '#/$defs/fulfillment',
                      },
                    },
                  },
                ],
              },
              fulfillment: {
                type: 'object',
                properties: {
                  methods: {
                    type: 'array',
                    items: {
                      $ref: '#/$defs/fulfillment_method',
                    },
                    ucp_request: 'omit',
                  },
                },
                required: ['methods'],
              },
              fulfillment_method: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    ucp_request: {
                      create: 'omit',
                      update: 'required',
                    },
                  },
                  type: {
                    type: 'string',
                    ucp_request: {
                      create: 'required',
                      update: 'optional',
                    },
                  },
                  line_item_ids: {
                    items: {type: 'string'},
                    ucp_request: {
                      create: 'optional',
                      update: 'optional',
                      complete: 'omit',
                    },
                  },
                },
                required: ['id', 'type', 'line_item_ids'],
              },
            },
          },
        }),
      },
    );

    const checkoutFile = composer.get(
      'https://ucp.dev/schemas/shopping/checkout.json',
    )!;

    expect(checkoutFile.composedSchema()).toEqual({
      type: 'object',
      allOf: [
        {type: 'object', $ref: '#/$defs/dev.ucp.shopping.checkout'},
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout',
        },
      ],
      $defs: {
        line_item: {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
        },
        'dev.ucp.shopping.checkout': {
          properties: {
            id: {type: 'string'},
            line_items: {
              items: {
                $ref: '#/$defs/line_item',
              },
            },
          },
          title: 'dev.ucp.shopping.checkout (base)',
          required: ['id', 'line_items'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout': {
          properties: {
            fulfillment: {
              $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment',
            },
          },
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment': {
          properties: {
            methods: {
              items: {
                $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment_method',
              },
              type: 'array',
            },
          },
          required: ['methods'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment_method': {
          properties: {
            id: {type: 'string'},
            type: {type: 'string'},
            line_item_ids: {
              items: {type: 'string'},
            },
          },
          required: ['id', 'type', 'line_item_ids'],
          type: 'object',
        },
      },
    });

    expect(checkoutFile.composedSchema({operation: 'create'})).toEqual({
      type: 'object',
      allOf: [
        {type: 'object', $ref: '#/$defs/dev.ucp.shopping.checkout'},
        {
          type: 'object',
          $ref: '#/$defs/dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout',
        },
      ],
      $defs: {
        line_item: {
          properties: {
            id: {type: 'string'},
          },
          required: ['id'],
          type: 'object',
        },
        'dev.ucp.shopping.checkout': {
          properties: {
            id: {type: 'string'},
            line_items: {
              items: {
                $ref: '#/$defs/line_item',
              },
            },
          },
          title: 'dev.ucp.shopping.checkout (base)',
          required: ['id', 'line_items'],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~dev.ucp.shopping.checkout': {
          properties: {
            fulfillment: {
              $ref: '#/$defs/dev.ucp.shopping.fulfillment~fulfillment',
            },
          },
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment': {
          properties: {},
          required: [],
          type: 'object',
        },
        'dev.ucp.shopping.fulfillment~fulfillment_method': {
          properties: {
            type: {type: 'string'},
            line_item_ids: {
              items: {type: 'string'},
            },
          },
          required: ['type'],
          type: 'object',
        },
      },
    });
  });
});

function createMockSchemaFetcher(
  mapping: Record<string, Awaited<ReturnType<UcpProfileSchemaFetcher>>> = {},
) {
  const urlMap = new Map(Object.entries(mapping));

  return (async (url) => {
    return (
      urlMap.get(url) ??
      Promise.reject(new Error(`Schema not found for URL: ${url}`))
    );
  }) satisfies UcpProfileSchemaFetcher;
}
