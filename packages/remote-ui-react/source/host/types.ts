import type {ComponentType} from 'react';
import type {RemoteReceiver, RemoteElementReceived} from '@lemonmade/remote-ui';

export interface RemoteComponentRendererProps {
  element: RemoteElementReceived;
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
