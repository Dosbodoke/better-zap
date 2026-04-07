import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";

export default async function LangLayout({
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
      {children}
    </RootProvider>
  );
}
