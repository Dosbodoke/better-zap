import assert from "node:assert/strict";
import test from "node:test";
import { isPendingChangesetContents, validateReleaseVersions } from "./check-release-version.mjs";

const packageNames = ["better-zap", "@better-zap/react", "@better-zap/hono", "@better-zap/cli", "@better-zap/fixtures"];
const packages = (version) => packageNames.map((name) => ({ name, version }));
const apiVersions = ["v25.0", "v25.0", "v25.0"];

test("accepts aligned stable package versions", () => {
  assert.deepEqual(validateReleaseVersions({ apiVersions, packageVersions: packages("25.0.0"), mode: "stable" }), []);
});

test("rejects disagreeing Meta API defaults", () => {
  const errors = validateReleaseVersions({ apiVersions: ["v25.0", "v25.1", "v25.0"], packageVersions: packages("25.0.0") });
  assert.ok(errors.some((error) => error.includes("Meta API defaults disagree")));
});

test("rejects package version drift", () => {
  const versions = packages("25.0.0");
  versions[2] = { ...versions[2], version: "25.0.1" };
  const errors = validateReleaseVersions({ apiVersions, packageVersions: versions });
  assert.ok(errors.some((error) => error.includes("Public package versions disagree")));
});

test("rejects package versions on the wrong Meta API line", () => {
  const errors = validateReleaseVersions({ apiVersions, packageVersions: packages("25.1.0") });
  assert.ok(errors.some((error) => error.includes("does not match Meta API v25.0")));
});

test("accepts calculated next snapshots on the aligned Meta API line", () => {
  assert.deepEqual(
    validateReleaseVersions({ apiVersions, packageVersions: packages("25.0.1-next-20260922051730"), mode: "next" }),
    [],
  );
});

test("rejects stable versions and other prerelease tags in next mode", () => {
  const stableErrors = validateReleaseVersions({ apiVersions, packageVersions: packages("25.0.0"), mode: "next" });
  assert.ok(stableErrors.some((error) => error.includes("not a next version")));
  const wrongTagErrors = validateReleaseVersions({ apiVersions, packageVersions: packages("25.0.1-nightly-20260922051730"), mode: "next" });
  assert.ok(wrongTagErrors.some((error) => error.includes("not a next version")));
});

test("ignores empty Changesets when requiring a next snapshot", () => {
  assert.equal(isPendingChangesetContents("---\n---\n\nInitial version alignment.\n"), false);
});

test("accepts a Changeset with a package bump", () => {
  assert.equal(isPendingChangesetContents("---\n\"better-zap\": patch\n---\nVersioned source change.\n"), true);
});
