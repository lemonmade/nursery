import {REMOTE_PROPERTIES} from '../constants.ts';
import {updateRemoteElementProperty} from './internals.ts';

export interface RemoteElementPropertyDefinition<Value = unknown> {
  attribute?: string | boolean;
  callback?: Value extends (...args: any[]) => any ? boolean : false;
}

export type RemoteElementPropertiesDefinition<
  Properties extends Record<string, any> = Record<string, unknown>,
> = {
  [Property in keyof Properties]: RemoteElementPropertyDefinition<
    Properties[Property]
  >;
};

export interface RemoteElementSlotDefinition {}

export type RemoteElementSlotsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementSlotDefinition;
};

export type RemotePropertiesFromElementConstructor<T> = T extends {
  new (): RemoteElement<infer Properties, any>;
}
  ? Properties
  : never;

export type RemoteSlotsFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, infer Slots>;
}
  ? Slots
  : never;

export class RemoteElement<
  Properties extends Record<string, any> = {},
  _Slots extends Record<string, any> = {},
> extends HTMLElement {
  static readonly slottable = true;
  static readonly remoteSlots: RemoteElementSlotsDefinition<any>;
  static readonly remoteProperties: RemoteElementPropertiesDefinition<any>;
  private static readonly attributeToPropertyMap = new Map<string, string>();

  static get observedAttributes() {
    const {remoteProperties, attributeToPropertyMap} = this;

    if (remoteProperties == null) {
      return [];
    }

    Object.keys(remoteProperties).forEach((name) => {
      const {attribute = true} = remoteProperties[name]!;

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

    const {slottable, remoteProperties} = this
      .constructor as typeof RemoteElement;

    if (slottable) {
      const slotPropertyDescriptor = Object.getOwnPropertyDescriptor(
        this,
        'slot',
      );

      Object.defineProperty(this, 'slot', {
        set(value: string) {
          slotPropertyDescriptor!.set!.call(this, value);
          (this[REMOTE_PROPERTIES] as any).slot = value;
          updateRemoteElementProperty(this, 'slot', value);
        },
        ...slotPropertyDescriptor,
      });
    }

    Object.defineProperty(this, REMOTE_PROPERTIES, {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    });

    if (remoteProperties) {
      Object.keys(remoteProperties).forEach((name) => {
        const property = remoteProperties[name]!;

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
