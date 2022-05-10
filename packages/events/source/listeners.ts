import type {EventTarget, EventTargetAddEventListener} from './types';

export function addListener(
  target: EventTarget<any>,
  name: string | symbol,
  listener: (...args: any[]) => void,
  flags?: {once?: boolean; signal?: AbortSignal},
) {
  if (typeof target === 'function') {
    target(name, listener, flags);
    return;
  }

  if (
    typeof (target as EventTargetAddEventListener).addEventListener ===
    'function'
  ) {
    (target as EventTargetAddEventListener).addEventListener(
      name as any,
      listener,
      flags,
    );

    return;
  }

  // TODO throw error
}
