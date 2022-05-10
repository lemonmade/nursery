import type {EventTarget} from './types';

export function addListener(
  target: EventTarget<any>,
  name: string,
  listener: (...args: any[]) => void,
  flags?: {once?: boolean; signal?: AbortSignal},
) {
  if (typeof target.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen to `error` events here.
    target.addEventListener(
      name,
      (...args: any[]) => {
        listener(...args);
      },
      flags,
    );
  }

  // TODO throw error
}
