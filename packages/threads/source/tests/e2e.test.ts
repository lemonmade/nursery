import {createThread, targetFromMessagePort} from '..';
import {MessageChannel} from './utiltiies';

describe('thread', () => {
  it('calls the exposed API over a message channel', async () => {
    interface EndpointApi {
      hello(): string;
    }

    const {port1, port2} = new MessageChannel();
    const endpoint1 = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {hello: () => 'world'},
    });

    expect(await endpoint1.call.hello()).toBe('world');
  });

  it('proxies function calls', async () => {
    interface EndpointApi {
      greet(getName: () => string): string;
    }

    const {port1, port2} = new MessageChannel();
    const endpoint1 = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        greet: async (getName) => `Hello, ${await getName()}!`,
      },
    });

    expect(await endpoint1.call.greet(() => 'Chris')).toBe('Hello, Chris!');
  });

  it('proxies generators', async () => {
    interface EndpointApi {
      iterate(): Generator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    let yielded = 0;
    let expected = 0;

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of threadOne.call.iterate()) {
      expect(value).toBe(++expected);
    }
  });

  it('proxies async generators', async () => {
    interface EndpointApi {
      iterate(): AsyncGenerator<number, void, void>;
    }

    const {port1, port2} = new MessageChannel();
    const threadOne = createThread<Record<string, never>, EndpointApi>(
      targetFromMessagePort(port1),
    );

    let yielded = 0;
    let expected = 0;

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {
        async *iterate() {
          while (yielded < 5) {
            yield ++yielded;
          }
        },
      },
    });

    for await (const value of threadOne.call.iterate()) {
      expect(value).toBe(++expected);
    }
  });
});
