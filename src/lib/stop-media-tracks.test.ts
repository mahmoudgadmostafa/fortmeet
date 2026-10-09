import test from "node:test";
import assert from "node:assert/strict";

import { stopMediaTracks } from "./stop-media-tracks.ts";

test("stops every available media track", () => {
  let stopped = 0;
  const track = { stop: () => stopped++ };

  stopMediaTracks([track, undefined, track]);

  assert.equal(stopped, 2);
});
