// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";

const source = readFileSync(resolve("src/modules/pwa/worker.js"), "utf8").replaceAll("__PWA_VERSION__", "test");
const origin = "https://pagato.example";
const assets = ["/pwa/offline.html", "/pwa/offline.css", "/pwa/offline.js", "/pwa/manrope-latin.woff2", "/brand/pagato-mark.svg"];
function setup() {
  const handlers: Record<string, (event: object) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const fetcher = vi.fn(async () => new Response("public file"));
  const caches = {
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {
        put: async (path: string, response: Response) => { stores.get(name)!.set(path, response); },
        match: async (path: string) => stores.get(name)!.get(path)?.clone(),
      };
    },
  };
  const self = {
    location: { origin },
    addEventListener: (name: string, handler: (event: object) => void) => { handlers[name] = handler; },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined), get: vi.fn(async () => ({ type: "window", url: origin + "/settings" })) },
  };
  runInNewContext(source, { self, caches, fetch: fetcher, Request, Response, URL, AbortController, setTimeout, clearTimeout });
  function dispatch(type: string, extras = {}) {
    let completion: Promise<unknown> | undefined;
    let response: Promise<Response> | undefined;
    handlers[type]({ ...extras, waitUntil: (promise: Promise<unknown>) => { completion = promise; }, respondWith: (promise: Promise<Response>) => { response = promise; } });
    return { completion, response };
  }
  return { dispatch, self, stores, fetcher, caches };
}
function request(path: string, init: RequestInit = {}, navigation = true) {
  const result = new Request(new URL(path, origin), init);
  if (navigation) Object.defineProperty(result, "mode", { value: "navigate" });
  return result;
}

describe("PWA public-only cache policy", () => {
  it("prepares only five explicit public files without cookies or automatic activation", async () => {
    const sw = setup(); await sw.dispatch("install").completion;
    expect([...sw.stores.get("pagato-public-test")!.keys()]).toEqual(assets);
    expect(sw.fetcher).toHaveBeenCalledTimes(5);
    for (const [input] of sw.fetcher.mock.calls as unknown as [Request][]) {
      expect(input.credentials).toBe("omit"); expect(input.cache).toBe("no-store"); expect(input.redirect).toBe("error");
    }
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
  });
  it("rejects incomplete installs without deleting the previous release", async () => {
    const sw = setup(); sw.stores.set("pagato-public-previous", new Map());
    sw.fetcher.mockResolvedValueOnce(new Response("missing", { status: 404 }));
    await expect(sw.dispatch("install").completion).rejects.toThrow("Public asset unavailable");
    expect(sw.stores.has("pagato-public-test")).toBe(false);
    expect(sw.stores.has("pagato-public-previous")).toBe(true);
  });
  it("never stores private navigation responses, including query filters", async () => {
    const sw = setup(); await sw.dispatch("install").completion;
    sw.fetcher.mockResolvedValue(new Response("private balances"));
    const response = await sw.dispatch("fetch", { request: request("/transactions?account=private") }).response;
    expect(await response!.text()).toBe("private balances");
    expect([...sw.stores.get("pagato-public-test")!.keys()]).toEqual(assets);
    expect((sw.fetcher.mock.lastCall as unknown as [Request])[0].cache).toBe("no-store");
  });
  it("returns the neutral offline page only for failed document navigation", async () => {
    const sw = setup(); await sw.dispatch("install").completion;
    sw.fetcher.mockRejectedValue(new TypeError("offline"));
    const response = await sw.dispatch("fetch", { request: request("/dashboard") }).response;
    expect(await response!.text()).toBe("public file");
  });
  it.each([
    ["/api/auth/get-session", {}, true], ["/api/accounts", {}, true],
    ["/_next/data/build/dashboard.json", {}, true], ["/dashboard?_rsc=123", {}, true],
    ["/dashboard", { headers: { RSC: "1" } }, true],
    ["/dashboard", { headers: { "Next-Action": "secret" } }, true],
    ["/transactions", { method: "POST", body: "private" }, false],
    ["/api/accounts", {}, false], ["https://auth.example/session", {}, true],
  ] as [string, RequestInit, boolean][])("does not intercept APIs, RSC, actions or external traffic: %s %j", (path, init, navigation) => {
    const sw = setup();
    expect(sw.dispatch("fetch", { request: request(path, init, navigation) }).response).toBeUndefined();
    expect(sw.fetcher).not.toHaveBeenCalled(); expect(sw.stores.size).toBe(0);
  });
  it("does not mask HTTP authentication/authorization/server errors as an offline screen", async () => {
    const sw = setup(); sw.fetcher.mockResolvedValue(new Response("unauthorized", { status: 401 }));
    expect((await sw.dispatch("fetch", { request: request("/dashboard") }).response)!.status).toBe(401);
  });
  it("serves allowlisted public files from cache without adding query variants", async () => {
    const sw = setup(); await sw.dispatch("install").completion; sw.fetcher.mockClear();
    expect(await (await sw.dispatch("fetch", { request: request("/pwa/offline.css", {}, false) }).response)!.text()).toBe("public file");
    expect(sw.fetcher).not.toHaveBeenCalled();
    expect(sw.dispatch("fetch", { request: request("/pwa/offline.css?private=1", {}, false) }).response).toBeUndefined();
  });
  it("only cleans older PagaTo public caches on activation", async () => {
    const sw = setup();
    for (const key of ["pagato-public-previous", "pagato-public-test", "unrelated-cache"]) sw.stores.set(key, new Map());
    await sw.dispatch("activate").completion;
    expect([...sw.stores.keys()]).toEqual(["pagato-public-test", "unrelated-cache"]);
    expect(sw.self.clients.claim).toHaveBeenCalledOnce();
  });
  it("requires an explicit update message from a same-origin window client", async () => {
    const sw = setup();
    sw.dispatch("message", { data: { type: "ACTIVATE_UPDATE" } });
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    sw.self.clients.get.mockResolvedValueOnce({ type: "window", url: "https://other.example" });
    await sw.dispatch("message", { data: { type: "ACTIVATE_UPDATE" }, source: { id: "foreign" } }).completion;
    expect(sw.self.skipWaiting).not.toHaveBeenCalled();
    await sw.dispatch("message", { data: { type: "ACTIVATE_UPDATE" }, source: { id: "current" } }).completion;
    expect(sw.self.skipWaiting).toHaveBeenCalledOnce();
  });
});

it("provides stable identity and installable/maskable icons without private manifest data", () => {
  const value = manifest();
  expect(value.id).toBe("/"); expect(value.scope).toBe("/"); expect(value.start_url).toBe("/dashboard");
  expect(value.display).toBe("standalone");
  expect(value.icons?.map(icon => [icon.sizes, icon.purpose])).toEqual([["192x192", "any"], ["512x512", "any"], ["512x512", "maskable"]]);
});
