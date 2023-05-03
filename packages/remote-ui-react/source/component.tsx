import type {RemoteElementConstructor} from '@lemonmade/remote-ui/elements';
import {createElement, isValidElement} from 'react';

import type {RemoteComponentType} from './types.ts';

export function createRemoteComponent<
  Properties extends Record<string, any>,
  Slots extends Record<string, any>,
>(
  {remoteProperties, remoteSlots}: RemoteElementConstructor<Properties, Slots>,
  {element}: {element: string},
): RemoteComponentType<Properties, Slots> {
  const propertyMap = new Map<string, string>();
  const allowedSlots = new Set(remoteSlots ? Object.keys(remoteSlots) : []);

  if (remoteProperties != null) {
    for (const property of Object.keys(remoteProperties)) {
      const descriptor = remoteProperties[property]!;

      // Alias callbacks to `_`-prefixed names so that they don’t
      // get converted into event listeners
      if (descriptor.callback) {
        propertyMap.set(property, `_${property}`);
      }
    }
  }

  const RemoteComponent: RemoteComponentType<Properties, Slots> =
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
