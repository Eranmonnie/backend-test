const store = new Map<string, string>();

const escapeRegex = (segment: string): string => segment.replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);

const wildcardToRegExp = (pattern: string): RegExp => {
  const segments = pattern.split('*').map(escapeRegex);
  return new RegExp(`^${segments.join('.*')}$`);
};

const redisMock: any = {
  on: jest.fn(),
  async get(key: string) {
    return store.has(key) ? store.get(key)! : null;
  },
  async set(key: string, value: string) {
    store.set(key, value);
    return 'OK';
  },
  async setex(key: string, _ttl: number, value: string) {
    store.set(key, value);
    return 'OK';
  },
  async del(...keys: string[]) {
    let removed = 0;
    keys.forEach((key) => {
      if (store.delete(key)) {
        removed += 1;
      }
    });
    return removed;
  },
  async keys(pattern: string) {
    if (!pattern.includes('*')) {
      return store.has(pattern) ? [pattern] : [];
    }
    const regex = wildcardToRegExp(pattern);
    return Array.from(store.keys()).filter((key) => regex.test(key));
  },
  async flushall() {
    store.clear();
    return 'OK';
  },
  async quit() {
    store.clear();
    return 'OK';
  },
  __reset() {
    store.clear();
    this.on.mockClear();
  },
};

export default redisMock;
