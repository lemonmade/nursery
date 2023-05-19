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
  alias?: string[];
  attribute?: string | boolean;
}

interface NormalizedRemoteElementPropertyDefinition<Value = unknown> {
  name: string;
  type: RemoteElementPropertyTypeOrBuiltIn<Value>;
  alias?: string[];
  attribute?: string;
}

export type RemoteElementPropertiesDefinition<
  Properties extends Record<string, any> = {},
> = {
  [Property in keyof Properties]: RemoteElementPropertyDefinition<
    Properties[Property]
  >;
};

export interface RemoteElementSlotDefinition {}

interface NormalizedRemoteElementSlotDefinition {}

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
  new (): RemoteElement<Properties, Slots> & Properties;
  readonly remoteSlots?:
    | RemoteElementSlotsDefinition<Slots>
    | readonly (keyof Slots)[];
  readonly remoteSlotDefinitions: Map<
    string,
    NormalizedRemoteElementSlotDefinition
  >;
  readonly remoteProperties?:
    | RemoteElementPropertiesDefinition<Properties>
    | readonly (keyof Properties)[];
  readonly remotePropertyDefinitions: Map<
    string,
    NormalizedRemoteElementPropertyDefinition
  >;
  createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ): void;
};

export interface RemoteElementCreatorOptions<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> {
  slots?: RemoteElementConstructor<Properties, Slots>['remoteSlots'];
  properties?: RemoteElementConstructor<Properties, Slots>['remoteProperties'];
}

export function createRemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
>({
  slots,
  properties,
}: RemoteElementCreatorOptions<
  Properties,
  Slots
> = {}): RemoteElementConstructor<Properties, Slots> {
  return class extends RemoteElement<Properties, Slots> {
    static readonly remoteSlots = slots;
    static readonly remoteProperties = properties;
  } as any;
}

const SLOT_PROPERTY = 'slot';

// Heavily inspired by https://github.com/lit/lit/blob/343187b1acbbdb02ce8d01fa0a0d326870419763/packages/reactive-element/src/reactive-element.ts
export abstract class RemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
> extends HTMLElement {
  static readonly slottable = true;

  static readonly remoteSlots?: any;
  static readonly remoteProperties?: any;

  static get observedAttributes() {
    return this.finalize().__observedAttributes;
  }

  static get remotePropertyDefinitions(): Map<
    string,
    NormalizedRemoteElementPropertyDefinition
  > {
    return this.finalize().__remotePropertyDefinitions;
  }

  static get remoteSlotDefinitions(): Map<
    string,
    NormalizedRemoteElementSlotDefinition
  > {
    return this.finalize().__remoteSlotDefinitions;
  }

  protected static __finalized = true;
  private static readonly __observedAttributes: string[] = [];
  private static readonly __attributeToPropertyMap = new Map<string, string>();
  private static readonly __remotePropertyDefinitions = new Map<
    string,
    NormalizedRemoteElementPropertyDefinition
  >();
  private static readonly __remoteSlotDefinitions = new Map<
    string,
    NormalizedRemoteElementSlotDefinition
  >();

  static createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ) {
    saveRemoteProperty(
      name,
      definition,
      this.observedAttributes,
      this.remotePropertyDefinitions,
      this.__attributeToPropertyMap,
    );
  }

  protected static finalize(): typeof this {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty('__finalized')) {
      return this;
    }

    this.__finalized = true;
    const {remoteSlots, remoteProperties} = this;

    // finalize any superclasses
    const SuperConstructor = Object.getPrototypeOf(
      this,
    ) as typeof RemoteElement;

    const observedAttributes: string[] = [];
    const attributeToPropertyMap = new Map<string, string>();
    const remoteSlotDefinitions = new Map<
      string,
      NormalizedRemoteElementSlotDefinition
    >();
    const remotePropertyDefinitions = new Map<
      string,
      NormalizedRemoteElementPropertyDefinition
    >();

    if (typeof SuperConstructor.finalize === 'function') {
      SuperConstructor.finalize();
      observedAttributes.push(...SuperConstructor.observedAttributes);
      SuperConstructor.remotePropertyDefinitions.forEach(
        (definition, property) => {
          remotePropertyDefinitions.set(property, definition);
        },
      );
      SuperConstructor.remoteSlotDefinitions.forEach((definition, slot) => {
        remoteSlotDefinitions.set(slot, definition);
      });
    }

    if (remoteSlots != null) {
      const slotNames = Array.isArray(remoteSlots)
        ? remoteSlots
        : Object.keys(remoteSlots);

      slotNames.forEach((slotName) => {
        remoteSlotDefinitions.set(slotName, {});
      });
    }

    if (remoteProperties != null) {
      if (Array.isArray(remoteProperties)) {
        remoteProperties.forEach((propertyName) => {
          saveRemoteProperty(
            propertyName,
            undefined,
            observedAttributes,
            remotePropertyDefinitions,
            attributeToPropertyMap,
          );
        });
      } else {
        Object.keys(remoteProperties).forEach((propertyName) => {
          saveRemoteProperty(
            propertyName,
            (remoteProperties as any)[propertyName],
            observedAttributes,
            remotePropertyDefinitions,
            attributeToPropertyMap,
          );
        });
      }
    }

    Object.defineProperties(this, {
      __observedAttributes: {
        value: observedAttributes,
        enumerable: false,
      },
      __remoteSlotDefinitions: {
        value: remoteSlotDefinitions,
        enumerable: false,
      },
      __remotePropertyDefinitions: {
        value: remotePropertyDefinitions,
        enumerable: false,
      },
      __attributeToPropertyMap: {
        value: attributeToPropertyMap,
        enumerable: false,
      },
    });

    return this;
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
    (this.constructor as typeof RemoteElement).finalize();

    const propertyDescriptors: PropertyDescriptorMap = {};

    propertyDescriptors[REMOTE_PROPERTIES] = {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    };

    for (const [property, description] of (
      this.constructor as typeof RemoteElement
    ).remotePropertyDefinitions.entries()) {
      const aliasedName = description.name;

      // Don’t override actual accessors. This is handled by the
      // `remoteProperty()` decorator applied to the accessor.
      // eslint-disable-next-line no-prototype-builtins
      if (Object.getPrototypeOf(this).hasOwnProperty(property)) {
        continue;
      }

      const propertyDescriptor = {
        configurable: true,
        enumerable: property === aliasedName,
        get: () => {
          return this[REMOTE_PROPERTIES][aliasedName];
        },
        set: (value: any) => {
          updateRemoteElementProperty(this, aliasedName, value);
        },
      };

      propertyDescriptors[property] = propertyDescriptor;
    }

    Object.defineProperties(this, propertyDescriptors);
  }

  attributeChangedCallback(key: string, _oldValue: any, newValue: any) {
    const {
      remotePropertyDefinitions,
      __attributeToPropertyMap: attributeToPropertyMap,
    } = this.constructor as typeof RemoteElement;

    const property = attributeToPropertyMap.get(key);

    const propertyDefinition =
      property == null ? property : remotePropertyDefinitions.get(property);

    if (propertyDefinition == null) return;

    (this as any)[property!] = convertAttributeValueToProperty(
      newValue,
      propertyDefinition.type,
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
  remotePropertyDefinitions: Map<
    string,
    NormalizedRemoteElementPropertyDefinition
  >,
  attributeToPropertyMap: Map<string, string>,
) {
  if (remotePropertyDefinitions.has(name)) {
    return remotePropertyDefinitions.get(name)!;
  }

  const {
    type = name[0] === 'o' && name[1] === 'n' ? Function : String,
    attribute = type !== Function,
    alias = type === Function ? [`_${name}`] : undefined,
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

  const definition: NormalizedRemoteElementPropertyDefinition = {
    name,
    type,
    alias,
    attribute: attributeName,
  };

  remotePropertyDefinitions.set(name, definition);

  if (alias) {
    for (const propertyAlias of alias) {
      remotePropertyDefinitions.set(propertyAlias, definition);
    }
  }

  return definition;
}

function convertAttributeValueToProperty<Value = unknown>(
  value: string | null,
  type: RemoteElementPropertyTypeOrBuiltIn<Value>,
) {
  if (value == null) return undefined;

  switch (type) {
    case Boolean:
      return value !== 'false';
    case Object:
    case Array:
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    case String:
      return String(value);
    case Number:
      return Number.parseFloat(value);
    case Function:
      return undefined;
    default: {
      return (type as RemoteElementPropertyType<Value>).parse?.(value);
    }
  }
}

function camelToKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
