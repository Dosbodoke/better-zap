import Link from "next/link";
import { getTranslations } from "next-intl/server";
import HeroGeometric from "../components/landing/HeroGeometricClient";
import { CodeShowcase } from "../components/landing/CodeShowcase";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { Footer } from "../components/landing/Footer";

const featureKeys = [
  { key: "runAnywhere" as const, icon: "Server" as const },
  { key: "typeSafeTemplates" as const, icon: "Shield" as const },
  { key: "composablePlugins" as const, icon: "Puzzle" as const },
  { key: "fullApiSupport" as const, icon: "Zap" as const },
];

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations();

  const features = featureKeys.map(({ key, icon }) => ({
    title: t(`features.${key}.title`),
    description: t(`features.${key}.description`),
    icon,
  }));

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-screen lg:h-screen bg-[#f3f4f6] text-zinc-900">
      {/* Left column — scrollable content */}
      <div className="w-full lg:basis-1/2 lg:max-w-[50%] lg:h-screen lg:sticky lg:top-0 flex flex-col relative z-10 bg-[#f3f4f6] overflow-hidden">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 z-30 h-32 bg-gradient-to-b from-[#f3f4f6] via-[#f3f4f6]/95 to-transparent pointer-events-none backdrop-blur-[1px] hidden lg:block" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-32 bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6]/95 to-transparent pointer-events-none backdrop-blur-[1px]" />
        <main className="relative flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-6 lg:px-16 pt-12 pb-40 space-y-16 lg:space-y-20 max-w-3xl mx-auto">
            <CodeShowcase />
            <FeatureGrid features={features} />

            {/* CTA */}
            <section className="text-center space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-900 bg-clip-text text-transparent pb-1">
                {t("cta.title")}
              </h2>
              <p className="mx-auto max-w-md text-zinc-500 text-sm leading-relaxed">
                {t("cta.subtitle")}
              </p>
              <div className="pt-2">
                <Link
                  href={`/${lang}/docs/getting-started`}
                  className="inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {t("cta.button")}
                </Link>
              </div>
            </section>

            <Footer lang={lang} />
          </div>
        </main>
      </div>

      {/* Right column — sticky HeroGeometric — rendered second in DOM but appears first on mobile */}
      <div className="lg:basis-1/2 lg:max-w-[50%] lg:h-screen lg:sticky lg:top-0 order-first lg:order-first bg-[#f3f4f6] flex flex-col z-20">
        <div className="relative w-full h-[55vh] lg:h-full p-4 lg:pt-3 lg:pb-3 lg:pl-3 lg:pr-1.5">
          <div className="relative w-full h-full rounded-xl lg:rounded-2xl border border-zinc-200/50 overflow-hidden bg-white">
            <HeroGeometric />
          </div>
        </div>
      </div>
    </div>
  );
}
