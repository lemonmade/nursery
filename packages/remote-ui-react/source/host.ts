export {RemoteReceiver} from '@lemonmade/remote-ui';

export {renderRemoteNode} from './host/node.tsx';
export {createRemoteComponentRenderer} from './host/component.tsx';
export {
  RemoteTextRenderer,
  type RemoteTextRendererProps,
} from './host/RemoteTextRenderer.tsx';
export {
  RemoteRootRenderer,
  type RemoteRootRendererProps,
} from './host/RemoteRootRenderer.tsx';

export {useRemoteReceived} from './host/hooks.ts';

export type {
  RemoteComponentType,
  RemoteComponentProps,
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';
