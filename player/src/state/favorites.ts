const STORAGE_KEY = 'om:favorites:v1';

export class FavoritesStore {
  private slugs = new Set<string>();
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as string[];
      this.slugs = new Set(list);
    } catch {
      this.slugs = new Set();
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  isFavorite(slug: string | undefined | null): boolean {
    if (!slug) return false;
    return this.slugs.has(slug);
  }

  toggle(slug: string): boolean {
    if (this.slugs.has(slug)) {
      this.slugs.delete(slug);
    } else {
      this.slugs.add(slug);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.slugs]));
    this.notify();
    return this.slugs.has(slug);
  }

  getAll(): string[] {
    return [...this.slugs];
  }
}

let singleton: FavoritesStore | null = null;

export function getFavoritesStore(): FavoritesStore {
  if (!singleton) singleton = new FavoritesStore();
  return singleton;
}
