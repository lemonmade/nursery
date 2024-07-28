import {render, hydrate, type VNode, type ComponentChild} from 'preact';
import {Suspense} from 'preact/compat';

import type {AsyncComponentType} from '@quilted/quilt/async';

import {DEFAULT_TAG_NAME} from './constants.ts';

export {
  MultiPageAppRouter,
  MultiPageAppNavigation,
} from './browser/MultiPageNavigation.tsx';

export interface AsyncComponentRegistration<Props> {
  readonly AsyncComponent: AsyncComponentType<Props>;
  render?(vnode: VNode<Props>): ComponentChild;
}

const ASYNC_COMPONENT_MAP = new Map<string, AsyncComponentRegistration<any>>();

export class AsyncComponentIslandElement<Props = unknown> extends HTMLElement {
  static define(tagName: string = DEFAULT_TAG_NAME) {
    customElements.define(tagName, AsyncComponentIslandElement);
  }

  static registerComponent = registerAsyncComponent;
  static registerComponents = registerAsyncComponents;

  static get observedAttributes() {
    return ['module'];
  }

  get component() {
    return this.#component;
  }

  #component: AsyncComponentType<Props> | undefined;
  #channel = new MessageChannel();
  #enqueuedRender: (() => void) | undefined;

  attributeChangedCallback() {
    this.#enqueueRender();
  }

  #enqueueRender() {
    if (this.#enqueuedRender) return;

    this.#enqueuedRender = async () => {
      console.log(this.getAttribute('module'));

      const OldAsyncComponent = this.#component;
      const registration = ASYNC_COMPONENT_MAP.get(
        this.getAttribute('module')!,
      );
      const AsyncComponent = registration?.AsyncComponent;

      if (AsyncComponent === OldAsyncComponent) return;

      this.#component = AsyncComponent as any as AsyncComponentType<Props>;

      if (AsyncComponent == null) return;

      const props = JSON.parse(this.getAttribute('props') || '{}');

      const element = registration?.render ? (
        registration.render(<AsyncComponent {...props} />)
      ) : (
        <Suspense fallback={null}>
          <AsyncComponent {...props} />
        </Suspense>
      );

      if (OldAsyncComponent) {
        this.innerHTML = '';
        this.dispatchEvent(new CustomEvent('render'));
        render(element, this);
      } else {
        this.dispatchEvent(new CustomEvent('hydrate'));
        hydrate(element, this);
      }

      this.#enqueuedRender = undefined;
    };

    this.#channel.port1.onmessage = this.#enqueuedRender;
    this.#channel.port2.postMessage(null);
  }
}

export function registerAsyncComponent<Props = unknown>(
  AsyncComponent: AsyncComponentType<Props>,
  options: Omit<AsyncComponentRegistration<Props>, 'AsyncComponent'> = {},
) {
  ASYNC_COMPONENT_MAP.set(AsyncComponent.module.id!, {
    AsyncComponent,
    ...options,
  });
}

export function registerAsyncComponents<Props = unknown>(
  AsyncComponents: readonly AsyncComponentType<Props>[],
  options?: Omit<AsyncComponentRegistration<Props>, 'AsyncComponent'>,
) {
  for (const AsyncComponent of AsyncComponents) {
    registerAsyncComponent(AsyncComponent, options);
  }
}
