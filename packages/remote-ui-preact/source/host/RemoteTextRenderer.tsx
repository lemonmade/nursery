import type {
  SignalRemoteReceiver,
  SignalRemoteTextReceived,
} from './receiver.ts';

export interface RemoteTextRendererProps {
  text: SignalRemoteTextReceived;
  receiver: SignalRemoteReceiver;
}

export function RemoteTextRenderer({text}: RemoteTextRendererProps) {
  const data = text.data.value;
  return data ? <>{data}</> : null;
}
