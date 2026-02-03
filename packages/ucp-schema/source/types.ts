export interface UcpProfile {
  readonly ucp: {
    readonly version: string;
    readonly services: Record<string, readonly UcpProfileServiceTransport[]>;
    readonly capabilities: Record<string, readonly UcpProfileCapability[]>;
  };
}

export interface UcpProfileCapability {
  readonly name: string;
  readonly version: string;
  readonly spec: string;
  readonly schema: string;
  readonly extends?: string | string[];
}

export type UcpProfileServiceTransportType =
  | 'rest'
  | 'mcp'
  | 'a2a'
  | 'embedded'
  | (string & {});

export interface UcpProfileServiceTransport {
  readonly version: string;
  readonly transport: UcpProfileServiceTransportType;
  readonly spec: string;
  readonly schema?: string;
  readonly endpoint?: string;
  readonly config?: Record<string, unknown>;
}

export type UcpOperation =
  | 'get'
  | 'create'
  | 'update'
  | 'complete'
  | (string & {});

export interface UcpProfileJsonSchema {
  $id?: string;

  ucp_request?:
    | 'required'
    | 'optional'
    | 'omit'
    | {
        [K in UcpOperation]?: 'required' | 'optional' | 'omit';
      };

  $schema?:
    | 'https://json-schema.org/draft/2020-12/schema'
    | 'http://json-schema.org/draft-07/schema#'
    | 'http://json-schema.org/draft-04/schema#';
  $ref?: string;
  $defs?: Record<string, UcpProfileJsonSchema>;
  type?:
    | 'object'
    | 'array'
    | 'string'
    | 'number'
    | 'boolean'
    | 'null'
    | 'integer';
  title?: string;
  description?: string;
  oneOf?: UcpProfileJsonSchema[];
  allOf?: UcpProfileJsonSchema[];
  properties?: Record<string, UcpProfileJsonSchema>;
  items?: UcpProfileJsonSchema | UcpProfileJsonSchema[];
  required?: string[];
  [k: string]: unknown;
}
