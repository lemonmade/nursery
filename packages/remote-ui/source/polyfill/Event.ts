import {IS_TRUSTED, LISTENERS} from './constants.ts';
import type {EventTarget} from './EventTarget.ts';

export const enum EventPhase {
  NONE = 0,
  CAPTURING_PHASE = 1,
  AT_TARGET = 2,
  BUBBLING_PHASE = 3,
}

export const CAPTURE_MARKER = '@';

export interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

const now =
  typeof performance === 'undefined'
    ? Date.now
    : performance.now.bind(performance);

export class Event {
  static NONE = EventPhase.NONE;
  static CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  static AT_TARGET = EventPhase.AT_TARGET;
  static BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  // NONE = EventPhase.NONE;
  // CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  // AT_TARGET = EventPhase.AT_TARGET;
  // BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  timeStamp = now();
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  srcElement: EventTarget | null = null;
  bubbles = false;
  cancelable = false;
  composed = false;
  defaultPrevented = false;
  cancelBubble = false;
  immediatePropagationStopped = false;
  eventPhase: EventPhase = 0;
  path: EventTarget[] = [];
  // private inPassiveListener = false;
  data?: any;
  [IS_TRUSTED]!: boolean;

  constructor(public type: string, options?: EventInit) {
    Object.defineProperty(this, IS_TRUSTED, {writable: true, value: false});
    if (options) {
      if (options.bubbles) this.bubbles = options.bubbles;
      if (options.cancelable) this.cancelable = options.cancelable;
      if (options.composed) this.composed = options.composed;
    }
  }

  get composedPath() {
    return this.path;
  }

  get isTrusted() {
    return this[IS_TRUSTED];
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  stopImmediatePropagation() {
    this.immediatePropagationStopped = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  set returnValue(value) {
    this.defaultPrevented = value;
  }

  get returnValue() {
    return this.defaultPrevented;
  }

  /** @deprecated */
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean) {
    this.type = type;
    this.bubbles = Boolean(bubbles);
    this.cancelable = Boolean(cancelable);
  }
}

export function fireEvent(
  event: Event,
  target: EventTarget,
  phase: EventPhase,
) {
  const listeners = target[LISTENERS];
  const list = listeners?.get(
    `${event.type}${
      phase === EventPhase.CAPTURING_PHASE ? CAPTURE_MARKER : ''
    }`,
  );
  if (!list) return false;

  let defaultPrevented = false;

  for (const listener of list) {
    event.eventPhase = phase;
    event.currentTarget = target;

    try {
      if (typeof listener === 'object') {
        listener.handleEvent(event as any);
      } else {
        listener.call(target, event as any);
      }
    } catch (err) {
      setTimeout(thrower, 0, err);
    }

    if (event.defaultPrevented === true) {
      defaultPrevented = true;
    }

    if (event.immediatePropagationStopped) {
      break;
    }
  }

  return defaultPrevented;
}

function thrower(error: any) {
  throw error;
}
