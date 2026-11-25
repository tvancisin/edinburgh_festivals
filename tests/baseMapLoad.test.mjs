import assert from "node:assert/strict";
import test from "node:test";
import { baseMapErrorMessage, observeBaseMapLoad } from "../src/lib/utils/baseMapLoad.ts";

function fakeMap() {
  const listeners = new Map();
  return {
    on(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    off(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    emit(type) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
    listenerCount() {
      return Array.from(listeners.values()).reduce((count, handlers) => count + handlers.size, 0);
    },
  };
}

test("a failed map request reports only an error and never releases startup, even if load follows", () => {
  const map = fakeMap();
  const results = [];
  observeBaseMapLoad(map, (detail) => results.push(detail));
  assert.deepEqual(results, []);
  map.emit("error");
  assert.deepEqual(results, [{ status: "error", error: baseMapErrorMessage }]);
  map.emit("error");
  map.emit("load");
  assert.equal(results.length, 1, "load must not hide an earlier failed resource");
  assert.ok(results.every((state) => state.status !== "loaded"));
});

test("successful initialization settles once and a later resource error remains visible", () => {
  const map = fakeMap();
  const results = [];
  observeBaseMapLoad(map, (detail) => results.push(detail));
  map.emit("load");
  map.emit("load");
  assert.deepEqual(results, [{ status: "loaded", error: null }]);
  map.emit("error");
  map.emit("error");
  assert.deepEqual(results, [{ status: "loaded", error: null }, { status: "error", error: baseMapErrorMessage }]);
});

test("cleanup removes both listeners so a destroyed component receives no callbacks", () => {
  const map = fakeMap();
  const results = [];
  const cleanup = observeBaseMapLoad(map, (detail) => results.push(detail));
  assert.equal(map.listenerCount(), 2);
  cleanup();
  assert.equal(map.listenerCount(), 0);
  map.emit("load");
  map.emit("error");
  assert.deepEqual(results, []);
});
