import Link from "next/link";
import HeroGeometric from "../components/landing/HeroGeometricClient";
import { CodeShowcase } from "../components/landing/CodeShowcase";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { Footer } from "../components/landing/Footer";

const content = {
  en: {
    features: [
      {
        title: "Run Anywhere",
        description: "Deploy on your own infrastructure. Works with any Node.js runtime — Express, Fastify, Hono, or standalone.",
        icon: "Server",
      },
      {
        title: "Type-Safe Templates",
        description: "Compile-time validation for WhatsApp templates. No more runtime errors for complex interactive messages.",
        icon: "Shield",
      },
      {
        title: "Composable Plugins",
        description: "Extend functionality with reusable, type-safe components. Build once, deploy everywhere.",
        icon: "Puzzle",
      },
      {
        title: "Full API Support",
        description: "Built-in handlers for buttons, lists, carousels, location, and rich media.",
        icon: "Zap",
      },
    ],
    ctaSection: {
      title: "Ready to build better?",
      subtitle: "Join developers building better WhatsApp experiences with type-safe, composable tools.",
      button: "Start Building Now",
    },
  },
  "pt-BR": {
    features: [
      {
        title: "Rode em Qualquer Lugar",
        description: "Implante na sua própria infraestrutura. Funciona com qualquer runtime Node.js — Express, Fastify, Hono, ou standalone.",
        icon: "Server",
      },
      {
        title: "Templates Type-Safe",
        description: "Validação em tempo de compilação para templates do WhatsApp. Sem erros de execução para mensagens complexas.",
        icon: "Shield",
      },
      {
        title: "Plugins Composíveis",
        description: "Estenda a funcionalidade com componentes reutilizáveis. Construa uma vez, use em qualquer lugar.",
        icon: "Puzzle",
      },
      {
        title: "Suporte Total à API",
        description: "Handlers integrados para botões, listas, carrosséis, localização e mídia rica.",
        icon: "Zap",
      },
    ],
    ctaSection: {
      title: "Pronto para construir melhor?",
      subtitle: "Junte-se aos desenvolvedores construindo melhores experiências no WhatsApp com ferramentas type-safe e composíveis.",
      button: "Comece a Construir Agora",
    },
  },
};

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = content[lang as keyof typeof content] || content.en;

  return (
    <div className="flex flex-col lg:flex-row w-full h-full min-h-screen lg:h-screen bg-[#f3f4f6] text-zinc-900">
      {/* Left column — scrollable content */}
      <div className="w-full lg:basis-1/2 lg:max-w-[50%] lg:h-screen lg:sticky lg:top-0 flex flex-col relative z-10 bg-[#f3f4f6] overflow-hidden">
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 z-30 h-32 bg-gradient-to-b from-[#f3f4f6] via-[#f3f4f6]/95 to-transparent pointer-events-none backdrop-blur-[1px] hidden lg:block" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-32 bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6]/95 to-transparent pointer-events-none backdrop-blur-[1px]" />
        <main className="relative flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="px-6 lg:px-16 pt-12 lg:pt-48 pb-40 space-y-16 lg:space-y-20 max-w-3xl mx-auto">
            <CodeShowcase lang={lang} />
            <FeatureGrid features={t.features} />

            {/* CTA */}
            <section className="text-center space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-900 bg-clip-text text-transparent pb-1">
                {t.ctaSection.title}
              </h2>
              <p className="mx-auto max-w-md text-zinc-500 text-sm leading-relaxed">
                {t.ctaSection.subtitle}
              </p>
              <div className="pt-2">
                <Link
                  href={`/${lang}/docs/getting-started`}
                  className="inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {t.ctaSection.button}
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
