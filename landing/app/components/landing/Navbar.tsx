import Link from "next/link";

export function Navbar({ lang }: { lang: string }) {
  const isPt = lang === "pt-BR";
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href={`/${lang}`} className="flex items-center gap-2 font-bold tracking-tight text-zinc-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white">
              <span className="text-xl">⚡</span>
            </div>
            <span>Better Zap</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href={`/${lang}/docs/introduction`} 
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              {isPt ? "Documentação" : "Documentation"}
            </Link>
            <Link 
              href="https://github.com/better-zap/better-zap" 
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              target="_blank"
            >
              GitHub
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={isPt ? "/en" : "/pt-BR"}
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-900 transition-colors border border-zinc-200 px-2 py-1 rounded bg-zinc-50"
          >
            {isPt ? "English" : "Português"}
          </Link>
          <Link
            href={`/${lang}/docs/getting-started`}
            className="hidden sm:block rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            {isPt ? "Começar" : "Get Started"}
          </Link>
        </div>
      </div>
    </header>
  );
}
