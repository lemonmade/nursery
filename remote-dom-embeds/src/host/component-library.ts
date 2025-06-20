import {RemoteElement} from '@remote-dom/core/elements';

export class ExtensionButton extends RemoteElement {
  static get remoteEvents() {
    return ['click'];
  }
}

export class ExtensionStack extends RemoteElement {
  static get remoteAttributes() {
    return ['gap'];
  }
}
