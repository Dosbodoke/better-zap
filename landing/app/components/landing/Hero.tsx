import Link from "next/link";

export function Hero({ content }: { content: any }) {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24">
      {/* Background patterns */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(37,211,102,0.05)_0%,rgba(255,255,255,0)_100%)]"></div>
      
      <div className="container mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-50 border border-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]"></span>
          </span>
          {content.badge}
        </div>
        
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-zinc-900 sm:text-7xl">
          {content.title.split(" ").map((word: string, i: number) => (
            <span key={i} className={word === "WhatsApp" ? "text-[#25D366]" : ""}>
              {word}{" "}
            </span>
          ))}
        </h1>
        
        <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-600 sm:text-xl">
          {content.subtitle}
        </p>
        
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="./docs/getting-started"
            className="w-full sm:w-auto rounded-full bg-[#25D366] px-8 py-4 text-lg font-bold text-white shadow-[0_4px_20px_rgba(37,211,102,0.3)] transition-transform hover:scale-105"
          >
            {content.cta}
          </Link>
          <Link
            href="./docs/introduction"
            className="w-full sm:w-auto rounded-full bg-zinc-50 border border-zinc-200 px-8 py-4 text-lg font-bold text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            {content.docs}
          </Link>
        </div>
        
        <div className="mt-20 border-t border-zinc-100 pt-10">
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-8">Powered by</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0">
            <img src="https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white" alt="Cloudflare" />
            <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
            <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
            <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp API" />
          </div>
        </div>
      </div>
    </section>
  );
}
