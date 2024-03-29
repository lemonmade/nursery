import {describe, it, expect, vi} from 'vitest';
import {EventEmitter} from '@quilted/events';

import {parse} from 'graphql';

import {run, createQueryResolver as createQueryResolverForSchema} from './live';
import type {
  GraphQLLiveResolverObject,
  GraphQLLiveResolverCreateHelper,
} from './types';

interface Person {
  __typename: 'Person';
  name(variables: {}): string;
  pets(variables: {}): Pet[];
  pet(variables: {name: string}): Pet | null;
  school(variables: {}): School | null;
}

interface School {
  __typename: 'School';
  name(variables: {}): string;
  age(variables: {}): number;
}

interface Cat {
  __typename: 'Cat';
  age(variables: {}): number | null;
  name(variables: {}): string;
}

interface Dog {
  __typename: 'Dog';
  name(variables: {}): string;
  age(variables: {}): number | null;
  breed(variables: {}): string | null;
}

interface Pet {
  __possibleTypes: Cat | Dog;
}

interface Schema {
  Query: {
    __typename: 'Query';
    version(variables: {}): string;
    me(variables: {}): Person;
  };
  Person: Person;
  School: School;
  Cat: Cat;
  Dog: Dog;
  Pet: Pet;
}

// TODO
// - Variables
// - Arguments

describe('run()', () => {
  it('returns static field values', async () => {
    const query = parse(`query { version }`);

    const resolver = createQueryResolver(() => ({
      version: 'v1',
    }));

    const result = await run(query, resolver).untilDone();

    expect(result.data).toStrictEqual({version: 'v1'});
  });

  it('returns field values with aliases', async () => {
    const query = parse(`query { my: me { name } }`);

    const resolver = createQueryResolver(({object}) => ({
      me: object('Person', {
        name: 'Chris',
        pets: [],
      }),
    }));

    const result = await run(query, resolver).untilDone();

    expect(result.data).toStrictEqual({my: {name: 'Chris'}});
  });

  it('returns nullish field values', async () => {
    const query = parse(`query { me { school { grade } } }`);

    const resolver = createQueryResolver(({object}) => ({
      me: object('Person', {
        name: 'Chris',
        pets: [],
        school: undefined,
      }),
    }));

    const result = await run(query, resolver).untilDone();

    expect(result.data).toStrictEqual({me: {school: null}});
  });

  it('returns nested field selections', async () => {
    const query = parse(`query { me { school { age } } }`);

    const resolver = createQueryResolver(({object}) => ({
      me: object('Person', {
        name: 'Chris',
        pets: [],
        school: object('School', {
          name: 'Gloucester High School',
          age: () => Promise.resolve(10),
        }),
      }),
    }));

    const result = await run(query, resolver).untilDone();

    expect(result.data).toStrictEqual({me: {school: {age: 10}}});
  });

  it('returns field selections on lists', async () => {
    const query = parse(`query { me { pets { name } } }`);

    const resolver = createQueryResolver(({object}) => ({
      me: object('Person', {
        name: 'Chris',
        pets: [
          object('Dog', {name: 'Winston'}),
          object('Dog', {name: 'Molly'}),
        ],
      }),
    }));

    const result = await run(query, resolver).untilDone();

    expect(result.data).toStrictEqual({
      me: {pets: [{name: 'Winston'}, {name: 'Molly'}]},
    });
  });

  describe('inline fragments', () => {
    it('returns inline fragment selections on concrete types', async () => {
      const query = parse(`
        query { me { pets { __typename ... on Dog { breed } } } }
      `);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [
            object('Dog', {name: 'Molly'}),
            object('Dog', {name: 'Winston', breed: 'Black Lab'}),
            object('Cat', {name: 'Luna'}),
          ],
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({
        me: {
          pets: [
            {__typename: 'Dog', breed: null},
            {__typename: 'Dog', breed: 'Black Lab'},
            {__typename: 'Cat'},
          ],
        },
      });
    });
  });

  describe('fragment spreads', () => {
    it('returns fragment spreads on concrete types', async () => {
      const query = parse(`
        query { me { pets { __typename ...DogFragment } } }
        fragment DogFragment on Dog { breed }
      `);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [
            object('Dog', {name: 'Molly'}),
            object('Dog', {name: 'Winston', breed: 'Black Lab'}),
            object('Cat', {name: 'Luna'}),
          ],
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({
        me: {
          pets: [
            {__typename: 'Dog', breed: null},
            {__typename: 'Dog', breed: 'Black Lab'},
            {__typename: 'Cat'},
          ],
        },
      });
    });
  });

  describe('functions', () => {
    it('uses field resolvers that are functions', async () => {
      const query = parse(`query { version }`);

      const spy = vi.fn(() => 'v1');

      const resolver = createQueryResolver(() => ({
        version: spy,
      }));

      const result = await run(query, resolver).untilDone();

      expect(spy).toHaveBeenCalledWith(
        {},
        {},
        expect.objectContaining({
          field: expect.objectContaining({
            kind: 'Field',
            name: expect.objectContaining({value: 'version'}),
          }),
          path: ['version'],
        }),
      );
      expect(result.data).toStrictEqual({version: 'v1'});
    });

    it('includes an error when a resolver function throws', async () => {
      const query = parse(`query { me { pet(name: "Sean") { name } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          pet({name}) {
            if (name === 'Sean') {
              throw new Error('That’s a terrible pet name!');
            }

            return null;
          },
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({me: {pet: null}});
      expect(result.errors).toStrictEqual([
        {
          message: 'That’s a terrible pet name!',
          path: ['me', 'pet'],
          locations: [
            {
              line: expect.any(Number),
              column: expect.any(Number),
            },
          ],
        },
      ]);
    });

    describe('variables', () => {
      it('passes static variables to field resolvers', async () => {
        const query = parse(`query { me { pet(name: "Winston") { age } } }`);

        const spy = vi.fn();

        const resolver = createQueryResolver(({object}) => {
          spy.mockReturnValue(object('Dog', {name: 'Winston', age: 10}));

          return {
            me: object('Person', {
              name: 'Chris',
              pets: [],
              pet: spy,
            }),
          };
        });

        const result = await run(query, resolver).untilDone();

        expect(spy).toHaveBeenCalledWith(
          {name: 'Winston'},
          expect.anything(),
          expect.anything(),
        );

        expect(result.data).toStrictEqual({me: {pet: {age: 10}}});
      });

      it('resolves field variables from query variables', async () => {
        const query = parse(
          `query Pet($name: String!) { me { pet(name: $name) { age } } }`,
        );

        const spy = vi.fn();

        const resolver = createQueryResolver(({object}) => {
          spy.mockReturnValue(object('Dog', {name: 'Winston', age: 10}));

          return {
            me: object('Person', {
              name: 'Chris',
              pets: [],
              pet: spy,
            }),
          };
        });

        const result = await run(query, resolver, {
          variables: {name: 'Winston'},
        }).untilDone();

        expect(spy).toHaveBeenCalledWith(
          {name: 'Winston'},
          expect.anything(),
          expect.anything(),
        );

        expect(result.data).toStrictEqual({me: {pet: {age: 10}}});
      });
    });
  });

  describe('promises', () => {
    it('returns field values that return promises', async () => {
      const query = parse(`query { version }`);

      const resolver = createQueryResolver(() => ({
        version: () => Promise.resolve('v1'),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({version: 'v1'});
    });

    it('includes an error when a resolver function rejects', async () => {
      const query = parse(`query { me { pet(name: "Sean") { name } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          async pet({name}) {
            if (name === 'Sean') {
              throw new Error('That’s a terrible pet name!');
            }

            return null;
          },
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({me: {pet: null}});
      expect(result.errors).toStrictEqual([
        {
          message: 'That’s a terrible pet name!',
          path: ['me', 'pet'],
          locations: [
            {
              line: expect.any(Number),
              column: expect.any(Number),
            },
          ],
        },
      ]);
    });
  });

  describe('iterators', () => {
    it('yields for field values that return iterators', async () => {
      const spy = vi.fn();
      const query = parse(`query { version }`);

      const resolver = createQueryResolver(() => ({
        version: () => iterate(['v1', 'v2', 'v3']),
      }));

      for await (const result of run(query, resolver)) {
        spy(result);
      }

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenLastCalledWith({data: {version: `v3`}});
    });

    it('yields for iterators in nested selections', async () => {
      const spy = vi.fn();
      const query = parse(`query { me { name } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: () => iterate(['Chris 1', 'Chris 2', 'Chris 3']),
          pets: [],
        }),
      }));

      for await (const result of run(query, resolver)) {
        spy(result);
      }

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith({data: {me: {name: `Chris 3`}}});
    });

    it('yields for nested iterators', async () => {
      const spy = vi.fn();
      const query = parse(`query { me { pets { name age } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: () =>
            iterate([
              [],
              [
                object('Dog', {name: 'Molly'}),
                object('Dog', {
                  name: 'Winston',
                  age: () => iterate([8, 9, 10]),
                }),
              ],
            ]),
        }),
      }));

      for await (const result of run(query, resolver)) {
        spy(result);
      }

      expect(spy).toHaveBeenCalledTimes(4);
      expect(spy).toHaveBeenCalledWith({
        data: {
          me: {
            pets: [
              {name: 'Molly', age: null},
              {name: 'Winston', age: 10},
            ],
          },
        },
      });
    });

    it('cancels yielding for iterators when ancestor iterators change', async () => {
      const query = parse(`query { me { school { name age } } }`);

      const highSchool = {
        name: 'Gloucester High School',
        currentAge: createAsyncIterator(20),
        ageAbortSpy: vi.fn(),
      };

      const university = {
        name: 'Carleton University',
        currentAge: createAsyncIterator(10),
        ageAbortSpy: vi.fn(),
      };

      const currentSchool = createAsyncIterator(highSchool);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          async *school() {
            for await (const school of currentSchool.iterate()) {
              yield object('School', {
                name: school.name,
                async *age(_, __, {signal}) {
                  signal.addEventListener('abort', school.ageAbortSpy);

                  for await (const age of school.currentAge.iterate()) {
                    yield age;
                  }
                },
              });
            }
          },
        }),
      }));

      const iterator = run(query, resolver)[Symbol.asyncIterator]();

      expect(await iterator.next()).toStrictEqual({
        done: false,
        value: {
          data: {
            me: {school: {name: highSchool.name, age: 20}},
          },
        },
      });

      expect(highSchool.ageAbortSpy).not.toHaveBeenCalled();

      await currentSchool.yield(university);

      expect(await iterator.next()).toStrictEqual({
        done: false,
        value: {
          data: {
            me: {school: {name: university.name, age: 10}},
          },
        },
      });

      expect(highSchool.ageAbortSpy).toHaveBeenCalled();

      await highSchool.currentAge.yield(21);

      const nextPromiseSpy = vi.fn((value) => value);
      const nextPromise = iterator.next().then(nextPromiseSpy);

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(nextPromiseSpy).not.toHaveBeenCalled();

      await university.currentAge.yield(11);

      expect(await nextPromise).toStrictEqual({
        done: false,
        value: {
          data: {
            me: {school: {name: university.name, age: 11}},
          },
        },
      });
    });

    it('includes an error when an iterator throws', async () => {
      const query = parse(`query { me { pet(name: "Sean") { name } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          async *pet({name}) {
            if (name === 'Sean') {
              throw new Error('That’s a terrible pet name!');
            }

            yield null;
          },
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({me: {pet: null}});
      expect(result.errors).toStrictEqual([
        {
          message: 'That’s a terrible pet name!',
          path: ['me', 'pet'],
          locations: [
            {
              line: expect.any(Number),
              column: expect.any(Number),
            },
          ],
        },
      ]);
    });

    it('includes an error when an iterator yields an error', async () => {
      const query = parse(`query { me { pet(name: "Sean") { name } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          async *pet({name}) {
            if (name === 'Sean') {
              yield new Error('That’s a terrible pet name!');
              return;
            }

            yield null;
          },
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({me: {pet: null}});
      expect(result.errors).toStrictEqual([
        {
          message: 'That’s a terrible pet name!',
          path: ['me', 'pet'],
          locations: [
            {
              line: expect.any(Number),
              column: expect.any(Number),
            },
          ],
        },
      ]);
    });

    it('removes an error when subsequent iterations do not return one', async () => {
      const query = parse(`query { me { pet(name: "Sean") { name } } }`);

      const resolver = createQueryResolver(({object}) => ({
        me: object('Person', {
          name: 'Chris',
          pets: [],
          async *pet({name}) {
            if (name === 'Sean') {
              yield new Error(
                'Uh... sorry, temporary network error, it’s not just a bad name!',
              );
            }

            yield null;
          },
        }),
      }));

      const result = await run(query, resolver).untilDone();

      expect(result.data).toStrictEqual({me: {pet: null}});
      expect(result.errors).toBeUndefined();
    });
  });
});

function createQueryResolver(
  fields?: (
    helpers: GraphQLLiveResolverCreateHelper<Schema>,
  ) => Partial<Omit<GraphQLLiveResolverObject<Schema['Query']>, '__typename'>>,
) {
  return createQueryResolverForSchema<Schema>((helpers) => ({
    version: 'v1',
    me: helpers.object('Person', {
      name: 'Chris',
      pets: [],
      pet() {
        return;
      },
    }),
    ...fields?.(helpers),
  }));
}

async function* iterate<T>(values: Iterable<T>) {
  for (const value of values) {
    await sleep(0);
    yield value;
  }
}

function sleep(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

function createAsyncIterator<T>(initialValue: T) {
  let currentValue = initialValue;

  const emitter = new EventEmitter<{yield: T}>();

  emitter.on('yield', (value) => {
    currentValue = value;
  });

  return {
    async yield(value: T) {
      emitter.emit('yield', value);
    },
    async *iterate({
      signal,
    }: {
      signal?: AbortSignal;
    } = {}): AsyncGenerator<T, void, void> {
      yield currentValue;
      yield* emitter.on('yield', {signal});
    },
  };
}
