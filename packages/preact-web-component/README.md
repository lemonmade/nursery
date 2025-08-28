# `@lemonmade/preact-web-component`

## Basic usage

```tsx
import {PreactWebComponent} from '@lemonmade/preact-web-component';

class MyElement extends PreactWebComponent {
  static observedAttributes = ['name'];
  static component = ({attributes}) => (
    <div>Hello, {attributes.get('name')}!</div>
  );

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

customElements.define('my-element', MyElement);

// Shorthand, if you don’t need a dedicated subclass:

const MyElement = PreactWebComponent.from(
  ({attributes}) => <div>Hello, {attributes.get('name')}!</div>,
  {
    define: 'my-element',
    attributes: ['name'],
  },
);

// Common pattern: passthrough all attributes:

class MyElement extends PreactWebComponent {
  static observedAttributes = ['firstName', 'lastName'];
  static component = ({attributes}) => <Greeting {...attributes.value} />;
}

customElements.define('my-element', MyElement);
```
