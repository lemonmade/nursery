import {REMOTE_PROPERTIES} from '../constants.ts';
import {updateRemoteElementProperty} from './internals.ts';

export interface RemoteElementPropertyDefinition<Value = unknown> {
  attribute?: string | boolean;
  callback?: Value extends (...args: any[]) => any ? true : never;
}

export type RemoteElementPropertiesDefinition<
  Properties extends Record<string, any> = Record<string, unknown>,
> = {
  [Property in keyof Properties]: RemoteElementPropertyDefinition<
    Properties[Property]
  >;
};

export class RemoteElement<
  Properties extends Record<string, any> = {},
> extends HTMLElement {
  static readonly properties: RemoteElementPropertiesDefinition<any>;
  private static readonly attributeToPropertyMap = new Map<string, string>();

  static get observedAttributes() {
    const {properties, attributeToPropertyMap} = this;

    if (properties == null) {
      return [];
    }

    Object.keys(properties).forEach((name) => {
      const {attribute = true} = properties[name]!;

      if (attribute === true) {
        attributeToPropertyMap.set(name, name);
      } else if (typeof attribute === 'string') {
        attributeToPropertyMap.set(attribute, name);
      }
    });

    return [...attributeToPropertyMap.keys()];
  }

  private [REMOTE_PROPERTIES]!: Properties;

  constructor() {
    super();

    const {properties} = this.constructor as typeof RemoteElement;

    Object.defineProperty(this, REMOTE_PROPERTIES, {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    });

    if (properties) {
      Object.keys(properties).forEach((name) => {
        const property = properties[name]!;

        const propertyDescriptor = {
          configurable: true,
          enumerable: true,
          get: () => {
            return (this[REMOTE_PROPERTIES] as any)[name];
          },
          set: (value: any) => {
            (this[REMOTE_PROPERTIES] as any)[name] = value;
            updateRemoteElementProperty(this, name, value);
          },
        };

        Object.defineProperty(this, name, propertyDescriptor);

        // Allow setting function callbacks using a `_` prefix, which
        // makes it easy to have framework bindings avoid logic that
        // auto-converts `on` properties to event listeners.
        if (property.callback) {
          Object.defineProperty(this, `_${name}`, propertyDescriptor);
        }
      });
    }
  }

  attributeChangedCallback(key: string, _oldValue: any, newValue: any) {
    const property = (
      this.constructor as typeof RemoteElement
    ).attributeToPropertyMap.get(key)!;

    (this as any)[property] = newValue;
  }
}
