import { defineConfig, defineDocs } from "fumadocs-mdx/config";

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
