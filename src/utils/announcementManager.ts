export type AnnouncementPriority = 'polite' | 'assertive';

export interface AnnouncementItem {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

class AnnouncementManager {
  private queue: AnnouncementItem[] = [];
  private isProcessing = false;
  private activeAnnouncement: AnnouncementItem | null = null;
  private activeDelivered = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private initialDelayTimerId: ReturnType<typeof setTimeout> | null = null;

  public announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!message || typeof document === 'undefined') return;

    const item: AnnouncementItem = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      priority,
      timestamp: Date.now(),
    };

    if (priority === 'assertive') {
      // Assertive announcements preempt polite queued messages
      this.queue = this.queue.filter((q) => q.priority === 'assertive');
      this.queue.unshift(item);

      if (this.activeAnnouncement && this.activeAnnouncement.priority === 'polite') {
        if (this.timerId) clearTimeout(this.timerId);
        if (this.initialDelayTimerId) clearTimeout(this.initialDelayTimerId);
        this.activeAnnouncement = null;
        this.activeDelivered = false;
        this.isProcessing = false;
      }
    } else {
      const last = this.queue[this.queue.length - 1];
      if (last && last.message === message) {
        return;
      }
      this.queue.push(item);

      // If active item has already been delivered to screen reader, process next queued item
      if (this.isProcessing && this.activeDelivered && this.activeAnnouncement?.priority === 'polite') {
        if (this.timerId) clearTimeout(this.timerId);
        this.activeAnnouncement = null;
        this.activeDelivered = false;
        this.isProcessing = false;
      }
    }

    this.processQueue();
  }

  public announcePolitely(message: string): void {
    this.announce(message, 'polite');
  }

  public announceAssertively(message: string): void {
    this.announce(message, 'assertive');
  }

  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    this.activeDelivered = false;
    const item = this.queue.shift()!;
    this.activeAnnouncement = item;

    const elementId = item.priority === 'assertive' 
      ? 'dynamic-focus-live-region-assertive' 
      : 'dynamic-focus-live-region';

    let liveRegion = document.getElementById(elementId);
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = elementId;
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('aria-live', item.priority);
      liveRegion.setAttribute('role', item.priority === 'assertive' ? 'alert' : 'status');
      liveRegion.style.position = 'absolute';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.padding = '0';
      liveRegion.style.margin = '-1px';
      liveRegion.style.overflow = 'hidden';
      liveRegion.style.clip = 'rect(0, 0, 0, 0)';
      liveRegion.style.whiteSpace = 'nowrap';
      liveRegion.style.borderWidth = '0';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = '';

    this.initialDelayTimerId = setTimeout(() => {
      if (liveRegion && this.activeAnnouncement?.id === item.id) {
        liveRegion.textContent = item.message;
        this.activeDelivered = true;
      }

      const displayDuration = 1000;

      this.timerId = setTimeout(() => {
        this.activeAnnouncement = null;
        this.activeDelivered = false;
        this.isProcessing = false;
        if (this.queue.length > 0) {
          this.processQueue();
        }
      }, displayDuration);
    }, 50);
  }

  public reset(): void {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.initialDelayTimerId) clearTimeout(this.initialDelayTimerId);
    this.queue = [];
    this.isProcessing = false;
    this.activeAnnouncement = null;
    this.activeDelivered = false;
    this.timerId = null;
    this.initialDelayTimerId = null;
  }
}

export const announcementManager = new AnnouncementManager();
