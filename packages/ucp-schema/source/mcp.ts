import {z} from 'zod';
import type {UcpProfileJsonSchema} from './types.ts';

/**
 * Converts a JSON schema object into a record, where each key is its own
 * independent Zod type, matching all the resolved properties in the source
 * JSON schema. This is needed for the `outputSchema` property of the MCP
 * package, which expects a record of types, somewhat at odds with the
 * MCP UCP specification which defines the result type of most operations as
 * a whole, resolved `Checkout` object.
 *
 * @example
 * ```ts
 * const composer = await UcpSchemaComposer.fromProfile(profile);
 * const checkout = composer.get('https://ucp.dev/schemas/shopping/checkout.json');
 * const outputSchema = jsonSchemaToOutputSchema(checkout.composedSchema());
 *
 * mcpServer.registerTool('get_checkout', {outputSchema}, getCheckout);
 * ```
 */
export function jsonSchemaToOutputSchema(
  baseSchema: UcpProfileJsonSchema,
): Record<string, z.ZodTypeAny> {
  const {properties, required} = flattenJsonSchema(baseSchema);
  const requiredProperties = new Set(required);
  const outputSchema: Record<string, z.ZodTypeAny> = {};

  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    // We need to create a stub type that can fully resolve, so we need to include all the defs
    // in the schema.
    const zodType = z.fromJSONSchema(
      {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        ...propertySchema,
        $defs: baseSchema.$defs,
      },
      {defaultTarget: 'openapi-3.0'},
    );

    outputSchema[propertyName] = requiredProperties.has(propertyName)
      ? zodType
      : zodType.optional();
  }

  return outputSchema;
}

function flattenJsonSchema(
  baseSchema: UcpProfileJsonSchema,
): Required<Pick<UcpProfileJsonSchema, 'properties' | 'required'>> {
  const properties: Record<string, UcpProfileJsonSchema> = {};
  const required = new Set<string>();

  const mergedSchemas: UcpProfileJsonSchema[] = [
    baseSchema,
    ...(baseSchema.allOf ?? []).flatMap<UcpProfileJsonSchema>((schema) => {
      if (schema.properties) {
        return schema;
      }

      if (schema.$ref?.startsWith('#/$defs/')) {
        return baseSchema.$defs?.[schema.$ref.slice('#/$defs/'.length)] ?? [];
      }

      return [];
    }),
  ];

  for (const schema of mergedSchemas) {
    if (schema.properties) {
      Object.assign(properties, schema.properties);
    }

    if (schema.required) {
      for (const requiredPropertyName of schema.required) {
        required.add(requiredPropertyName);
      }
    }
  }

  return {
    properties,
    required: Array.from(required),
  };
}
