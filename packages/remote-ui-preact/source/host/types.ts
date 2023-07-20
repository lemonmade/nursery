import type {ComponentType} from 'preact';
import type {
  SignalRemoteReceiver,
  SignalRemoteElementReceived,
} from './receiver.ts';

export interface RemoteComponentRendererProps {
  element: SignalRemoteElementReceived;
  receiver: SignalRemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
