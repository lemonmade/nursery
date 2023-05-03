import {renderRemoteNode} from './node.tsx';
import {useRemoteReceived} from './hooks.ts';
import type {RemoteComponentRendererProps} from './component.tsx';

export function RemoteFragmentRenderer({
  remote,
  receiver,
  components,
}: RemoteComponentRendererProps) {
  const component = useRemoteReceived(remote, receiver);

  if (!component) return null;

  const renderOptions = {receiver, components};

  return (
    <>
      {component.children.map((child) =>
        renderRemoteNode(child, renderOptions),
      )}
    </>
  );
}
