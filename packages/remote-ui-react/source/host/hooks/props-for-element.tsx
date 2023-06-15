import type {RemoteElementReceived} from '@lemonmade/remote-ui';

import {renderRemoteNode, type RenderRemoteNodeOptions} from '../node.tsx';

export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(element: RemoteElementReceived, options: RenderRemoteNodeOptions): Props;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteElementReceived | undefined,
  options: RenderRemoteNodeOptions,
): Props | undefined;
export function usePropsForRemoteElement<
  Props extends Record<string, any> = {},
>(
  element: RemoteElementReceived | undefined,
  options: RenderRemoteNodeOptions,
): Props | undefined {
  if (!element) return undefined;

  const {children, properties} = element;
  const reactChildren: ReturnType<typeof renderRemoteNode>[] = [];
  const slotProperties: Record<string, any> = {...properties};

  for (const child of children) {
    if (child.type === 1 && typeof child.properties.slot === 'string') {
      const slot = child.properties.slot;
      const rendered = renderRemoteNode(child, options);
      slotProperties[slot] = slotProperties[slot] ? (
        <>
          {slotProperties[slot]}
          {rendered}
        </>
      ) : (
        rendered
      );
    } else {
      reactChildren.push(renderRemoteNode(child, options));
    }
  }

  return {
    ...properties,
    ...slotProperties,
    children: reactChildren,
  } as unknown as Props;
}
