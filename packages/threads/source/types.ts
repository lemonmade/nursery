import type {RELEASE_METHOD, RETAIN_METHOD, RETAINED_BY} from './constants';

export interface ThreadEndpoint {
  send(message: any, transferables?: Transferable[]): void;
  listen(options?: {signal?: AbortSignal}): AsyncGenerator<any, void, void>;
  terminate?(): void;
}

export type ThreadCallable<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer ReturnType
    ? (...args: Args) => ThreadSafeReturnType<ReturnType>
    : never;
};

export type MaybePromise<T> = T extends Promise<any> ? T : T | Promise<T>;

export type ThreadSafeReturnType<T> = T extends Promise<any>
  ? T
  : T extends infer U | Promise<infer U>
  ? Promise<U>
  : T extends (...args: infer Args) => infer TypeReturned
  ? (...args: Args) => ThreadSafeReturnType<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? ThreadSafeReturnType<ArrayElement>[]
  : T extends readonly (infer ArrayElement)[]
  ? readonly ThreadSafeReturnType<ArrayElement>[]
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? {[K in keyof T]: ThreadSafeReturnType<T[K]>}
  : T;

export type ThreadSafeArgument<T> = T extends (
  ...args: infer Args
) => infer TypeReturned
  ? TypeReturned extends Promise<any>
    ? (...args: Args) => TypeReturned
    : (...args: Args) => TypeReturned | Promise<TypeReturned>
  : T extends (infer ArrayElement)[]
  ? ThreadSafeArgument<ArrayElement>[]
  : T extends readonly (infer ArrayElement)[]
  ? readonly ThreadSafeArgument<ArrayElement>[]
  : // eslint-disable-next-line @typescript-eslint/ban-types
  T extends object
  ? {[K in keyof T]: ThreadSafeArgument<T[K]>}
  : T;

export interface MemoryRetainer {
  add(manageable: MemoryManageable): void;
}

export interface MemoryManageable {
  readonly [RETAINED_BY]: Set<MemoryRetainer>;
  [RETAIN_METHOD](): void;
  [RELEASE_METHOD](): void;
}

export interface ThreadEncodingStrategy {
  encode(value: unknown): [any, Transferable[]?];
  decode(value: unknown, retainedBy?: Iterable<MemoryRetainer>): unknown;
  call(id: string, args: any[]): Promise<any>;
  release(id: string): void;
  terminate?(): void;
}

export interface ThreadEncodingStrategyApi {
  uuid(): string;
  release(id: string): void;
  call(
    id: string,
    args: any[],
    retainedBy?: Iterable<MemoryRetainer>,
  ): Promise<any>;
}