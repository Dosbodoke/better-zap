import type { ReactNode } from "react";

export default async function LangLayout({
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  return <>{children}</>;
}
