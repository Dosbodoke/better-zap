import { getLlmsPageUrl } from "#lib/llms";
import { source } from "#lib/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Card, Cards } from "fumadocs-ui/components/card";
import { CopyMarkdownButton } from "../../../components/docs/copy-markdown-button";
import { EditPageButton } from "../../../components/docs/edit-page-button";

export default async function DocsPageRoute(props: {
  params: Promise<{ slug?: string[]; lang: string }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug, params.lang);
  if (!page) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = page.data as any;
  const MDX = data.body;
  const markdownUrl = getLlmsPageUrl(page);
  const editPageUrl = `https://github.com/Dosbodoke/better-zap/blob/main/landing/content/docs/${page.path}`;

  return (
    <DocsPage toc={data.toc}>
      <div className="mb-6">
        <DocsTitle className="mb-5">{data.title}</DocsTitle>
        <DocsDescription className="mb-4">{data.description}</DocsDescription>
        <div className="border-t border-fd-border pt-3">
          <div className="flex flex-wrap gap-2">
            <CopyMarkdownButton href={markdownUrl} />
            <EditPageButton href={editPageUrl} />
          </div>
        </div>
      </div>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, Tab, Tabs, Card, Cards }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
