import {RemoteElement} from '@remote-dom/core/elements';

export class ExtensionButton extends RemoteElement {
  static remoteEvents = ['click'];
}

export class ExtensionStack extends RemoteElement {
  static remoteAttributes = ['gap'];
}
