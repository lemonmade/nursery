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

export type RemoteElementConstructor<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> = {
  new (): RemoteElement<Properties, Slots>;
  readonly remoteSlots?: RemoteElementSlotsDefinition<Slots>;
  readonly remoteProperties?: RemoteElementPropertiesDefinition<Properties>;
};

// Heavily inspired by https://github.com/lit/lit/blob/343187b1acbbdb02ce8d01fa0a0d326870419763/packages/reactive-element/src/reactive-element.ts
export abstract class RemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> extends HTMLElement {
  static readonly slottable = true;
  static readonly remoteSlots?: RemoteElementSlotsDefinition<any>;
  static readonly remoteProperties?: RemoteElementPropertiesDefinition<any>;

  private static readonly attributeToPropertyMap: Map<string, string>;
  protected static finalized = true;

  static get observedAttributes() {
    return this.finalize()!.observedAttributes;
  }

  protected static finalize(): {observedAttributes: string[]} | undefined {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty('finalized')) {
      return;
    }

    this.finalized = true;

    // finalize any superclasses
    const superCtor = Object.getPrototypeOf(this) as typeof RemoteElement;
    superCtor.finalize();

    const {remoteProperties} = this;

    const observedAttributes = [];
    const attributeToPropertyMap = new Map<string, string>();

    if (remoteProperties != null) {
      Object.keys(remoteProperties).forEach((name) => {
        if (name === 'slot') return;

        const {attribute = true} = remoteProperties[name]!;

        if (attribute === true) {
          attributeToPropertyMap.set(name, name);
        } else if (typeof attribute === 'string') {
          attributeToPropertyMap.set(attribute, name);
        }
      });

      observedAttributes.push(...attributeToPropertyMap.keys());
    }

    Object.defineProperties(this, {
      observedAttributes: {value: observedAttributes},
      attributeToPropertyMap: {value: attributeToPropertyMap},
    });

    return {observedAttributes};
  }

  private [REMOTE_PROPERTIES]!: Properties;

  set slot(value: string) {
    const currentSlot = this.slot;
    const newSlot = String(value);

    if (currentSlot === newSlot) return;

    super.slot = value;

    if (!(this.constructor as typeof RemoteElement).slottable) {
      return;
    }

    updateRemoteElementProperty(this, 'slot', this.slot);
  }

  // Just need to use these types so TS doesn’t lose track of them.
  /** @internal */
  __slots?: Slots;

  /** @internal */
  __properties?: Properties;

  constructor() {
    super();

    const {remoteProperties} = this.constructor as typeof RemoteElement;

    Object.defineProperty(this, REMOTE_PROPERTIES, {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    });

    if (remoteProperties) {
      Object.keys(remoteProperties).forEach((name) => {
        if (name === 'slot') return;

        const property = remoteProperties[name]!;

        const propertyDescriptor = {
          configurable: true,
          enumerable: true,
          get: () => {
            return this[REMOTE_PROPERTIES][name as keyof Properties];
          },
          set: (value: any) => {
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
