import path from "node:path";
import ts from "typescript";

const moduleFilePattern = /(?:\.(?:c|m)?js|\.d\.(?:c|m)?ts)$/;
const runtimeExtensions = [".js", ".mjs", ".cjs", ".json"];

function relativeSpecifiers(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		false,
		ts.ScriptKind.JS,
	);
	const specifiers = [];

	const add = (node) => {
		if (node && ts.isStringLiteralLike(node) && /^\.{1,2}\//.test(node.text)) {
			specifiers.push(node.text);
		}
	};

	const visit = (node) => {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			add(node.moduleSpecifier);
		} else if (ts.isImportTypeNode(node)) {
			add(node.argument.literal);
		} else if (ts.isCallExpression(node)) {
			const isDynamicImport =
				node.expression.kind === ts.SyntaxKind.ImportKeyword;
			const isRequire =
				ts.isIdentifier(node.expression) && node.expression.text === "require";
			if (isDynamicImport || isRequire) add(node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return specifiers;
}

function resolutionCandidates(importer, specifier) {
	const target = path.posix.normalize(
		path.posix.join(path.posix.dirname(importer), specifier),
	);
	const candidates = new Set([target]);

	if (importer.includes(".d.")) {
		candidates.add(
			target
				.replace(/\.mjs$/, ".d.mts")
				.replace(/\.cjs$/, ".d.cts")
				.replace(/\.js$/, ".d.ts"),
		);
	}

	if (!path.posix.extname(target)) {
		for (const extension of runtimeExtensions) {
			candidates.add(`${target}${extension}`);
			candidates.add(path.posix.join(target, `index${extension}`));
		}
	}

	return candidates;
}

/** Verify every relative module specifier resolves inside a packed tarball. */
export async function findMissingRelativeImports(entries, readEntry) {
	const missing = [];

	for (const entry of entries) {
		if (!moduleFilePattern.test(entry)) continue;

		const source = await readEntry(entry);
		for (const specifier of relativeSpecifiers(source, entry)) {
			const resolved = [...resolutionCandidates(entry, specifier)].some(
				(target) => entries.has(target),
			);
			if (!resolved) missing.push(`${entry} -> ${specifier}`);
		}
	}

	return missing;
}
