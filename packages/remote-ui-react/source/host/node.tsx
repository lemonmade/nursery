import {
  type RemoteReceiver,
  type RemoteChildReceived,
} from '@lemonmade/remote-ui';

import {RemoteTextRenderer} from './RemoteTextRenderer.tsx';
import type {RemoteComponentRendererMap} from './component.tsx';

export function renderRemoteNode(
  node: RemoteChildReceived,
  {
    receiver,
    components,
  }: {
    receiver: RemoteReceiver;
    components: RemoteComponentRendererMap;
  },
) {
  switch (node.type) {
    case 1: {
      const Component = components.get(node.element);

      if (Component == null) {
        throw new Error(
          `No component found for remote element: ${node.element}`,
        );
      }

      return (
        <Component
          key={node.id}
          remote={node}
          receiver={receiver}
          components={components}
        />
      );
    }
    case 3: {
      return (
        <RemoteTextRenderer key={node.id} remote={node} receiver={receiver} />
      );
    }
    default: {
      throw new Error(`Unknown remote node type: ${String(node)}`);
    }
  }
}
