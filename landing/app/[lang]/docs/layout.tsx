import { RootProvider } from "fumadocs-ui/provider";
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
    <RootProvider
      i18n={{
        locale: lang,
        locales: [
          { locale: "en", name: "English" },
          { locale: "pt-BR", name: "Português" },
        ],
      }}
    >
      <DocsLayout tree={source.pageTree[lang]} i18n={i18n}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
