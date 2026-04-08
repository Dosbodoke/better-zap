import Link from "next/link";

export function Footer({ lang }: { lang: string }) {
  const isPt = lang === "pt-BR";

  return (
    <footer className="border-t border-zinc-200/60 pt-12 pb-8">
      <div>
        <div className="mb-10">
          <Link href={`/${lang}`} className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 mb-3">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#25D366] text-white text-xs">
              <span>⚡</span>
            </div>
            <span>Better Zap</span>
          </Link>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
            {isPt
              ? "O SDK TypeScript para construir bots de WhatsApp com segurança de tipos e performance."
              : "The TypeScript SDK for building WhatsApp bots with type-safety and performance."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-10">
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li><Link href={`/${lang}/docs/introduction`} className="hover:text-[#25D366] transition-colors">Docs</Link></li>
              <li><Link href={`/${lang}/docs/getting-started`} className="hover:text-[#25D366] transition-colors">Quick Start</Link></li>
              <li><Link href={`/${lang}/docs/concepts/plugins`} className="hover:text-[#25D366] transition-colors">Plugins</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 mb-4">Community</h4>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li><Link href="https://github.com/Dosbodoke/better-zap" className="inline-flex items-center gap-1.5 hover:text-[#25D366] transition-colors"><svg className="h-4 w-4" viewBox="0 0 1024 1024" fill="currentColor"><path fillRule="evenodd" d="M512 0C229.12 0 0 229.12 0 512c0 226.56 146.56 417.92 350.08 485.76 25.6 4.48 35.2-10.88 35.2-24.32 0-12.16-.64-52.48-.64-95.36-128.64 23.68-161.92-31.36-172.16-60.16-5.76-14.72-30.72-60.16-52.48-72.32-17.92-9.6-43.52-33.28-.64-33.92 40.32-.64 69.12 37.12 78.72 52.48 46.08 77.44 119.68 55.68 149.12 42.24 4.48-33.28 17.92-55.68 32.64-68.48-113.92-12.8-232.96-56.96-232.96-252.8 0-55.68 19.84-101.76 52.48-137.6-5.12-12.8-23.04-65.28 5.12-135.68 0 0 42.88-13.44 140.8 52.48 40.96-11.52 84.48-17.28 128-17.28s87.04 5.76 128 17.28c97.92-66.56 140.8-52.48 140.8-52.48 28.16 70.4 10.24 122.88 5.12 135.68 32.64 35.84 52.48 81.28 52.48 137.6 0 196.48-119.68 240-233.6 252.8 18.56 16 34.56 46.72 34.56 94.72 0 68.48-.64 123.52-.64 140.8 0 13.44 9.6 29.44 35.2 24.32C877.44 929.92 1024 737.92 1024 512 1024 229.12 794.88 0 512 0" clipRule="evenodd" /></svg>GitHub</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-zinc-400 mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li><Link href="#" className="hover:text-[#25D366] transition-colors">Privacy</Link></li>
              <li><Link href="#" className="hover:text-[#25D366] transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} Better Zap
          </p>
        </div>
      </div>
    </footer>
  );
}
