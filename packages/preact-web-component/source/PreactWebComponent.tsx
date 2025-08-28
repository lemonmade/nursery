import {signal} from '@preact/signals';
import {render, createRef, type ComponentType} from 'preact';

export interface PreactWebComponentProps {
  element: PreactWebComponent;
  attributes: PreactWebComponentAttributes;
  context?: Record<string, unknown>;
}

export type PreactWebComponentType = ComponentType<PreactWebComponentProps>;

export class PreactWebComponent extends HTMLElement {
  static from<Instance = {}>(
    PreactComponent: ComponentType<PreactWebComponentProps>,
    {
      define,
      instance,
      attributes,
    }: {define?: string; instance?: Instance; attributes?: string[]} = {},
  ): Omit<typeof PreactWebComponent, 'new'> & {
    new (): PreactWebComponent & Instance;
  } {
    const WebComponent = class extends PreactWebComponent {
      static component = PreactComponent;
      static observedAttributes = attributes;

      constructor() {
        super();

        if (instance) {
          Object.defineProperties(
            this,
            Object.getOwnPropertyDescriptors(instance),
          );
        }
      }
    };

    if (define) {
      customElements.define(define, WebComponent);
    }

    return WebComponent as any;
  }

  static instance<Instance = {}>(instance: any): PreactWebComponent & Instance {
    if (!(instance instanceof PreactWebComponent)) {
      throw new Error('Instance is not a PreactWebComponent');
    }

    return instance as any;
  }

  readonly #preactRef = createRef<any>();
  readonly #preactAttributes = new PreactWebComponentAttributes();

  get #preactComponent(): PreactWebComponentType {
    return (
      (this as any).component ??
      (this as any).constructor.component ??
      DefaultComponent
    );
  }

  connectedCallback() {
    const PreactComponent = this.#preactComponent;

    render(
      <PreactComponent
        ref={this.#preactRef}
        element={this}
        attributes={this.#preactAttributes}
        // TODO
        context={undefined}
      />,
      this,
    );
  }

  disconnectedCallback() {
    render(null, this);
  }

  attributeChangedCallback(
    ...args: Parameters<PreactWebComponentAttributes['changedCallback']>
  ) {
    this.#preactAttributes.changedCallback(...args);
  }
}

function DefaultComponent() {
  return null;
}

export class PreactWebComponentAttributes {
  #signal = signal<Record<string, string>>({});

  get(name: string) {
    return this.#signal.value[name];
  }

  get value() {
    return this.#signal.value;
  }

  changedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ) {
    if (newValue === null) {
      this.#signal.value = {
        ...this.#signal.value,
      };
      delete this.#signal.value[name];
    } else {
      this.#signal.value = {
        ...this.#signal.value,
        [name]: newValue,
      };
    }
  }
}

const MyElement = PreactWebComponent.from(
  // ({attributes}) => <div>Hello, {computed(() => attributes.value.name)}!</div>,
  // ({attributes}) => <div>Hello, {attributes.value.name}!</div>,
  ({attributes}) => <div>Hello, {attributes.get('name')}!</div>,
  {
    define: 'my-element',
    attributes: ['name'],
    instance: {
      get name(): string {
        return PreactWebComponent.instance(this).getAttribute('name') ?? '';
      },
      set name(value: string | undefined) {
        if (value) {
          PreactWebComponent.instance(this).setAttribute('name', value);
        } else {
          PreactWebComponent.instance(this).removeAttribute('name');
        }
      },
    },
  },
);

class AltMyElement extends PreactWebComponent {
  static component: PreactWebComponentType = ({attributes}) => (
    <div>Hello, {attributes.get('name')}!</div>
  );

  static observedAttributes = ['name'];

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string | undefined) {
    if (value) {
      this.setAttribute('name', value);
    } else {
      this.removeAttribute('name');
    }
  }
}

customElements.define('alt-my-element', AltMyElement);

declare global {
  interface HTMLElementTagNameMap {
    'my-element': InstanceType<typeof MyElement>;
  }
}

const element = document.createElement('my-element');
element.name = 'Chris';
document.body.append(element);
