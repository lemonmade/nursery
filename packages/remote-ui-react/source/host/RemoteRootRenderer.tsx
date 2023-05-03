import type {RemoteReceiver} from '@lemonmade/remote-ui';

import {useRemoteReceived} from './hooks.ts';
import {renderRemoteNode} from './node.tsx';
import type {RemoteComponentRendererMap} from './component.tsx';

export interface RemoteRootRendererProps {
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap;
}

export function RemoteRootRenderer(props: RemoteRootRendererProps) {
  const {receiver} = props;
  const {children} = useRemoteReceived(receiver.root, receiver)!;
  return <>{children.map((child) => renderRemoteNode(child, props))}</>;
}
