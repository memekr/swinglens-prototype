/**
 * Local blob URLs for in-tab playback. Never upload. Revoke the previous URL
 * only after the video element has moved to the next src, and revoke on unmount.
 */
export class ObjectUrlStore {
  private current: string | null = null;
  private pendingRevoke: string | null = null;

  get url(): string | null {
    return this.current;
  }

  set(file: Blob): string {
    if (this.pendingRevoke) {
      URL.revokeObjectURL(this.pendingRevoke);
      this.pendingRevoke = null;
    }
    if (this.current) this.pendingRevoke = this.current;
    this.current = URL.createObjectURL(file);
    return this.current;
  }

  /** Call after the <video> src has switched to the URL from set(). */
  releasePrevious(): void {
    if (!this.pendingRevoke) return;
    URL.revokeObjectURL(this.pendingRevoke);
    this.pendingRevoke = null;
  }

  dispose(): void {
    this.releasePrevious();
    if (this.current) {
      URL.revokeObjectURL(this.current);
      this.current = null;
    }
  }
}
