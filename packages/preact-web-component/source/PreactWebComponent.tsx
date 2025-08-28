import {signal} from '@preact/signals';
import {render, createRef, type ComponentType} from 'preact';

export interface PreactWebComponentProps {
  element: PreactWebComponent;
  attributes: PreactWebComponentAttributes;
  context?: Record<string, unknown>;
}

export type PreactWebComponentType = ComponentType<PreactWebComponentProps>;

export class PreactWebComponent extends HTMLElement {
  static from(
    PreactComponent: ComponentType<PreactWebComponentProps>,
    {define, attributes}: {define?: string; attributes?: string[]} = {},
  ) {
    const WebComponent = class extends PreactWebComponent {
      static component = PreactComponent;
      static observedAttributes = attributes;
    };

    if (define) {
      customElements.define(define, WebComponent);
    }

    return WebComponent;
  }

  readonly preactRef = createRef<any>();
  readonly preactAttributes = new PreactWebComponentAttributes();

  get preactComponent(): PreactWebComponentType {
    return (
      (this as any).component ??
      (this as any).constructor.component ??
      DefaultComponent
    );
  }

  connectedCallback() {
    const PreactComponent = this.preactComponent;

    render(
      <PreactComponent
        ref={this.preactRef}
        element={this}
        attributes={this.preactAttributes}
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
    this.preactAttributes.changedCallback(...args);
  }
}

function DefaultComponent() {
  return null;
}

export class PreactWebComponentAttributes {
  #signal = signal<Record<string, string>>({});

  get value() {
    return this.#signal.value;
  }

  get(name: string) {
    return this.#signal.value[name];
  }

  getAll() {
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
  },
);

class MyElementWithProperties extends PreactWebComponent {
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

customElements.define('alt-my-element', MyElementWithProperties);

declare global {
  interface HTMLElementTagNameMap {
    'my-element': InstanceType<typeof MyElement>;
    'alt-my-element': InstanceType<typeof MyElementWithProperties>;
  }
}

const element = document.createElement('alt-my-element');
element.name = 'Chris';
document.body.append(element);
