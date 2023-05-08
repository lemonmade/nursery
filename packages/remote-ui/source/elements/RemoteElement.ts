import {REMOTE_PROPERTIES} from '../constants.ts';
import {updateRemoteElementProperty} from './internals.ts';

export interface RemoteElementPropertyType<Value = unknown> {
  parse?(value: string | unknown): Value;
  serialize?(value: Value): string | unknown;
}

export type RemoteElementPropertyTypeOrBuiltIn<Value = unknown> =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array
  | typeof Function
  | RemoteElementPropertyType<Value>;

export interface RemoteElementPropertyDefinition<Value = unknown> {
  type?: RemoteElementPropertyTypeOrBuiltIn<Value>;
  attribute?: string | boolean;
}

interface NormalizedRemoteElementPropertyDefinition<Value = unknown> {
  type: RemoteElementPropertyTypeOrBuiltIn<Value>;
  attribute?: string;
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

const SLOT_PROPERTY = 'slot';

// Heavily inspired by https://github.com/lit/lit/blob/343187b1acbbdb02ce8d01fa0a0d326870419763/packages/reactive-element/src/reactive-element.ts
export abstract class RemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> extends HTMLElement {
  static readonly slottable = true;
  static readonly remoteSlots?: RemoteElementSlotsDefinition<any>;
  static readonly remoteProperties?: RemoteElementPropertiesDefinition<any>;

  protected static __finalized = true;
  private static readonly __attributeToPropertyMap: Map<string, string>;
  private static readonly __propertyToOptionsMap: Map<
    string,
    NormalizedRemoteElementPropertyDefinition
  >;

  static get observedAttributes() {
    return this.finalize()!.observedAttributes;
  }

  static createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ) {
    this.finalize();

    saveRemoteProperty(
      name,
      definition,
      this.observedAttributes,
      this.__attributeToPropertyMap,
      this.__propertyToOptionsMap,
    );
  }

  protected static finalize(): {observedAttributes: string[]} | undefined {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty('__finalized')) {
      return;
    }

    this.__finalized = true;

    // finalize any superclasses
    const superCtor = Object.getPrototypeOf(this) as typeof RemoteElement;
    superCtor.finalize();

    const {remoteProperties} = this;

    const observedAttributes: string[] = [];
    const attributeToPropertyMap = new Map<string, string>();
    const propertyToOptionsMap = new Map<
      string,
      NormalizedRemoteElementPropertyDefinition
    >();

    if (remoteProperties != null) {
      Object.keys(remoteProperties).forEach((propertyName) => {
        saveRemoteProperty(
          propertyName,
          remoteProperties[propertyName],
          observedAttributes,
          attributeToPropertyMap,
          propertyToOptionsMap,
        );
      });
    }

    Object.defineProperties(this, {
      observedAttributes: {value: observedAttributes},
      __attributeToPropertyMap: {
        value: attributeToPropertyMap,
        enumerable: false,
      },
      __propertyToOptionsMap: {
        value: propertyToOptionsMap,
        enumerable: false,
      },
    });

    return {observedAttributes};
  }

  get [SLOT_PROPERTY]() {
    return super.slot;
  }

  set [SLOT_PROPERTY](value: string) {
    const currentSlot = this.slot;
    const newSlot = String(value);

    if (currentSlot === newSlot) return;

    super.slot = value;

    if (!(this.constructor as typeof RemoteElement).slottable) {
      return;
    }

    updateRemoteElementProperty(this, SLOT_PROPERTY, this.slot);
  }

  // Just need to use these types so TS doesn’t lose track of them.
  /** @internal */
  __slots?: Slots;

  /** @internal */
  __properties?: Properties;

  private [REMOTE_PROPERTIES]!: Properties;

  constructor() {
    super();

    const {remoteProperties} = this.constructor as typeof RemoteElement;
    const propertyDescriptors: PropertyDescriptorMap = {};

    propertyDescriptors[REMOTE_PROPERTIES] = {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    };

    if (remoteProperties) {
      Object.keys(remoteProperties).forEach((name) => {
        if (name === SLOT_PROPERTY) return;

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

        propertyDescriptors[name] = propertyDescriptor;

        // Allow setting function callbacks using a `_` prefix, which
        // makes it easy to have framework bindings avoid logic that
        // auto-converts `on` properties to event listeners.
        if (property.type === Function) {
          propertyDescriptors[`_${name}`] = {
            ...propertyDescriptor,
            enumerable: false,
          };
        }
      });
    }

    Object.defineProperties(this, propertyDescriptors);
  }

  attributeChangedCallback(key: string, _oldValue: any, newValue: any) {
    const {
      __attributeToPropertyMap: attributeToPropertyMap,
      __propertyToOptionsMap: propertyToOptionsMap,
    } = this.constructor as typeof RemoteElement;

    const property = attributeToPropertyMap.get(key);

    const propertyOptions =
      property == null ? property : propertyToOptionsMap.get(property);

    if (propertyOptions == null) return;

    (this as any)[property!] = convertAttributeValueToProperty(
      newValue,
      propertyOptions.type,
    );
  }
}

// function convertPropertyValueToAttribute<Value = unknown>(
//   value: Value,
//   type: RemoteElementPropertyTypeOrBuiltIn<Value>,
// ) {
//   switch (type) {
//     case Boolean:
//       return value ? '' : null;
//     case Object:
//     case Array:
//       return value == null ? value : JSON.stringify(value);
//     case String:
//     case Number:
//       return value == null ? value : String(value);
//     case Function:
//       return null;
//     default: {
//       return (
//         (type as RemoteElementPropertyType<Value>).serialize?.(value) ?? null
//       );
//     }
//   }
// }

function saveRemoteProperty<Value = unknown>(
  name: string,
  description: RemoteElementPropertyDefinition<Value> | undefined,
  observedAttributes: string[],
  attributeToPropertyMap: Map<string, string>,
  propertyToOptionsMap: Map<string, NormalizedRemoteElementPropertyDefinition>,
) {
  const {
    type = name[0] === 'o' && name[1] === 'n' ? Function : String,
    attribute = type !== Function,
  } = description ?? ({} as RemoteElementPropertyDefinition<Value>);

  let attributeName: string | undefined;

  if (attribute === true) {
    attributeName = camelToKebabCase(name);
  } else if (typeof attribute === 'string') {
    attributeName = attribute;
  }

  if (attributeName) {
    observedAttributes.push(attributeName);
    attributeToPropertyMap.set(attributeName, name);
  }

  propertyToOptionsMap.set(name, {
    type,
    attribute: attributeName,
  });
}

function convertAttributeValueToProperty<Value = unknown>(
  value: string | null,
  type: RemoteElementPropertyTypeOrBuiltIn<Value>,
) {
  switch (type) {
    case Boolean:
      return value == null ? undefined : value !== 'false';
    case Object:
    case Array:
      return value == null ? undefined : JSON.parse(value);
    case String:
      return value == null ? undefined : String(value);
    case Number:
      return value == null ? undefined : Number.parseFloat(value);
    case Function:
      return null;
    default: {
      return (type as RemoteElementPropertyType<Value>).parse?.(value) ?? null;
    }
  }
}

function camelToKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
