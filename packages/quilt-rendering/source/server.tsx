import type {ComponentType} from 'preact';
import type {AsyncComponentProps} from '@quilted/quilt/async';

import {DEFAULT_TAG_NAME} from './constants.ts';

export class AsyncComponentIslandsServerRenderer {
  #tagName: string;

  constructor({tagName = DEFAULT_TAG_NAME}: {tagName?: string} = {}) {
    this.#tagName = tagName;
  }

  render: AsyncComponentProps<unknown>['render'] = (
    element,
    {module, props},
  ) => {
    const Wrapper = this.#tagName as any as ComponentType<{
      module?: string;
      props?: string;
    }>;

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
