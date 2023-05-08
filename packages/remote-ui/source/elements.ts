export {
  RemoteElement,
  type RemoteElementConstructor,
  type RemoteElementPropertyType,
  type RemoteElementPropertyDefinition,
  type RemoteElementPropertiesDefinition,
  type RemoteElementSlotDefinition,
  type RemoteElementSlotsDefinition,
  type RemotePropertiesFromElementConstructor,
  type RemoteSlotsFromElementConstructor,
} from './elements/RemoteElement.ts';
export {RemoteFragmentElement} from './elements/RemoteFragmentElement.ts';
export {RemoteRootElement} from './elements/RemoteRootElement.ts';
export {RemoteReceiverElement} from './elements/RemoteReceiverElement.ts';

export {RemoteMutationObserver} from './elements/RemoteMutationObserver.ts';

export {
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  updateRemoteElementProperty,
} from './elements/internals.ts';

export {remoteProperty} from './elements/decorators/remote-property.ts';

export {BooleanOrString} from './elements/property-types/BooleanOrString.ts';

export type {RemoteMutationCallback} from './callback.ts';
