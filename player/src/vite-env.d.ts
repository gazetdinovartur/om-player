/// <reference types="vite/client" />

declare module '*.css?inline' {
  const css: string;
  export default css;
}

declare module 'howler' {
  export class Howl {
    constructor(options: Record<string, unknown>);
    play(): number;
    pause(): void;
    playing(): boolean;
    seek(): number;
    seek(id?: number): number | void;
    once(event: string, fn: () => void): void;
    load(): void;
    unload(): void;
  }
  export class Howler {
    static volume(v?: number): number;
  }
}
