import type {ComponentType} from 'preact';
import {AsyncComponent, type AsyncComponentProps} from '@quilted/quilt/async';

import {DEFAULT_TAG_NAME} from './constants.ts';

export class AsyncComponentIslandServerRenderer {
  #tagName: string;

  constructor({tagName = DEFAULT_TAG_NAME}: {tagName?: string} = {}) {
    this.#tagName = tagName;
  }

  render: AsyncComponentProps<any>['render'] = (element, asyncProps) => {
    const Wrapper = this.#tagName as any as ComponentType<{
      module?: string;
      props?: string;
    }>;

    const {module, props} = asyncProps;

    if (typeof document === 'undefined') AsyncComponent.useAssets(asyncProps);

    return (
      <Wrapper
        module={module.id}
        props={props ? JSON.stringify(props) : undefined}
      >
        {element}
      </Wrapper>
    );
  };
}
