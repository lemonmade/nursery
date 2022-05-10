export type AbortBehavior = 'throws' | 'returns';

export class NestedAbortController extends AbortController {
  constructor(parent?: AbortSignal) {
    super();
    parent?.addEventListener('abort', () => this.abort(), {once: true});
  }
}

// @see https://github.com/nodejs/node/blob/master/lib/internal/errors.js#L822-L834
export class AbortError extends Error {
  readonly code = 'ABORT_ERR';
  readonly name = 'AbortError';

  constructor(message = 'The operation was aborted', options?: {cause?: any}) {
    super(message, options);
  }
}