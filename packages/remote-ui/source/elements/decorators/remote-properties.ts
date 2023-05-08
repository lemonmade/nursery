import type {
  RemoteElementConstructor,
  RemoteElementPropertiesDefinition,
} from '../RemoteElement.ts';

export function remoteProperties<Properties extends Record<string, any> = {}>(
  properties: RemoteElementPropertiesDefinition<Properties>,
) {
  return <ElementConstructor extends RemoteElementConstructor<Properties, any>>(
    _: ElementConstructor,
    context: ClassDecoratorContext<ElementConstructor>,
  ) => {
    context.addInitializer(function defineElement() {
      for (const name in properties) {
        this.createProperty(name, properties[name]);
      }
    });
  };
}
