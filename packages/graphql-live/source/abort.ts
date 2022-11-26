// An AbortSignal connected to a “parent”, with support for lots of listeners
// (the node version warns on even small GraphQL servers :/)

const INTERNAL_ABORT_METHOD = Symbol('internalAbortMethod');

class NestedAbortControllerImplementation {
  readonly signal = new CustomAbortSignal();
  private cleanup = new AbortController();

  constructor(parent?: AbortSignal) {
    parent?.addEventListener('abort', () => this.abort(), {
      signal: this.cleanup.signal,
    });
  }

  abort(reason?: any) {
    this.cleanup.abort();
    this.signal[INTERNAL_ABORT_METHOD](reason);
  }
}

export const NestedAbortController =
  NestedAbortControllerImplementation as any as typeof AbortController & {
    new (signal?: AbortSignal): AbortController;
  };

class CustomAbortSignal {
  aborted = false;
  private listeners = new Set<() => void>();
  private listenerMap = new WeakMap<() => void | (() => void)>();

  [INTERNAL_ABORT_METHOD](_reason?: any) {
    if (this.aborted) return;

    this.aborted = true;

    for (const listener of this.listeners) {
      listener();
    }
  }

  addEventListener(
    event: string,
    listener: () => void,
    options?: {signal?: AbortSignal; once?: boolean},
  ) {
    if (event !== 'abort') return;
    const resolvedListener = options?.once
      ? (...args: any[]) => {
          (listener as any)?.(...args);
        }
      : listener;

    if (listener && resolvedListener && listener !== resolvedListener) {
      this.listenerMap.set(listener, resolvedListener);
    }

    this.listeners.add(resolvedListener);

    options?.signal?.addEventListener('abort', () => {
      this.removeEventListener(event, listener);
    });
  }

  removeEventListener(event: string, listener: () => void) {
    if (event !== 'abort') return;
    const resolvedListener = this.listenerMap.get(listener) ?? listener;
    this.listeners.delete(resolvedListener);
  }
}
