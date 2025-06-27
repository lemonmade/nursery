import {
  ROOT_ID,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
  type RemoteConnection,
  type RemoteMutationRecord,
} from '@remote-dom/core';
import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  setRemoteId,
} from '@remote-dom/core/elements';

/**
 * Builds on the browser’s [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
 * to detect changes in a remote element, and to communicate those changes in a way
 * that Remote DOM can understand. You create this object from a “remote
 * connection”, which you’ll generally get from the [`@remote-dom/core/receiver`](/packages/core#remote-domcorereceiver)
 * package. Then, you’ll observe changes in the HTML element that contains your
 * tree of remote elements.
 *
 * @example
 * import {RemoteMutationObserver} from '@remote-dom/core/elements';
 *
 * const observer = new RemoteMutationObserver(connection);
 *
 * // Now, any changes to the `body` element will be communicated
 * // to the host environment.
 * observer.observe(document.body);
 */
export class RemoteMutationObserver extends MutationObserver {
  readonly connection: RemoteConnection;
  readonly #id: string;
  readonly #observed = new Map<string, Node>();

  constructor(
    connection: RemoteConnection,
    {id = ROOT_ID}: {id?: string} = {},
  ) {
    super((records) => {
      const addedNodes: Node[] = [];
      const remoteRecords: RemoteMutationRecord[] = [];

      for (const record of records) {
        const targetId = remoteId(record.target);

        if (record.type === 'childList') {
          const position = record.previousSibling
            ? indexOf(record.previousSibling, record.target.childNodes) + 1
            : 0;

          record.removedNodes.forEach((node) => {
            disconnectRemoteNode(node);

            remoteRecords.push([
              MUTATION_TYPE_REMOVE_CHILD,
              targetId,
              position,
            ]);
          });

          // A mutation observer will queue some changes, so we might get one record
          // for attaching a parent element, and additional records for attaching descendants.
          // We serialize the entire tree when a new node was added, so we don’t want to
          // send additional “insert child” records when we see those descendants — they
          // will already be included the insertion of the parent.
          record.addedNodes.forEach((node, index) => {
            if (
              addedNodes.some((addedNode) => {
                return addedNode === node || addedNode.contains(node);
              })
            ) {
              return;
            }

            addedNodes.push(node);
            connectRemoteNode(node, connection);

            remoteRecords.push([
              MUTATION_TYPE_INSERT_CHILD,
              targetId,
              serializeRemoteNode(node),
              position + index,
            ]);
          });
        } else if (record.type === 'characterData') {
          remoteRecords.push([
            MUTATION_TYPE_UPDATE_TEXT,
            targetId,
            record.target.textContent ?? '',
          ]);
        } else if (
          record.type === 'attributes' &&
          record.attributeName != null &&
          record.target instanceof Element &&
          !record.target.tagName.includes('-')
        ) {
          remoteRecords.push([
            MUTATION_TYPE_UPDATE_PROPERTY,
            targetId,
            record.attributeName,
            (record.target as Element).getAttribute(record.attributeName),
          ]);
        }
      }

      connection.mutate(remoteRecords);
    });

    this.#id = id;
    this.connection = connection;
  }

  /**
   * Starts watching changes to the element, and communicates changes to the
   * host environment. By default, this method will also communicate any initial
   * children of the element to the host environment.
   */
  observe(
    target: Node,
    options?: MutationObserverInit & {
      /**
       * A custom remote ID to use for the newly-observed element. If no
       * ID is provided, the element will be assigned the default ID for this
       * observer, which defaults to `@remote-dom/core`’s `ROOT_ID`.
       */
      id?: string;

      /**
       * Whether to send the initial state of the tree to the mutation
       * callback.
       *
       * @default true
       */
      initial?: boolean;
    },
  ) {
    const id = options?.id ?? this.#id;
    setRemoteId(target, id);

    // TODO: handle existing node with this ID
    this.#observed.set(id, target);

    if (options?.initial !== false) {
      if (id !== this.#id) {
        this.connection.mutate([
          [
            MUTATION_TYPE_INSERT_CHILD,
            this.#id,
            serializeRemoteNode(target),
            this.#observed.size - 1,
          ],
        ]);
      } else if (target.childNodes.length > 0) {
        const records: RemoteMutationRecord[] = [];

        for (let i = 0; i < target.childNodes.length; i++) {
          const node = target.childNodes[i]!;
          connectRemoteNode(node, this.connection);

          records.push([
            MUTATION_TYPE_INSERT_CHILD,
            id,
            serializeRemoteNode(node),
            i,
          ]);
        }

        this.connection.mutate(records);
      }
    }

    super.observe(target, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      ...options,
    });
  }

  disconnect({empty = true}: {empty?: boolean} = {}) {
    super.disconnect();

    if (empty && this.#observed) {
      const records: RemoteMutationRecord[] = [];

      for (const node of this.#observed.values()) {
        disconnectRemoteNode(node);
        records.push([MUTATION_TYPE_REMOVE_CHILD, this.#id, 0]);
      }

      this.connection.mutate(records);
    }
  }
}

function indexOf(node: Node, list: NodeList) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === node) return i;
  }

  return -1;
}
