import test from "node:test";
import assert from "node:assert/strict";

import { getUserDisplayName, getUserInitial } from "./user-display-name.ts";

test("uses the saved display name", () => {
  assert.equal(
    getUserDisplayName({
      email: "user@example.com",
      user_metadata: { display_name: "  Mahmoud Gad  " },
    }),
    "Mahmoud Gad",
  );
});

test("falls back to the email username when no display name is saved", () => {
  assert.equal(getUserDisplayName({ email: "mahmoud@example.com" }), "mahmoud");
});

test("creates initials from Arabic names", () => {
  assert.equal(getUserInitial("محمود"), "م");
});
