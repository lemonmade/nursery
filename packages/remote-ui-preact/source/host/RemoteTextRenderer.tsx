import type {RemoteReceiver, RemoteTextReceived} from '@lemonmade/remote-ui';
import {useRemoteReceived} from './hooks/remote-received.ts';

export interface RemoteTextRendererProps {
  remote: RemoteTextReceived;
  receiver: RemoteReceiver;
}

export function RemoteTextRenderer({
  remote,
  receiver,
}: RemoteTextRendererProps) {
  const text = useRemoteReceived(remote, receiver);
  return text ? <>{text.data}</> : null;
}
