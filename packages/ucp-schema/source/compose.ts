import type { UcpProfile, UcpOperation, UcpProfileCapability, UcpProfileJsonSchema } from './types.ts';

interface UcpProfileCapabilitiesWithResolvedSchemas {
  readonly capability: UcpProfileCapability;
  readonly schema: UcpProfileJsonSchema;
}

interface UcpProfileWithResolvedSchemas {
  readonly capabilities: readonly UcpProfileCapabilitiesWithResolvedSchemas[]
}

export interface UcpProfileSchemaFetcher {
  (url: string): Promise<UcpProfileJsonSchema>;
}

/**
 * Composes operation-aware JSON schemas for UCP objects, based on the capabilities
 * referenced in a UCP profile.
 *
 * @example
 * ```ts
 * const composer = await UcpSchemaComposer.fromProfile({
 *   ucp: {
 *     capabilities: [
 *       {
 *         name: 'dev.ucp.shopping.checkout',
 *         version: '2026-01-11',
 *         spec: 'https://ucp.dev/specification/checkout',
 *         schema: 'https://ucp.dev/schemas/shopping/checkout.json',
 *       },
 *       // ... more capabilities ...
 *     ],
 *   },
 * });
 * 
 * const checkoutFile = composer.get('https://ucp.dev/schemas/shopping/checkout.json');
 * const checkoutReadSchema = checkoutFile.composedSchema();
 * const checkoutCreateSchema = checkoutFile.composedSchema({ operation: 'create' });
 * ```
 */
export class UcpSchemaComposer {
  /**
   * Create a composed schema from a UCP profile. This function will look
   * at the capabilities and payment handlers in the profile, fetch the
   * JSON schemas (and any JSON schemas referenced within), and return an
   * object that allows you to get a composed schema for a specific file
   * and UCP operation.
   */
  static async fromProfile(
    { ucp: { capabilities } }: UcpProfile,
    { fetch: fetchSchema = createDefaultSchemaFetcher() }: {
      /**
       * A custom function to fetch schemas based on a URL. By default, `fromProfile()`
       * will use `fetch()` (with default fetch options) for each schema. Use this to
       * customize the logic, or to provide a cache of schema responses.
       *
       * @example
       * ```ts
       * const composer = await UcpSchemaComposer.fromProfile({
       *   ucp: {
       *     capabilities: [
       *       // ... more capabilities ...
       *     ],
       *   },
       * }, {
       *   fetch: async (url) => prefetchedSchemaMap.get(url) ?? (await fetch(url).then((response) => response.json()))
       * });
       */
      fetch?: UcpProfileSchemaFetcher
    } = {},
  ): Promise<UcpSchemaComposer> {
    const resolvedCapabilities = await Promise.all(
      capabilities.map(async (capability) => {
        let json: UcpProfileJsonSchema;

        const schemaUrl = new URL(capability.schema);
        const reverseDnsForUrl = schemaUrl.hostname.split('.').reverse().join('.');

        if (!capability.name.startsWith(reverseDnsForUrl)) {
          throw new Error(`Invalid schema name: ${capability.name} does not match URL ${capability.schema}`);
        }

        try {
          // TODO: also need to fetch more JSON schemas that may be referenced by the fields in this one
          json = await fetchSchema(capability.schema);
        } catch (error) {
          throw new Error(`Schema not found for URL: ${capability.schema}`);
        }

        return {
          capability,
          schema: json,
        } satisfies UcpProfileCapabilitiesWithResolvedSchemas;
      }),
    );

    return new UcpSchemaComposer({
      capabilities: resolvedCapabilities,
    });
  }

  readonly #profile: UcpProfileWithResolvedSchemas;
  readonly #profileNameToUrlMap = new Map<string, string>();
  readonly #profileUrlToCapabilityMap = new Map<string, UcpProfileCapability>();
  readonly #schemaMapByOperation = new Map<UcpOperation, ReturnType<typeof createSchemaMap>>();

  constructor(profile: UcpProfileWithResolvedSchemas) {
    this.#profile = profile;

    for (const { capability } of profile.capabilities) {
      this.#profileNameToUrlMap.set(capability.name, capability.schema);
      this.#profileUrlToCapabilityMap.set(capability.schema, capability);
    }
  }

  /**
   * Get a schema file composer for the specified schema URL.
   * 
   * @param schema - The schema URL or capability name
   * @returns A UcpSchemaComposerFile instance, or undefined if not found
   */
  get(schema: string) {
    const url = this.#profileNameToUrlMap.get(schema) ?? schema;
    const capability = this.#profileUrlToCapabilityMap.get(url);

    // TODO: we should allow any schema URL, not just the ones that were directly referenced
    // in the profile. Right now, we do not traverse the graph of other JSON schemas that may be referenced
    // by the fields in the profile capabilities.
    if (capability == null) return undefined;

    return new UcpSchemaComposerFile(url, { capability, composer: this });
  }

  /**
   * Get all schema entries for a specific operation.
   * 
   * @param options - Options for getting entries
   * @param options.operation - The operation context
   * @returns An iterator of schema URL and composed schema pairs
   */
  entries({ operation = 'read' }: { operation?: UcpOperation } = {}) {
    return this.#schemaMapForOperation(operation).entries();
  }

  /**
   * Internal method to get the composed schema directly.
   * Used by UcpSchemaComposerFile.
   */
  composedSchema(schema: string, { operation = 'read' }: { operation?: UcpOperation } = {}): UcpProfileJsonSchema | undefined {
    return this.#schemaMapForOperation(operation).get(schema);
  }

  #schemaMapForOperation(operation: UcpOperation) {
    let schemaMap = this.#schemaMapByOperation.get(operation);

    if (schemaMap == null) {
      schemaMap = createSchemaMap(this.#profile, { operation })
    }

    return schemaMap;
  }
}

/**
 * Represents a schema file that can be composed with different operation contexts.
 */
export class UcpSchemaComposerFile {
  readonly #url: string;
  readonly #composer: UcpSchemaComposer;
  readonly capability?: UcpProfileCapability;

  constructor(url: string, { composer, capability }: { composer: UcpSchemaComposer, capability?: UcpProfileCapability }) {
    this.#url = url;
    this.#composer = composer;
    this.capability = capability;
  }

  /**
   * Get the composed schema for a specific operation.
   */
  composedSchema(options?: { operation?: UcpOperation }) {
    const schema = this.#composer.composedSchema(this.#url, options);

    if (schema == null) {
      throw new ReferenceError(`Schema not found for URL: ${this.#url}`);
    }

    return schema;
  }
}

// Helpers

/**
 * Compose schemas by resolving extensions
 */
function createSchemaMap(
  { capabilities }: UcpProfileWithResolvedSchemas,
  { operation }: { operation: UcpOperation },
) {
  const schemaMap = new Map<string, UcpProfileJsonSchema>();
  const schemaNameToUrlMap = new Map<string, string>();

  for (const {capability, schema} of capabilities) {
    schemaNameToUrlMap.set(capability.name, capability.schema);

    const clonedSchema = structuredClone(schema);
    processSchemaUcpMetadata(clonedSchema, operation);
    schemaMap.set(capability.schema, clonedSchema);

    if (capability.extends == null) continue;

    const defs = clonedSchema.$defs;
    const extendedSchemas = Array.isArray(capability.extends) ? capability.extends : [capability.extends];

    for (const extendedSchemaName of extendedSchemas) {
      const extensionDef = defs?.[extendedSchemaName];
      if (extensionDef?.allOf == null) continue;
      
      const extendedSchemaUrl = schemaNameToUrlMap.get(extendedSchemaName);
      const extendedSchema = extendedSchemaUrl ? schemaMap.get(extendedSchemaUrl) : undefined;
      if (extendedSchema == null) continue;

      // Make the base type ready for extension
      if (extendedSchema.allOf?.[0]?.$ref !== `#/$defs/${extendedSchemaName}`) {
        const newDef = {
          type: 'object',
          title: `${extendedSchema.title ?? extendedSchemaName} (base)`,
          ...(extendedSchema.properties ? { properties: extendedSchema.properties } : {}),
          ...(extendedSchema.required ? { required: extendedSchema.required } : {}),
          ...(extendedSchema.items ? { items: extendedSchema.items } : {}),
          ...(extendedSchema.allOf ? { allOf: extendedSchema.allOf } : {}),
          ...(extendedSchema.oneOf ? { oneOf: extendedSchema.oneOf } : {}),
        } satisfies UcpProfileJsonSchema;

        extendedSchema.$defs ??= {};
        extendedSchema.$defs[extendedSchemaName] = newDef;
        extendedSchema.allOf = [{ type: 'object', $ref: `#/$defs/${extendedSchemaName}` }];
        delete extendedSchema.properties;
        delete extendedSchema.required;
        delete extendedSchema.items;
        delete extendedSchema.oneOf;
      }

      const clonedDefs = structuredClone(defs!);

      // Rewrite the extension def to remove a reference to the base type, we will manually
      // create an `allOf` type for it that includes all schema additions.
      const filtereExtensionDefAllOf = extensionDef.allOf.filter(({$ref}) => $ref == null || new URL($ref, capability.schema).href !== extendedSchemaUrl);

      if (filtereExtensionDefAllOf.length > 1) {
        clonedDefs[extendedSchemaName] = {
          type: 'object',
          allOf: filtereExtensionDefAllOf,
        } satisfies UcpProfileJsonSchema;
      } else {
        const {allOf, ...rest} = extensionDef;
        clonedDefs[extendedSchemaName] = {
          type: 'object',
          ...rest,
          ...filtereExtensionDefAllOf[0],
        } satisfies UcpProfileJsonSchema;
      }

      // TODO: turn this into a smarter def pruning algorithm
      for (const otherExtendedSchemaName of extendedSchemas) {
        if (otherExtendedSchemaName === extendedSchemaName) continue;
        delete clonedDefs[otherExtendedSchemaName];
      }

      Object.assign(extendedSchema.$defs!, namespaceExtensionDefs(clonedDefs, capability));
      extendedSchema.allOf!.push({ type: 'object', $ref: `#/$defs/${namespaceIdentifier(extendedSchemaName, capability)}` });
    }
  }

  return {
    get(schema: string) {
      if (schemaNameToUrlMap.has(schema)) {
        return schemaMap.get(schemaNameToUrlMap.get(schema)!);
      }

      return schemaMap.get(schema);
    },
    entries() {
      return schemaMap.entries();
    },
  };
}

function processSchemaUcpMetadata(
  schema: UcpProfileJsonSchema,
  operation: UcpOperation,
): UcpProfileJsonSchema {
  let requiredNeedsUpdate = false;
  const updatedRequired = new Set(schema.required);

  if (schema.properties != null) {
    for (const [key, value] of Object.entries(schema.properties)) {
      processSchemaUcpMetadata(value, operation);

      if (value.ucp_request == null) continue;

      const ucpRequest =
        typeof value.ucp_request === 'string'
          ? value.ucp_request
          : value.ucp_request[operation];
      delete value.ucp_request;

      if (operation === 'read') continue;

      switch (ucpRequest) {
        case 'omit':
          delete schema.properties[key];

          if (updatedRequired.has(key)) {
            requiredNeedsUpdate = true;
            updatedRequired.delete(key);
          }

          break;
        case 'required':
          if (!updatedRequired.has(key)) {
            requiredNeedsUpdate = true;
            updatedRequired.add(key);
          }

          break;
        case 'optional':
          if (updatedRequired.has(key)) {
            requiredNeedsUpdate = true;
            updatedRequired.delete(key);
          }

          break;
      }
    }
  }

  if (requiredNeedsUpdate) {
    schema.required = Array.from(updatedRequired);
  }

  if (schema.items != null) {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        processSchemaUcpMetadata(item, operation);
      }
    } else {
      processSchemaUcpMetadata(schema.items, operation);
    }
  }

  if (schema.allOf != null) {
    for (const allOfSchema of schema.allOf) {
      processSchemaUcpMetadata(allOfSchema, operation);
    }
  }

  if (schema.oneOf != null) {
    for (const oneOfSchema of schema.oneOf) {
      processSchemaUcpMetadata(oneOfSchema, operation);
    }
  }

  if (schema.$defs != null) {
    for (const value of Object.values(schema.$defs)) {
      processSchemaUcpMetadata(value, operation);
    }
  }

  return schema;
}

function namespaceIdentifier(identifier: string, capability: Pick<UcpProfileCapability, 'name'>) {
  return `${capability.name}~${identifier}`;
}

function namespaceExtensionDefs(
  defs: Record<string, UcpProfileJsonSchema>,
  capability: Pick<UcpProfileCapability, 'name'>,
) {
  const newDefs: Record<string, UcpProfileJsonSchema> = {};

  for (const [key, value] of Object.entries(defs)) {
    newDefs[namespaceIdentifier(key, capability)] = updateRefsWithNamespace(value, capability);
  }

  return newDefs;
}

function updateRefsWithNamespace(
  obj: any,
  capability: Pick<UcpProfileCapability, 'name'>,
): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => updateRefsWithNamespace(item, capability));
  }

  const cloned = obj;
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref' && typeof value === 'string') {
      // Update internal references like #/$defs/fulfillment_method
      const match = value.match(/^#\/\$defs\/(.+)$/);
      if (match?.[1]) {
        cloned[key] = `#/$defs/${namespaceIdentifier(match[1], capability)}`;
      } else {
        cloned[key] = value;
      }
    } else {
      cloned[key] = updateRefsWithNamespace(value, capability);
    }
  }
  return cloned;
}

function createDefaultSchemaFetcher() {
  const cache = new Map<string, Promise<UcpProfileJsonSchema>>();
  return ((url) => {
    const cached = cache.get(url);
    if (cached) {
      return cached;
    }
    const promise = fetch(url).then((response) => response.json());
    cache.set(url, promise);
    return promise;
  }) satisfies UcpProfileSchemaFetcher;
}
