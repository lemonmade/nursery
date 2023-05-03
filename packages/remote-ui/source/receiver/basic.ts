import {
  createRemoteMutationCallback,
  type RemoteMutationCallback,
} from '../callback.ts';
import {NODE_TYPE_ELEMENT, NODE_TYPE_ROOT, ROOT_ID} from '../constants.ts';
import type {
  RemoteTextSerialization,
  RemoteElementSerialization,
} from '../types.ts';
import {ReceiverOptions} from './shared.ts';

export interface RemoteTextReceived extends RemoteTextSerialization {
  readonly version: number;
}

export interface RemoteElementReceived
  extends Omit<RemoteElementSerialization, 'children' | 'properties'> {
  readonly properties: NonNullable<RemoteElementSerialization['properties']>;
  readonly children: readonly RemoteChildReceived[];
  readonly version: number;
}

export interface RemoteRootReceived {
  readonly id: typeof ROOT_ID;
  readonly kind: typeof NODE_TYPE_ROOT;
  readonly children: readonly RemoteChildReceived[];
  readonly version: number;
}

export type RemoteChildReceived = RemoteTextReceived | RemoteElementReceived;
export type RemoteNodeReceived = RemoteChildReceived | RemoteRootReceived;
export type RemoteParentReceived = RemoteElementReceived | RemoteRootReceived;

type Writable<T> = {
  -readonly [P in keyof T]: T[P];
};

export class RemoteReceiver {
  readonly root: RemoteRootReceived = {
    id: ROOT_ID,
    kind: NODE_TYPE_ROOT,
    children: [],
    version: 0,
  };

  private readonly attached = new Map<
    string | typeof ROOT_ID,
    RemoteNodeReceived
  >([[ROOT_ID, this.root]]);

  private readonly subscribers = new Map<
    string | typeof ROOT_ID,
    Set<(value: RemoteNodeReceived) => void>
  >();

  private readonly parents = new Map<string, string | typeof ROOT_ID>();

  readonly receive: RemoteMutationCallback;

  constructor({retain, release}: ReceiverOptions = {}) {
    const {attached, subscribers} = this;

    this.receive = createRemoteMutationCallback({
      insertChild: (id, child, index) => {
        const parent = attached.get(id) as Writable<RemoteParentReceived>;

        const {children} = parent;

        const normalizedChild = normalizeNode(child, addVersion);

        retain?.(normalizedChild);
        attach(normalizedChild);

        if (index === children.length) {
          (children as Writable<typeof children>).push(normalizedChild);
        } else {
          (children as Writable<typeof children>).splice(
            index,
            0,
            normalizedChild,
          );
        }

        parent.version += 1;
        this.parents.set(child.id, parent.id);

        runSubscribers(parent);
      },
      removeChild: (id, index) => {
        const parent = attached.get(id) as Writable<RemoteParentReceived>;

        const {children} = parent;

        const [removed] = (children as Writable<typeof children>).splice(
          index,
          1,
        );
        parent.version += 1;
        this.parents.delete(removed!.id);

        detach(removed!);
        runSubscribers(parent);

        release?.(removed);
      },
      updateProperty: (id, property, value) => {
        const element = attached.get(id) as Writable<RemoteElementReceived>;

        retain?.(value);

        const oldValue = element.properties[property];

        element.properties[property] = value;
        element.version += 1;

        let parentForUpdate: Writable<RemoteParentReceived> | undefined;

        // If the slot changes, inform parent nodes so they can
        // re-parent it appropriately.
        if (property === 'slot') {
          const parentId = this.parents.get(id);

          parentForUpdate =
            parentId == null
              ? parentId
              : (attached.get(parentId) as Writable<RemoteParentReceived>);

          if (parentForUpdate) {
            parentForUpdate.version += 1;
          }
        }

        runSubscribers(element);
        if (parentForUpdate) runSubscribers(parentForUpdate);

        release?.(oldValue);
      },
      updateText: (id, newText) => {
        const text = attached.get(id) as Writable<RemoteTextReceived>;

        text.data = newText;
        text.version += 1;

        runSubscribers(text);
      },
    });

    function runSubscribers(attached: RemoteNodeReceived) {
      const subscribed = subscribers.get(attached.id);

      if (subscribed) {
        for (const subscriber of subscribed) {
          subscriber(attached);
        }
      }
    }

    function attach(child: RemoteChildReceived) {
      attached.set(child.id, child);

      if ('children' in child) {
        for (const grandChild of child.children) {
          attach(grandChild);
        }
      }
    }

    function detach(child: RemoteChildReceived) {
      attached.delete(child.id);

      if ('children' in child) {
        for (const grandChild of child.children) {
          detach(grandChild);
        }
      }
    }
  }

  get<T extends RemoteNodeReceived>({id}: Pick<T, 'id'>): T | undefined {
    return this.attached.get(id) as any;
  }

  subscribe<T extends RemoteNodeReceived>(
    {id}: T,
    subscriber: (value: T) => void,
    {signal}: {signal?: AbortSignal} = {},
  ) {
    let subscribersSet = this.subscribers.get(id);

    if (subscribersSet == null) {
      subscribersSet = new Set();
      this.subscribers.set(id, subscribersSet);
    }

    subscribersSet.add(subscriber as any);

    signal?.addEventListener('abort', () => {
      subscribersSet!.delete(subscriber as any);

      if (subscribersSet!.size === 0) {
        this.subscribers.delete(id);
      }
    });
  }
}

function addVersion<T>(
  value: T,
): T extends RemoteTextSerialization
  ? RemoteTextReceived
  : T extends RemoteElementSerialization
  ? RemoteElementReceived
  : never {
  (value as any).version = 0;
  return value as any;
}

function normalizeNode<
  T extends RemoteTextSerialization | RemoteElementSerialization,
  R,
>(node: T, normalizer: (node: T) => R) {
  if (node.type === NODE_TYPE_ELEMENT) {
    (node as any).properties ??= {};
    (node as any).children.forEach((child: T) =>
      normalizeNode(child, normalizer),
    );
  }
  return normalizer(node);
}
