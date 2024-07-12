export class NullOriginWorker extends Worker {
  static async fromURL(url: string | URL) {
    const fetched = await fetch(url);

    if (!fetched.ok) {
      throw new Error(`Failed to fetch worker at ${url}`);
    }

    const text = await fetched.text();
    return new NullOriginWorker(text);
  }

  readonly content: string;

  constructor(content: string) {
    const url = `data:text/javascript;charset=UTF-8,${encodeURIComponent(content)}`;
    super(url);
    this.content = content;
  }
}
