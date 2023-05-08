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
  {remoteSlots, remotePropertyDefinitions}: ElementConstructor,
  {element}: {element: string},
): RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> {
  const propertyMap = new Map<string, string>();
  const allowedSlots = new Set(remoteSlots ? Object.keys(remoteSlots) : []);

  if (remotePropertyDefinitions != null) {
    for (const [property, definition] of remotePropertyDefinitions.entries()) {
      // Alias callbacks to `_`-prefixed names so that they don’t
      // get converted into event listeners
      if (definition.type === Function) {
        propertyMap.set(property, `_${property}`);
      }
    }
  }

  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    propertyMap.size > 0 || allowedSlots.size > 0
      ? function RemoteComponent(props) {
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

            const propertyAlias = propertyMap.get(prop);

            if (propertyAlias) {
              updatedProps[propertyAlias] = propValue;
            } else {
              updatedProps[prop] = propValue;
            }
          }

          return createElement(element, updatedProps, ...children);
        }
      : function RemoteComponent(props) {
          return createElement(element, props);
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
