import type {ComponentChild, ComponentType} from 'preact';
import type {
  RemoteElementConstructor,
  RemoteSlotsFromElementConstructor,
  RemotePropertiesFromElementConstructor,
} from '@lemonmade/remote-ui/elements';

export type RemoteComponentType<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = ComponentType<RemoteComponentProps<Properties, Slots>>;

export type RemoteComponentProps<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = Omit<Properties, keyof Slots> & {
  [Slot in keyof Slots]: ComponentChild;
} & {children?: ComponentChild};

export type RemoteComponentPropsFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any>,
> = RemoteComponentProps<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;

export type RemoteComponentTypeFromElementConstructor<
  ElementConstructor extends RemoteElementConstructor<any, any>,
> = RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
>;
