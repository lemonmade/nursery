export interface EventTargetAddEventListener<
  EventMap = Record<string, unknown>,
> {
  addEventListener<Event extends keyof EventMap>(
    event: Event,
    listener: (
      ...args: EventMap[Event] extends any[]
        ? EventMap[Event]
        : [EventMap[Event]]
    ) => void,
    options?: {once?: boolean; signal?: AbortSignal},
  ): void;
}

export type EventTarget<EventMap = Record<string, unknown>> =
  EventTargetAddEventListener<EventMap>;
