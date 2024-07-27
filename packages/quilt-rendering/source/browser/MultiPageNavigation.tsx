import type {RenderableProps} from 'preact';
import {useMemo} from 'preact/hooks';

import {resolveURL} from '@quilted/routing';
import {RouterContext, type Router} from '@quilted/quilt/navigation';

export class MultiPageAppRouter
  implements
    Pick<
      Router,
      | 'base'
      | 'currentRequest'
      | 'resolve'
      | 'navigate'
      | 'go'
      | 'back'
      | 'forward'
      | 'cache'
    >
{
  base: Router['base'] = '/';
  currentRequest: Router['currentRequest'] = {
    id: '',
    state: {},
    url: new URL(window.location.href),
  };
  cache: Router['cache'] = undefined;

  resolve: Router['resolve'] = (to) => {
    const url = resolveURL(to, this.currentRequest.url, this.base);
    return {url, external: true};
  };

  navigate: Router['navigate'] = (to, {replace} = {}) => {
    const url = resolveURL(to, this.currentRequest.url, this.base);

    if (replace) {
      window.location.replace(url.href);
    } else {
      window.location.assign(url.href);
    }

    return {
      id: '',
      state: {},
      url,
    };
  };

  go(delta: number) {
    window.history.go(delta);
  }

  back(count = -1) {
    this.go(count < 0 ? count : -count);
  }

  forward(count = 1) {
    this.go(count);
  }
}

export function MultiPageAppNavigation({
  router: explicitRouter,
  children,
}: RenderableProps<{
  router?: MultiPageAppRouter;
}>) {
  const router = useMemo(
    () => explicitRouter ?? new MultiPageAppRouter(),
    [explicitRouter],
  );

  return (
    <RouterContext.Provider value={router as Router}>
      {children}
    </RouterContext.Provider>
  );
}
