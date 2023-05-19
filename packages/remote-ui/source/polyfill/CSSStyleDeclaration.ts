export class CSSStyleDeclaration {
  getPropertyValue(_key: string): string | null | undefined {
    return undefined;
  }

  removeProperty(_key: string) {}

  setProperty(_key: string, _value?: string | null) {}

  get cssText() {
    return '';
  }

  set cssText(_css) {}
}
