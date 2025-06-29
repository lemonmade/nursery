export class NullOriginWorker extends Worker {
  static async fromURL(
    url: string | URL,
    options?: ConstructorParameters<typeof NullOriginWorker>[1] & RequestInit,
  ) {
    const fetched = await fetch(url, options);

    if (!fetched.ok) {
      throw new Error(`Failed to fetch worker at ${url}`);
    }

    const text = await fetched.text();
    return new NullOriginWorker(text, options);
  }

  readonly content: string;

  constructor(content: string, options?: Omit<WorkerOptions, 'credentials'>) {
    const url = `data:text/javascript;charset=UTF-8,${encodeURIComponent(content)}`;
    super(url, options);
    this.content = content;
  }
}
