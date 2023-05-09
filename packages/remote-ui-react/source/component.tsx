import {createElement, isValidElement} from 'react';
import type {
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@lemonmade/remote-ui/elements';

import type {
  RemoteComponentType,
  RemoteComponentTypeFromElementConstructor,
} from './types.ts';

export function createRemoteComponent<
  ElementConstructor extends RemoteElementConstructor<any, any>,
>(
  ElementType: ElementConstructor,
  {element}: {element: string},
): RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> {
  const allowedSlots = new Set(
    ElementType.remoteSlots ? Object.keys(ElementType.remoteSlots) : [],
  );

  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    function RemoteComponent(props) {
      const updatedProps: Record<string, any> = {};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (allowedSlots.has(prop) && isValidElement(propValue)) {
          children.push(
            createElement('remote-fragment', {slot: prop}, propValue),
          );
          continue;
        }

        const definition = ElementType.remotePropertyDefinitions?.get(prop);
        const aliasTo =
          definition && definition.type === Function
            ? definition.alias?.[0]
            : undefined;
        updatedProps[aliasTo ?? prop] = propValue;
      }

      return createElement(element, updatedProps, ...children);
    };

  RemoteComponent.displayName = `RemoteComponent(${element})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
