export interface UcpProfile {
  ucp: {
    version: string;
    capabilities: UcpProfileCapability[];
  };
}

export interface UcpProfileCapability {
  name: string;
  version: string;
  spec: string;
  schema: string;
  extends?: string | string[];
}

export interface UcpProfileService {
  version: string;
  spec: string;
  rest?: {
    schema: string;
    endpoint: string;
  };
  mcp?: {
    schema: string;
    endpoint: string;
  };
}

export type UcpOperation =
  | 'read'
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
