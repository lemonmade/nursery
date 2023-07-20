import {signal, type ReadonlySignal} from '@preact/signals-core';

import {
  ROOT_ID,
  NODE_TYPE_ROOT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_TEXT,
  createRemoteMutationCallback,
  type RemoteMutationCallback,
  type RemoteReceiver,
  type RemoteNodeSerialization,
  type RemoteTextSerialization,
  type RemoteCommentSerialization,
  type RemoteElementSerialization,
} from '@lemonmade/remote-ui';

export interface SignalRemoteTextReceived
  extends Omit<RemoteTextSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteTextSerialization['data']>;
}

export interface SignalRemoteCommentReceived
  extends Omit<RemoteCommentSerialization, 'data'> {
  readonly data: ReadonlySignal<RemoteCommentSerialization['data']>;
}

export interface SignalRemoteElementReceived
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: ReadonlySignal<
    NonNullable<RemoteElementSerialization['properties']>
  >;
  readonly children: ReadonlySignal<readonly SignalRemoteChildReceived[]>;
}

export interface SignalRemoteRootReceived {
  readonly id: typeof ROOT_ID;
  readonly type: typeof NODE_TYPE_ROOT;
  readonly children: ReadonlySignal<readonly SignalRemoteChildReceived[]>;
}

export type SignalRemoteChildReceived =
  | SignalRemoteTextReceived
  | SignalRemoteCommentReceived
  | SignalRemoteElementReceived;
export type SignalRemoteNodeReceived =
  | SignalRemoteChildReceived
  | SignalRemoteRootReceived;
export type SignalRemoteParentReceived =
  | SignalRemoteElementReceived
  | SignalRemoteRootReceived;

export class SignalRemoteReceiver {
  readonly root: SignalRemoteRootReceived = {
    id: ROOT_ID,
    type: NODE_TYPE_ROOT,
    children: signal([]),
  };

  private readonly attached = new Map<
    string | typeof ROOT_ID,
    SignalRemoteNodeReceived
  >([[ROOT_ID, this.root]]);

  private readonly parents = new Map<string, string | typeof ROOT_ID>();

  readonly receive: RemoteMutationCallback;

  constructor({
    retain,
    release,
  }: ConstructorParameters<typeof RemoteReceiver>[0] = {}) {
    const {attached, parents} = this;

    this.receive = createRemoteMutationCallback({
      insertChild: (id, child, index) => {
        const parent = attached.get(id) as SignalRemoteParentReceived;
        const newChildren = [...parent.children.peek()];

        const normalizedChild = attach(child, parent);

        if (index === newChildren.length) {
          newChildren.push(normalizedChild);
        } else {
          newChildren.splice(index, 0, normalizedChild);
        }

        (parent.children as any).value = newChildren;
      },
      removeChild: (id, index) => {
        const parent = attached.get(id) as SignalRemoteParentReceived;

        const newChildren = [...parent.children.peek()];

        const [removed] = newChildren.splice(index, 1);
        detach(removed!);

        (parent.children as any).value = newChildren;

        release?.(removed);
      },
      updateProperty: (id, property, value) => {
        const element = attached.get(id) as SignalRemoteElementReceived;
        const oldProperties = element.properties.peek();
        const oldValue = oldProperties[property];

        if (Object.is(oldValue, value)) return;

        retain?.(value);

        const newProperties = {...oldProperties};
        newProperties[property] = value;
        (element.properties as any).value = newProperties;

        // If the slot changes, inform parent nodes so they can
        // re-parent it appropriately.
        if (property === 'slot') {
          const parentId = this.parents.get(id);

          const parent =
            parentId == null
              ? parentId
              : (attached.get(parentId) as SignalRemoteParentReceived);

          if (parent) {
            (parent.children as any).value = [...parent.children.peek()];
          }
        }

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id) as SignalRemoteTextReceived;
        (text.data as any).value = newText;
      },
    });

    function attach(
      child: RemoteNodeSerialization,
      parent: SignalRemoteParentReceived,
    ): SignalRemoteChildReceived {
      let normalizedChild: SignalRemoteChildReceived;

      switch (child.type) {
        case NODE_TYPE_TEXT:
        case NODE_TYPE_COMMENT: {
          const {id, type, data} = child;

          normalizedChild = {
            id,
            type,
            data: signal(data),
          } satisfies SignalRemoteTextReceived | SignalRemoteCommentReceived;

          break;
        }
        case NODE_TYPE_ELEMENT: {
          const {id, type, element, children, properties} = child;
          retain?.(properties);

          const resolvedChildren: SignalRemoteNodeReceived[] = [];

          normalizedChild = {
            id,
            type,
            element,
            children: signal(
              resolvedChildren as readonly SignalRemoteChildReceived[],
            ),
            properties: signal(properties ?? {}),
          } satisfies SignalRemoteElementReceived;

          for (const grandChild of children) {
            resolvedChildren.push(attach(grandChild, normalizedChild));
          }

          break;
        }
        default: {
          // @ts-expect-error We should never get here
          throw new Error(`Unknown node type: ${child.type}`);
        }
      }

      attached.set(normalizedChild.id, normalizedChild);
      parents.set(normalizedChild.id, parent.id);

      return normalizedChild;
    }

    function detach(child: SignalRemoteChildReceived) {
      attached.delete(child.id);
      parents.delete(child.id);

      if ('children' in child) {
        for (const grandChild of child.children.peek()) {
          detach(grandChild);
        }
      }
    }
  }

  get<T extends SignalRemoteNodeReceived>({id}: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }
}
