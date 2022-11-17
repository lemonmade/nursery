import type {FieldNode} from 'graphql';

export interface GraphQLError {
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly locations?: readonly {
    readonly line: number;
    readonly column: number;
  }[];
}

export type GraphQLResult<Data> =
  | {
      readonly data: Data;
      readonly errors?: never;
    }
  | {
      readonly data: Data | null;
      readonly errors: readonly GraphQLError[];
    };

export type GraphQLNullableFields<Type> = {
  [Field in keyof Type]: ((...args: any[]) => null) extends Type[Field]
    ? Field
    : never;
}[keyof Type];

export type GraphQLLiveResolverObject<
  Type,
  Context = Record<string, never>,
> = PickPartial<
  {
    [Field in keyof Type]: Field extends '__typename'
      ? Type[Field]
      : Type[Field] extends (variables: infer Variables) => infer ReturnValue
      ? GraphQLLiveResolverField<ReturnValue, Variables, Context>
      : never;
  },
  GraphQLNullableFields<Type>
> & {__context?: Context};

export type ContextTypeForGraphQLLiveResolverObject<T> =
  T extends GraphQLLiveResolverObject<any, infer Context> ? Context : never;

export interface GraphQLLiveResolverFieldContext {
  readonly signal: AbortSignal;
  readonly field: FieldNode;
  readonly path: readonly (string | number)[];
}

export interface GraphQLLiveResolverFunction<
  ReturnType,
  Variables,
  Context = Record<string, never>,
> {
  (
    variables: Variables,
    context: Context,
    graphQLContext: GraphQLLiveResolverFieldContext,
  ):
    | GraphQLLiveReturnResult<ReturnType, Context>
    | Promise<GraphQLLiveReturnResult<ReturnType, Context>>
    | AsyncIterableIterator<GraphQLLiveReturnResult<ReturnType, Context>>;
}

export type GraphQLLiveResolverField<
  ReturnType,
  Variables,
  Context = Record<string, never>,
> =
  | GraphQLLiveReturnResult<ReturnType, Context>
  | GraphQLLiveResolverFunction<ReturnType, Variables, Context>;

export type GraphQLLiveSimpleReturnResult<
  Type,
  Context = Record<string, never>,
> = {
  [Field in Exclude<keyof Type, '__typename'>]: Type[Field] extends (
    variables: any,
  ) => infer ReturnValue
    ? GraphQLLiveReturnResult<ReturnValue, Context>
    : never;
};

export type GraphQLLiveReturnResult<
  Type,
  Context = Record<string, never>,
> = Type extends null
  ? null | undefined | Error | void
  : Type extends number
  ? Type
  : Type extends string
  ? Type
  : Type extends boolean
  ? Type
  : Type extends (infer U)[]
  ? GraphQLLiveReturnResult<U, Context>[]
  : Type extends {__possibleTypes: any}
  ? GraphQLLiveReturnResult<Type['__possibleTypes'], Context>
  : Type extends {__typename: any}
  ? GraphQLLiveResolverObject<Type, Context>
  : unknown;

export interface GraphQLLiveResolverCreateHelper<
  Types,
  Context = Record<string, never>,
> {
  object<Type extends keyof Types>(
    type: Type,
    resolver: Omit<
      GraphQLLiveResolverObject<Types[Type], Context>,
      '__typename' | '__context'
    >,
  ): NoInfer<GraphQLLiveResolverObject<Types[Type], Context>>;
}

export type NoInfer<T> = T & {[K in keyof T]: T[K]};

export type PickPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
