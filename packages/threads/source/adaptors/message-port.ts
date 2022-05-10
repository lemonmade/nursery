import {on} from '@lemonmade/events';
import type {ThreadEndpoint} from '../types';

export function threadFromMessagePort(port: MessagePort): ThreadEndpoint {
  return {
    send(...args: [any, Transferable[]]) {
      port.postMessage(...args);
    },
    async *listen({signal} = {}) {
      const messages = on<MessagePortEventMap, 'message'>(port, 'message', {
        signal,
      });

      for await (const message of messages) {
        yield message.data;
      }
    },
    terminate() {
      port.close();
    },
  };
}
