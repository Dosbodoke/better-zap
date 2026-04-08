"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import { NPM } from "../icons/npm";
import { Pnpm } from "../icons/pnpm";
import { Yarn } from "../icons/yarn";
import { Bun } from "../icons/bun";

const packageManagers: {
  name: string;
  command: string;
  pkg: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { name: "npm", command: "npm install", pkg: "@better-zap/core", icon: NPM },
  { name: "pnpm", command: "pnpm add", pkg: "@better-zap/core", icon: Pnpm },
  { name: "yarn", command: "yarn add", pkg: "@better-zap/core", icon: Yarn },
  { name: "bun", command: "bun add", pkg: "@better-zap/core", icon: Bun },
];

export function CodeShowcase({ lang }: { lang: string }) {
  const isPt = lang === "pt-BR";
  const [activeTab, setActiveTab] = useState(1); // default to pnpm

  return (
    <div className="space-y-10 lg:pt-[20vh]">
      <header className="space-y-6">
        <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-900 bg-clip-text text-transparent leading-[1.1] pb-2">
          {isPt ? "Segurança de Tipos no Coração" : "Type-Safety at the Core"}
        </h1>
        <p className="text-lg text-zinc-500 leading-relaxed max-w-2xl font-normal">
          {isPt
            ? "Diga adeus a erros em tempo de execução. O Better Zap fornece validação em tempo de compilação para templates do WhatsApp e parâmetros de mensagens."
            : "Say goodbye to runtime errors. Better Zap provides compile-time validation for WhatsApp templates and message parameters."}
        </p>
      </header>

      <ul className="space-y-3">
        {[
          isPt
            ? "Registro de templates type-safe"
            : "Type-safe template registry",
          isPt
            ? "Auto-complete para variáveis de template"
            : "Auto-complete for template variables",
          isPt
            ? "Handlers de eventos com tipagem estrita"
            : "Strictly typed event handlers",
        ].map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 text-sm text-zinc-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 shrink-0 text-[#25D366]"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>

      {/* Installation code block */}
      <div className="scroll-mt-20 pt-10" id="installation">
        <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-900 bg-clip-text text-transparent pb-1 mb-6">
          {isPt ? "Instalação" : "Installation"}
        </h2>
        <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100 font-mono text-sm leading-relaxed">
          <div className="flex items-center border-b border-zinc-200/40 bg-zinc-50/50 overflow-x-auto">
            {packageManagers.map((pm, i) => (
              <button
                key={pm.name}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 border-r border-zinc-200/40 px-4 py-2.5 text-xs min-w-fit transition-all outline-none hover:bg-zinc-100/50 ${
                  activeTab === i
                    ? "bg-transparent text-zinc-950 font-semibold"
                    : "font-medium bg-zinc-100/30 text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <pm.icon
                  width={14}
                  height={14}
                  className={activeTab === i ? "opacity-100" : "opacity-40"}
                />
                <span>{pm.name}</span>
              </button>
            ))}
          </div>
          <div className="relative flex items-center p-4">
            <div className="flex-1 overflow-x-auto whitespace-nowrap pr-12">
              <span className="mr-2 text-zinc-300 select-none">$</span>
              <span className="text-zinc-950">
                {packageManagers[activeTab].command}
              </span>{" "}
              <span className="text-zinc-500">
                {packageManagers[activeTab].pkg}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage code block */}
      <div className="scroll-mt-20 pt-10" id="usage">
        <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-br from-zinc-900 via-zinc-500 to-zinc-900 bg-clip-text text-transparent pb-1 mb-6">
          {isPt ? "Uso" : "Usage"}
        </h2>
        <div className="relative rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100 font-mono text-sm leading-relaxed">
          <div className="p-4 overflow-x-auto [&_pre]:overflow-x-auto">
            <pre className="text-[13px] leading-relaxed">
              <code className="grid">
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    1
                  </span>
                  <span>
                    <span className="text-violet-600">import</span>{" "}
                    {"{ BetterZap }"}{" "}
                    <span className="text-violet-600">from</span>{" "}
                    <span className="text-emerald-700">
                      &quot;@better-zap/core&quot;
                    </span>
                    ;
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    2
                  </span>
                  <span className="text-zinc-400">
                    // Initialize with type-safe config
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    3
                  </span>
                  <span>
                    <span className="text-violet-600">const</span> bot ={" "}
                    <span className="text-violet-600">new</span>{" "}
                    <span className="text-amber-700">BetterZap</span>(
                    {"{ ... }"});
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    4
                  </span>
                  <span></span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    5
                  </span>
                  <span>
                    <span className="text-violet-600">await</span> bot.messages.
                    <span className="text-blue-700">sendTemplate</span>({"{"}
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    6
                  </span>
                  <span>
                    {" "}
                    to:{" "}
                    <span className="text-emerald-700">
                      &quot;5511999999999&quot;
                    </span>
                    ,
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    7
                  </span>
                  <span>
                    {" "}
                    template:{" "}
                    <span className="text-emerald-700">
                      &quot;order_confirmation&quot;
                    </span>
                    ,
                  </span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    8
                  </span>
                  <span> components: {"{"}</span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    9
                  </span>
                  <span> body: {"{ order_id: '123' }"}</span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    10
                  </span>
                  <span> {"}"}</span>
                </span>
                <span className="flex gap-3">
                  <span className="text-zinc-300 select-none w-5 text-right shrink-0">
                    11
                  </span>
                  <span>{"}"});</span>
                </span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
