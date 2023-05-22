import {useRef, useLayoutEffect, createElement, isValidElement} from 'react';
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
      const ref = useRef<any>();
      const lastRemotePropertiesRef = useRef<Record<string, any>>();

      const updatedProps: Record<string, any> = {ref};
      const remoteProperties: Record<string, any> = {};
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

        if (definition) {
          remoteProperties[prop] = propValue;
        } else {
          updatedProps[prop] = propValue;
        }
      }

      useLayoutEffect(() => {
        if (ref.current == null) return;

        const propsToUpdate =
          lastRemotePropertiesRef.current ?? remoteProperties;

        for (const prop in propsToUpdate) {
          ref.current[prop] = remoteProperties[prop];
        }

        lastRemotePropertiesRef.current = remoteProperties;
      });

      return createElement(tag, updatedProps, ...children);
    };

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return [...value];
  return [value];
}
