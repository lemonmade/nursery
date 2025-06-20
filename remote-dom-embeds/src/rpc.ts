import type {RemoteConnection} from '@remote-dom/core/elements';

export interface HostAPI {
  connect(connections: Record<string, RemoteConnection>): Promise<void>;
}

export interface EmbedAPI {}
