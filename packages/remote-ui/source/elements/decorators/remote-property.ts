import type {
  RemoteElement,
  RemoteElementPropertyDefinition,
} from '../RemoteElement.ts';

export function remoteProperty<Value = unknown>(
  definition?: RemoteElementPropertyDefinition<Value>,
) {
  return (element: {
    type: 'field';
    key: string;
    initializer?: () => unknown;
  }) => {
    // Idea taken from https://github.com/lit/lit/blob/main/packages/reactive-element/src/decorators/property.ts#LL35C5-L62C7
    // createProperty() takes care of defining the property, but we still
    // must return some kind of descriptor, so return a descriptor for an
    // unused prototype field. The finisher calls createProperty().
    return {
      kind: 'field',
      key: Symbol(),
      placement: 'own',
      descriptor: {},
      // store the original key so subsequent decorators have access to it.
      originalKey: element.key,
      initializer(this: {[key: string]: unknown}) {
        if (typeof element.initializer === 'function') {
          this[element.key as string] = element.initializer.call(this);
        }
      },
      finisher(Constructor: typeof RemoteElement) {
        Constructor.createProperty(element.key, definition);
      },
    };
  };
}
