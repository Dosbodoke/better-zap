import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// Workers have no filesystem, so `getText("raw")` can't read the MDX at
// request time. Embed the source in the compiled module for the llms routes.
function remarkRawContent() {
  return (_tree: unknown, file: { value: unknown; data: Record<string, unknown> }) => {
    file.data.content = String(file.value);
  };
}

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: { valueToExport: ["content"] },
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkRawContent],
  },
});
