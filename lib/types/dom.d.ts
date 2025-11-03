/// <reference lib="dom" />

declare interface Window {
  matchMedia(query: string): MediaQueryList;
}

declare interface MediaQueryList {
  matches: boolean;
  addEventListener(type: string, listener: (event: MediaQueryListEvent) => void): void;
  removeEventListener(type: string, listener: (event: MediaQueryListEvent) => void): void;
}

declare interface MediaQueryListEvent {
  matches: boolean;
}
