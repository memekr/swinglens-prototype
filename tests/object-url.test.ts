import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectUrlStore } from "@/lib/object-url";

describe("ObjectUrlStore", () => {
  const created: string[] = [];
  const revoked: string[] = [];

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        const url = `blob:test/${created.length}-${blob.size}`;
        created.push(url);
        return url;
      },
      revokeObjectURL: (url: string) => {
        revoked.push(url);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revokes the previous URL after replacement, not while it is still current", () => {
    const store = new ObjectUrlStore();
    const first = store.set(new Blob(["a"]));
    expect(store.url).toBe(first);
    expect(revoked).toEqual([]);

    const second = store.set(new Blob(["bb"]));
    expect(store.url).toBe(second);
    expect(revoked).toEqual([]);

    store.releasePrevious();
    expect(revoked).toEqual([first]);
    expect(store.url).toBe(second);
  });

  it("revokes the active URL on dispose", () => {
    const store = new ObjectUrlStore();
    const first = store.set(new Blob(["a"]));
    const second = store.set(new Blob(["bb"]));
    store.dispose();
    expect(revoked).toEqual([first, second]);
    expect(store.url).toBeNull();
  });
});
