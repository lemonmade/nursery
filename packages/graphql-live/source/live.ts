import type {
  DocumentNode,
  SelectionNode,
  FieldNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  ValueNode,
} from 'graphql';

import type {GraphQLOperationType} from '@quilted/graphql';
import {createEmitter} from '@quilted/events';

import {NestedAbortController} from './abort';
import type {
  GraphQLError,
  GraphQLResult,
  GraphQLLiveResolverObject,
  GraphQLLiveResolverCreateHelper,
  GraphQLLiveResolverFunction,
  ContextTypeForGraphQLLiveResolverObject,
} from './types';

export function createObjectResolver<
  Types,
  Context = Record<string, never>,
  Type extends keyof Types = keyof Types,
>(
  type: Type,
  resolver: Omit<GraphQLLiveResolverObject<Types[Type], Context>, '__typename'>,
): GraphQLLiveResolverObject<Types[Type], Context> {
  return {__typename: type, ...resolver} as any;
}

export function createQueryResolver<
  Types extends {Query: {__typename: 'Query'}},
  Context = Record<string, never>,
>(
  createResolvers: (
    helpers: GraphQLLiveResolverCreateHelper<Types, Context>,
  ) => Omit<
    GraphQLLiveResolverObject<Types['Query'], Context>,
    '__typename' | '__context'
  >,
): GraphQLLiveResolverObject<Types['Query'], Context> {
  const resolvers = createResolvers({
    object: createObjectResolver as any,
  });

  return {__typename: 'Query', ...resolvers} as any;
}

export interface GraphQLRunner<Data, _Variables> {
  readonly current: GraphQLResult<Data> | undefined;
  untilAvailable(): Promise<GraphQLResult<Data>>;
  untilDone(): Promise<GraphQLResult<Data>>;
  [Symbol.asyncIterator](): AsyncGenerator<GraphQLResult<Data>>;
}

export function run<
  Data = Record<string, unknown>,
  Variables = Record<string, never>,
  Resolver extends GraphQLLiveResolverObject<
    {__typename: 'Query'},
    Record<string, any>
  > = GraphQLLiveResolverObject<{__typename: 'Query'}, Record<string, never>>,
>(
  document: DocumentNode & GraphQLOperationType<Data, Variables>,
  resolvers: Resolver,
  options?: {
    signal?: AbortSignal;
    variables?: Variables;
    context?: ContextTypeForGraphQLLiveResolverObject<Resolver>;
  },
): GraphQLRunner<Data, Variables> {
  const rootSignal = options?.signal;
  const variables = (options?.variables ?? {}) as Variables;
  const context = (options as any)?.context ?? {};

  let query: OperationDefinitionNode | undefined = undefined;

  const fragmentDefinitions = new Map<string, FragmentDefinitionNode>();

  for (const definition of document.definitions) {
    switch (definition.kind) {
      case 'OperationDefinition': {
        if (query != null || definition.operation !== 'query') continue;
        query = definition;
        break;
      }
      case 'FragmentDefinition': {
        fragmentDefinitions.set(definition.name.value, definition);
        break;
      }
    }
  }

  if (query == null) {
    throw new Error('No query found');
  }

  const emitter = createEmitter<{
    update: {path: (string | number)[]; value: any; change?: boolean};
  }>();
  const liveFields = new Set<string>();
  const data: Data | {} = {};
  const errors = new Set<GraphQLError>();

  let hasResolved = false;

  const createResult = (): GraphQLResult<Data> => {
    if (errors.size > 0) {
      return {data: data as any, errors: [...errors]};
    } else {
      return {data: data as any};
    }
  };

  let initialResult = handleSelection(
    query!.selectionSet.selections,
    resolvers,
    data,
    rootSignal ?? new AbortController().signal,
    [],
  );

  if (isPromise(initialResult)) {
    initialResult = initialResult.then(() => {
      hasResolved = true;
    });
  } else {
    hasResolved = true;
  }

  const runner: GraphQLRunner<Data, Variables> = {
    get current() {
      if (!hasResolved) return undefined;
      return createResult();
    },
    async untilAvailable() {
      await initialResult;
      return createResult();
    },
    async untilDone() {
      // eslint-disable-next-line no-empty
      for await (const _ of runner) {
      }
      return createResult();
    },
    async *[Symbol.asyncIterator]() {
      if (rootSignal?.aborted) return;

      if (!hasResolved) await initialResult;

      if (rootSignal?.aborted) return;

      yield createResult();

      if (liveFields.size === 0 || rootSignal?.aborted) return;

      for await (const {change = true} of emitter.on('update', {
        signal: rootSignal,
      })) {
        if (change) {
          yield createResult();
        }

        if (liveFields.size === 0) break;
      }
    },
  };

  return runner;

  function handleValueForField(
    value: any,
    name: string,
    result: any,
    field: FieldNode,
    signal: AbortSignal,
    path: (string | number)[],
  ) {
    if (value == null) {
      result[name] = null;
      return;
    }

    if (value instanceof Error) {
      const error: GraphQLError = {
        message: value.message,
        path: (value as any).path ?? path,
        locations:
          (value as any).locations ??
          (field.loc?.startToken
            ? [
                {
                  line: field.loc.startToken.line,
                  column: field.loc.startToken.column,
                },
              ]
            : undefined),
      };

      errors.add(error);

      return error;
    }

    if (field.selectionSet != null) {
      if (typeof value !== 'object') {
        throw new Error(
          `Found non-object value for field ${name} with selection ${field.selectionSet.selections}`,
        );
      }

      const {selections} = field.selectionSet;

      if (Array.isArray(value)) {
        const nestedResults = value.map(() => ({}));
        result[name] = nestedResults;

        return maybePromiseAll(
          value.map((arrayValue, index) =>
            handleSelection(
              selections,
              arrayValue,
              nestedResults[index]!,
              signal,
              [...path, index],
            ),
          ),
        );
      }

      const nestedResult: Record<string, any> = {};
      result[name] = nestedResult;

      return handleSelection(
        field.selectionSet.selections,
        value,
        nestedResult,
        signal,
        path,
      );
    }

    result[name] = value;
  }

  function handleSelection(
    selections: readonly SelectionNode[],
    resolvers: GraphQLLiveResolverObject<any, any>,
    result: Record<string, any>,
    signal: AbortSignal,
    path: (string | number)[],
  ): Promise<void> | void {
    const selectionResults = selections.map((selection) => {
      switch (selection.kind) {
        case 'Field': {
          const name = selection.name.value;
          const alias = selection.alias?.value;
          const fieldName = alias ?? name;
          const valueOrResolver = (resolvers as any)[name];
          const newPath = [...path, fieldName];

          result[fieldName] = null;

          if (typeof valueOrResolver !== 'function') {
            return handleValueForField(
              valueOrResolver,
              fieldName,
              result,
              selection,
              signal,
              newPath,
            );
          }

          // TODO pass actual variables for this field

          const fieldVariables: Record<string, any> = {};

          if (selection.arguments) {
            for (const argument of selection.arguments) {
              fieldVariables[argument.name.value] = resolveArgumentValue(
                argument.value,
              );
            }
          }

          let resolverResult: any;
          let currentError: GraphQLError | void;

          try {
            resolverResult = (
              valueOrResolver as GraphQLLiveResolverFunction<unknown, any, any>
            )(fieldVariables, context, {
              signal,
              field: selection,
              path: newPath,
            });
          } catch (error) {
            resolverResult = error;
          }

          if (
            resolverResult == null ||
            typeof resolverResult !== 'object' ||
            resolverResult instanceof Error
          ) {
            return handleValueForField(
              resolverResult,
              fieldName,
              result,
              selection,
              signal,
              newPath,
            );
          }

          if (isPromise(resolverResult)) {
            return (async () => {
              let value;

              try {
                value = await resolverResult;
              } catch (error) {
                value = error;
              }

              if (signal.aborted) return;

              await handleValueForField(
                value,
                fieldName,
                result,
                selection,
                signal,
                newPath,
              );
            })();
          }

          if (typeof (resolverResult as any).next === 'function') {
            const iterator = resolverResult as AsyncIterableIterator<any>;
            const abort = new NestedAbortController(signal);
            const fieldPath = newPath.join('.');

            const consumeNextUpdate = async function consumeNextUpdate(
              abort: AbortController,
            ): Promise<void> {
              let value;
              let done;

              try {
                const resolvedIteratorResult = await iterator.next();
                value = resolvedIteratorResult.value;
                done = resolvedIteratorResult.done ?? false;
              } catch (error) {
                value = error;
                done = true;
              }

              if (abort.signal.aborted) return;

              if (done) {
                liveFields.delete(fieldPath);

                if (value === undefined) {
                  emitter.emit('update', {
                    path: newPath,
                    value: result,
                    change: false,
                  });
                  return;
                }
              }

              abort.abort();
              const newAbort = new NestedAbortController(signal);

              const oldError = currentError;
              // TODO don’t want fields within here to emit in this phase...
              currentError = await handleValueForField(
                value,
                fieldName,
                result,
                selection,
                newAbort.signal,
                newPath,
              );

              if (oldError) errors.delete(oldError);

              emitter.emit('update', {path, value: result});

              consumeNextUpdate(newAbort);
            };

            const iteratorResult = iterator.next();

            return (async () => {
              let value;
              let done;

              try {
                const resolvedIteratorResult = await iteratorResult;
                value = resolvedIteratorResult.value;
                done = resolvedIteratorResult.done ?? false;
              } catch (error) {
                value = error;
                done = true;
              }

              if (signal.aborted) return;

              currentError = await handleValueForField(
                value,
                fieldName,
                result,
                selection,
                abort.signal,
                newPath,
              );

              if (!done) {
                liveFields.add(fieldPath);
                consumeNextUpdate(abort);
              }
            })();
          }

          return handleValueForField(
            resolverResult,
            fieldName,
            result,
            selection,
            signal,
            newPath,
          );
        }
        case 'InlineFragment': {
          if (
            selection.typeCondition != null &&
            selection.typeCondition.name.value !==
              (resolvers as any)['__typename']
          ) {
            return;
          }

          return handleSelection(
            selection.selectionSet.selections,
            resolvers,
            result,
            signal,
            path,
          );
        }
        case 'FragmentSpread': {
          const name = selection.name.value;
          const fragment = fragmentDefinitions.get(name);

          if (fragment == null) {
            throw new Error(`Missing fragment: ${name}`);
          }

          if (
            fragment.typeCondition.name.value !==
            (resolvers as any)['__typename']
          ) {
            break;
          }

          return handleSelection(
            fragment.selectionSet.selections,
            resolvers,
            result,
            signal,
            path,
          );
        }
      }
    });

    return maybePromiseAll(selectionResults);
  }

  function resolveArgumentValue(value: ValueNode): any {
    const valueKind = value.kind;

    return valueKind === 'StringValue' ||
      valueKind === 'BooleanValue' ||
      valueKind === 'EnumValue'
      ? value.value
      : valueKind === 'IntValue'
      ? Number.parseInt(value.value)
      : valueKind === 'FloatValue'
      ? Number.parseFloat(value.value)
      : valueKind === 'NullValue'
      ? null
      : valueKind === 'Variable'
      ? (variables as any)[value.name.value] ?? null
      : valueKind === 'ListValue'
      ? value.values.map(resolveArgumentValue)
      : valueKind === 'ObjectValue'
      ? Object.fromEntries(
          value.fields.map((field) => [
            field.name.value,
            resolveArgumentValue(field.value),
          ]),
        )
      : null;
  }
}

function maybePromiseAll(values: any[]) {
  const promises = values.filter(isPromise);

  if (promises.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return Promise.all(promises).then(() => {});
  }
}

function isPromise(value?: unknown): value is Promise<unknown> {
  return value != null && typeof (value as any).then === 'function';
}
