import type {ComponentType} from 'react';
import type {
  RemoteReceiver,
  RemoteReceiverElement,
} from '@lemonmade/remote-ui/receiver';

export interface RemoteComponentRendererProps {
  element: RemoteReceiverElement;
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap<any>;
}

export type RemoteComponentRendererMap<Elements extends string = string> = Map<
  Elements,
  ComponentType<RemoteComponentRendererProps>
>;
