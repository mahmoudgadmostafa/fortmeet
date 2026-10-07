import test from "node:test";
import assert from "node:assert/strict";

import { getBaseUrl } from "./meeting-url.ts";

test("uses the deployment host when VERCEL_URL is set", () => {
  const previous = process.env.VERCEL_URL;
  process.env.VERCEL_URL = "example.vercel.app";

  try {
    assert.equal(getBaseUrl(), "https://example.vercel.app");
  } finally {
    if (previous === undefined) {
      delete process.env.VERCEL_URL;
    } else {
      process.env.VERCEL_URL = previous;
    }
  }
});
