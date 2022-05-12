import {on, once} from '@lemonmade/events';
import type {ThreadTarget} from '../types';

export function targetFromClientWebSocket(websocket: WebSocket): ThreadTarget {
  return {
    send(message) {
      websocket.send(JSON.stringify(message));
    },
    async *listen({signal}) {
      if (websocket.readyState !== websocket.OPEN) {
        await once(websocket, 'open', {signal});
      }

      if (signal.aborted) return;

      const messages = on<WebSocketEventMap, 'message'>(websocket, 'message', {
        signal,
      });

      for await (const message of messages) {
        yield JSON.parse(message.data);
      }
    },
  };
}
