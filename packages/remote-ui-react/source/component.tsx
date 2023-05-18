import {createElement, isValidElement} from 'react';
import type {
  RemoteElement,
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@lemonmade/remote-ui/elements';

import type {
  RemoteComponentType,
  RemoteComponentTypeFromElementConstructor,
} from './types.ts';

export function createRemoteComponent<
  Tag extends keyof HTMLElementTagNameMap,
  ElementConstructor extends RemoteElementConstructor<
    any,
    any
  > = HTMLElementTagNameMap[Tag] extends RemoteElement<
    infer Properties,
    infer Slots
  >
    ? RemoteElementConstructor<Properties, Slots>
    : never,
>(
  tag: Tag,
  Element: ElementConstructor | undefined = customElements.get(tag) as any,
): RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> {
  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    function RemoteComponent(props) {
      const updatedProps: Record<string, any> = {};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (
          Element.remoteSlotDefinitions.has(prop) &&
          isValidElement(propValue)
        ) {
          children.push(
            createElement('remote-fragment', {slot: prop}, propValue),
          );
          continue;
        }

        const definition = Element.remotePropertyDefinitions.get(prop);
        const aliasTo =
          definition && definition.type === Function
            ? definition.alias?.[0]
            : undefined;
        updatedProps[aliasTo ?? prop] = propValue;
      }

      return createElement(tag, updatedProps, ...children);
    };

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
