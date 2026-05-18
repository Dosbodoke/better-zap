import { RootProvider } from "fumadocs-ui/provider";
import { source } from "#lib/source";
import { i18n } from "#lib/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import Image from "next/image";
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
      <DocsLayout
        tree={source.pageTree[lang]}
        i18n={i18n}
        nav={{
          url: `/${lang}`,
          title: (
            <span className="sidebar-logo">
              <Image
                src="/favicon/favicon-32x32.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded"
              />
              <span>Better Zap</span>
            </span>
          ),
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
