import '../polyfill.ts';
import {html, type PropertiesWithChildren} from '../html.ts';

class Button extends HTMLElement {
  emphasized = false;
}

customElements.define('ui-button', Button);

describe('html', () => {
  it('renders a text node', () => {
    const text = html<Text>`Hello world!`;

    expect(text).toBeInstanceOf(Text);
    expect(text.textContent).toBe('Hello world!');
  });

  it('renders an element', () => {
    const element = html<Button>`<ui-button>Press me!</ui-button>`;

    expect(element).toBeInstanceOf(Button);
    expect(element.localName).toBe('ui-button');
    expect(element.textContent).toBe('Press me!');
  });

  it('renders an element with attributes', () => {
    const element = html<Button>`
      <ui-button data-id="123">Press me!</ui-button>
    `;

    expect(element.getAttribute('data-id')).toBe('123');
  });

  it('renders an element with boolean attributes', () => {
    const element = html<Button>`<ui-button active>Press me!</ui-button>`;

    expect(element.getAttribute('active')).toBe('');
  });

  it('renders an element with properties', () => {
    const element = html<Button>`<ui-button emphasized>Press me!</ui-button>`;
    expect(element.emphasized).toBe(true);
  });

  it('renders multiple children', () => {
    const children = html<[Text, Button]>`${'My button: '}
      <ui-button>Press me!</ui-button>`;

    expect(children).toStrictEqual(
      expect.arrayContaining([expect.any(Text), expect.any(Button)]),
    );
    expect(children[0].textContent).toBe('My button: ');
    expect(children[1].localName).toBe('ui-button');
    expect(children[1].textContent).toBe('Press me!');
  });

  it('can embed existing DOM nodes', () => {
    const text = html`Click me!`;
    const icon = html`<ui-icon slot="icon" name="check" />`;
    const button = html<Button>`<ui-button>${text}${icon}</ui-button>`;

    expect(button.localName).toBe('ui-button');
    expect(button.childNodes).toStrictEqual([text, icon]);
  });

  it('converts numbers passed as children into text nodes', () => {
    const button = html<Button>`<ui-button>Clicked ${0} times</ui-button>`;

    expect(button.outerHTML).toBe('<ui-button>Clicked 0 times</ui-button>');
    expect(button.childNodes).toStrictEqual([
      expect.any(Text),
      expect.any(Text),
      expect.any(Text),
    ]);
    expect(button.childNodes[1]!.textContent).toBe('0');
  });

  it('ignores falsy children', () => {
    const button = html<Button>`
      <ui-button>${false}${null}${undefined}Click me!<//>
    `;

    expect(button.outerHTML).toBe('<ui-button>Click me!</ui-button>');
    expect(button.childNodes).toStrictEqual([expect.any(Text)]);
  });

  describe('components', () => {
    it('returns the result of calling a component', () => {
      function MyButton({children}: PropertiesWithChildren) {
        return html<Button>`<ui-button>${children}</ui-button>`;
      }

      const button = html<Button>`<${MyButton}>Press me!<//>`;

      expect(button).toBeInstanceOf(Button);
      expect(button.localName).toBe('ui-button');
      expect(button.textContent).toBe('Press me!');
    });

    it('flattens top-level components returning multiple children', () => {
      function Description({
        term,
        definition,
      }: {
        term: string;
        definition: string;
      }) {
        return html`
          <dt>${term}</dt>
          <dd>${definition}</dd>
        `;
      }

      const descriptions = html<Element[]>`
        <${Description} term="Shovel" definition="A tool for digging" />
        <${Description} term="Rake" definition="A tool for cleaning up" />
      `;

      expect(descriptions).toStrictEqual([
        expect.any(Element),
        expect.any(Element),
        expect.any(Element),
        expect.any(Element),
      ]);
    });

    it('omits components that return falsy results', () => {
      function Empty() {
        return null;
      }

      const nothing = html<null>`<${Empty} /><${Empty} />`;

      expect(nothing).toBeNull();
    });
  });
});
