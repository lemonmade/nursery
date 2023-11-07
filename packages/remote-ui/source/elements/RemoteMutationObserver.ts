import {
  remoteId,
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
} from './internals.ts';
import {
  ROOT_ID,
  REMOTE_ID,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
} from '../constants.ts';
import type {RemoteMutationCallback, RemoteMutationRecord} from '../types.ts';

export class RemoteMutationObserver extends MutationObserver {
  constructor(private readonly callback: RemoteMutationCallback) {
    super((records) => {
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

          record.addedNodes.forEach((node, index) => {
            connectRemoteNode(node, callback);

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
        }
      }

      callback(remoteRecords);
    });
  }

  observe(
    target: Node,
    options?: MutationObserverInit & {
      /**
       * Whether to send the initial state of the tree to the mutation
       * callback.
       *
       * @default true
       */
      initial?: boolean;
    },
  ) {
    Object.defineProperty(target, REMOTE_ID, {value: ROOT_ID});

    if (options?.initial !== false) {
      this.callback(
        Array.from(
          target.childNodes,
          (node, index) =>
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              serializeRemoteNode(node),
              index,
            ] satisfies RemoteMutationRecord,
        ),
      );
    }

    super.observe(target, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: true,
      ...options,
    });
  }
}

function indexOf(node: Node, list: NodeList) {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === node) return i;
  }

  return -1;
}
