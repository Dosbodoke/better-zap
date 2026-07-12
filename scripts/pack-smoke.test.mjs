import assert from "node:assert/strict";
import test from "node:test";
import { findMissingRelativeImports } from "./pack-smoke-lib.mjs";

async function check(files) {
	const entries = new Set(Object.keys(files));
	return findMissingRelativeImports(entries, async (entry) => files[entry]);
}

test("reports omitted code-split runtime chunks", async () => {
	const missing = await check({
		"dist/index.mjs": 'export { createZapClient } from "./client.mjs";',
	});

	assert.deepEqual(missing, ["dist/index.mjs -> ./client.mjs"]);
});

test("resolves declaration imports to declaration chunks", async () => {
	const missing = await check({
		"dist/index.d.mts": 'export { Client } from "./client-hash.mjs";',
		"dist/client-hash.d.mts": "export interface Client {}",
	});

	assert.deepEqual(missing, []);
});

test("supports extensionless and directory imports without scanning comments", async () => {
	const missing = await check({
		"dist/index.mjs": [
			'import "./client";',
			'export * from "./services";',
			'// import "./not-a-real-module.mjs";',
		].join("\n"),
		"dist/client.mjs": "export {};",
		"dist/services/index.mjs": "export {};",
	});

	assert.deepEqual(missing, []);
});
