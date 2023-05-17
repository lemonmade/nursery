import type {ComponentType} from 'preact';
import type {RemoteReceiver, RemoteElementReceived} from '@lemonmade/remote-ui';

export interface RemoteComponentRendererProps {
  element: RemoteElementReceived;
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
