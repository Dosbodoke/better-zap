import { docs } from "#.source";
import { loader } from "fumadocs-core/source";
import { createMDXSource, resolveFiles } from "fumadocs-mdx";
import { i18n } from "./i18n";

export const source = loader({
  baseUrl: "/docs",
  source: { files: resolveFiles({ docs: docs.docs, meta: docs.meta }) },
  i18n,
});
