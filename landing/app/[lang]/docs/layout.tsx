import { source } from "#lib/source";
import { i18n } from "#lib/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

export default async function DocsLayoutComponent({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;

  return (
    <DocsLayout tree={source.pageTree[lang]} i18n={i18n}>
      {children}
    </DocsLayout>
  );
}
