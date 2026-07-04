const CHANNEL = 'om-player-sync';

export type TabSyncMessage = { type: 'pause-others'; tabId: string };

/** Prevents two tabs playing audio at once. Does not touch playback in this tab. */
export class TabCoordinator {
  readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private pauseListeners = new Set<() => void>();

  constructor() {
    let id = sessionStorage.getItem('om:tab-id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('om:tab-id', id);
    }
    this.tabId = id;

    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event) => {
        const msg = event.data as TabSyncMessage;
        if (msg.tabId === this.tabId) return;
        if (msg.type === 'pause-others') {
          this.pauseListeners.forEach((fn) => fn());
        }
      };
    }
  }

  onRemotePause(fn: () => void): () => void {
    this.pauseListeners.add(fn);
    return () => this.pauseListeners.delete(fn);
  }

  /** Call before starting playback — pauses audio in other tabs. */
  announcePlayback(): void {
    this.channel?.postMessage({ type: 'pause-others', tabId: this.tabId });
  }
}

let singleton: TabCoordinator | null = null;

export function getTabCoordinator(): TabCoordinator {
  if (!singleton) singleton = new TabCoordinator();
  return singleton;
}
