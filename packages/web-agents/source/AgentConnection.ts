import type {
  ListToolsResultSchema,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

export type ListToolsResult = (typeof ListToolsResultSchema)['_type'];
export type CallToolResult = (typeof CallToolResultSchema)['_type'];
export type ToolDefinition = ListToolsResult['tools'][number];

const AGENT_GLOBAL = 'agent';

export const EVENT_NAME_TOOL_SET_UPDATE = 'update';
export const EVENT_NAME_TOOL_CALL = 'call';
export const EVENT_NAME_TOOL_CALL_RESULT = 'result';
export const EVENT_NAME_AGENT_CONNECTION_START = 'agent-connection-start';

export const SCRIPT_TYPE_AGENT_MANIFEST = 'application/agent-manifest';

interface AgentToolOptions<Input = unknown> {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: ToolDefinition['inputSchema'];
  readonly outputSchema?: ToolDefinition['outputSchema'];
  readonly annotations?: ToolDefinition['annotations'];
  call(args: Input): Promise<CallToolResult | string | void | null | undefined>;
}

export interface AgentManifestTool extends Omit<AgentToolOptions, 'call'> {
  readonly call?: string;
}

export interface AgentManifest {
  readonly tools: AgentManifestTool[];
}

export class AgentTool<Input = unknown> {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema?: ToolDefinition['inputSchema'];
  readonly outputSchema?: ToolDefinition['outputSchema'];
  readonly annotations?: ToolDefinition['annotations'];
  readonly call: AgentToolOptions<Input>['call'];

  constructor({
    name,
    description,
    inputSchema,
    outputSchema,
    annotations,
    call,
  }: AgentToolOptions<Input>) {
    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
    this.outputSchema = outputSchema;
    this.annotations = annotations;
    this.call = call;
  }
}

export class AgentToolSetUpdateEvent extends Event {
  constructor() {
    super('update-tools');
  }
}

export class AgentToolCallEvent extends Event {
  readonly tool: AgentTool;
  readonly arguments: unknown;

  constructor(tool: AgentTool, {arguments: args}: {arguments: unknown}) {
    super(EVENT_NAME_TOOL_CALL);
    this.tool = tool;
    this.arguments = args;
  }
}

export class AgentToolCallResultEvent extends Event {
  readonly tool: AgentTool;
  readonly arguments: unknown;
  readonly result: CallToolResult;

  constructor(
    tool: AgentTool,
    {arguments: args, result}: {arguments: unknown; result: CallToolResult},
  ) {
    super(EVENT_NAME_TOOL_CALL_RESULT);
    this.tool = tool;
    this.arguments = args;
    this.result = result;
  }
}

export type AgentEventListener<EventType> =
  | {
      (event: EventType): void;
    }
  | {
      handleEvent(event: EventType): void;
    };

class AgentToolSet extends EventTarget {
  readonly #tools: Map<string, AgentTool>;

  constructor() {
    super();

    // TODO: make this an option
    const manifestElement = document.querySelector<HTMLScriptElement>(
      `script[type=${JSON.stringify(SCRIPT_TYPE_AGENT_MANIFEST)}]`,
    );

    const manifest = manifestElement
      ? parseAgentManifest(manifestElement)
      : null;

    const tools = new Map<string, AgentTool>();

    if (manifest) {
      for (const tool of manifest.tools) {
        tools.set(tool.name, {
          ...tool,
          call: makeExecutable(tool.call ?? tool.name),
        });
      }
    }

    this.#tools = tools;
  }

  addEventListener(
    event: typeof EVENT_NAME_TOOL_SET_UPDATE,
    listener: AgentEventListener<AgentToolSetUpdateEvent>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    event: typeof EVENT_NAME_TOOL_CALL,
    listener: AgentEventListener<AgentToolCallEvent>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    event: typeof EVENT_NAME_TOOL_CALL_RESULT,
    listener: AgentEventListener<AgentToolCallResultEvent>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    event: string,
    listener: AgentEventListener<Event>,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(event, listener, options);
  }

  get(name: string) {
    return this.#tools.get(name);
  }

  set(
    name: string,
    tool: Omit<AgentToolOptions, 'name'> &
      Partial<Pick<AgentToolOptions, 'name'>>,
  ) {
    this.#tools.set(name, new AgentTool({name, ...tool}));
    this.dispatchEvent(new AgentToolSetUpdateEvent());
  }

  delete(name: string) {
    return this.#tools.delete(name);
  }

  // TODO: handle missing tools
  async call(name: string, arg: unknown): Promise<CallToolResult> {
    const tool = this.#tools.get(name);

    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    this.dispatchEvent(new AgentToolCallEvent(tool, {arguments: arg}));

    const result = await tool.call(arg);

    const normalizedResult: CallToolResult =
      result == null
        ? {content: [{type: 'text', text: ''}]}
        : typeof result === 'string'
          ? {content: [{type: 'text', text: result}]}
          : result;

    // emit event on next tick
    this.dispatchEvent(
      new AgentToolCallResultEvent(tool, {
        arguments: arg,
        result: normalizedResult,
      }),
    );

    return normalizedResult;
  }

  values() {
    return this.#tools.values();
  }

  entries() {
    return this.#tools.entries();
  }

  [Symbol.iterator]() {
    return this.#tools.values();
  }
}

export class AgentConnectionStartEvent extends Event {
  readonly connection: AgentConnection;

  constructor(connection: AgentConnection) {
    super('agent-connection-start');
    this.connection = connection;
  }
}

export class AgentConnection {
  static defineGlobal(agent?: AgentConnection) {
    const existingAgent = (
      globalThis as any as {[AGENT_GLOBAL]: AgentConnection}
    )[AGENT_GLOBAL];

    if (existingAgent) return existingAgent;

    const finalAgent = agent ?? new AgentConnection();

    Object.defineProperty(globalThis, AGENT_GLOBAL, {
      value: finalAgent,
      writable: true,
      configurable: true,
    });

    globalThis.dispatchEvent(new AgentConnectionStartEvent(finalAgent));

    return finalAgent;
  }

  readonly tools = new AgentToolSet();
}

function parseAgentManifest(manifestElement: HTMLScriptElement) {
  try {
    const manifest = JSON.parse(manifestElement.textContent!) as AgentManifest;

    if (Array.isArray(manifest?.tools)) {
      return manifest as AgentManifest;
    }
  } catch {}
}

// Split string on every property access, and call the resulting keypath
// from globalThis (e.g., `App["foo-bar"].submit` should become
// a function that calls that property)
function makeExecutable(execute: string) {
  const keypath = execute
    // Convert ["prop"] to .prop
    .replace(/\[["']([^"']+)["']\]/g, '.$1')
    .split('.')
    // Remove empty segments from leading/trailing dots
    .filter(Boolean);

  const method = keypath.pop()!;

  return async (...args: any[]) => {
    const obj = keypath.reduce(
      (current, key) => (current as any)[key],
      globalThis,
    );

    if (
      typeof obj !== 'object' ||
      obj === null ||
      typeof (obj as any)[method] !== 'function'
    ) {
      throw new Error(
        `Browser MCP configuration error: no method found (looked for ${execute})`,
      );
    }

    const result = await (obj as any)[method](...args);

    return result;
  };
}
