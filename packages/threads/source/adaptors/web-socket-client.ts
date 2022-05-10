import {on, once} from '@lemonmade/events';
import type {ThreadEndpoint} from '../types';

export function threadFromClientWebSocket(
  websocket: WebSocket,
): ThreadEndpoint {
  return {
    send(message) {
      websocket.send(JSON.stringify(message));
    },
    async *listen({signal} = {}) {
      if (websocket.readyState !== websocket.OPEN) {
        await once(websocket, 'open');
      }

      const messages = on<WebSocketEventMap, 'message'>(websocket, 'message', {
        signal,
      });

      for await (const message of messages) {
        yield JSON.parse(message.data);
      }
    },
    terminate() {
      websocket.close();
    },
  };
}
