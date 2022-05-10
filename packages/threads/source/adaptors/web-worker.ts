import {on} from '@lemonmade/events';
import type {ThreadEndpoint} from '../types';

export function threadFromWebWorker(worker: Worker): ThreadEndpoint {
  return {
    send(...args: [any, Transferable[]]) {
      worker.postMessage(...args);
    },
    async *listen({signal} = {}) {
      const messages = on<WorkerEventMap, 'message'>(worker, 'message', {
        signal,
      });

      for await (const message of messages) {
        yield message.data;
      }
    },
    terminate() {
      worker.terminate();
    },
  };
}
