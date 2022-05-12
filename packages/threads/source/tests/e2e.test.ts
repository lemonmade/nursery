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

    const spy = jest.fn(() => 'world');

    createThread<EndpointApi>(targetFromMessagePort(port2), {
      expose: {hello: spy},
    });

    expect(await endpoint1.call.hello()).toBe('world');
  });
});
