import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Better Zap",
  description: "Terms of service for Better Zap.",
};

const updatedAt = "May 19, 2026";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const isPt = lang === "pt-BR";

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-900">
      <article className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white px-6 py-8 shadow-sm sm:px-10">
        <Link
          href={`/${lang}`}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-[#25D366]"
        >
          Better Zap
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {isPt ? "Termos de Servico" : "Terms of Service"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isPt ? "Ultima atualizacao:" : "Last updated:"} {updatedAt}
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-700">
          {isPt ? <PortugueseTerms /> : <EnglishTerms />}
        </div>
      </article>
    </main>
  );
}

function EnglishTerms() {
  return (
    <>
      <section>
        <h2 className="text-base font-semibold text-zinc-950">Use Of Service</h2>
        <p className="mt-2">
          Better Zap provides developer tools for building WhatsApp Business
          Platform integrations. You are responsible for using Better Zap in
          compliance with applicable laws, Meta Platform Terms, WhatsApp
          Business Platform policies, and any rules that apply to your business
          or customers.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          WhatsApp Integrations
        </h2>
        <p className="mt-2">
          You must have authorization to connect and operate each WhatsApp
          Business Account or phone number used with Better Zap. You are
          responsible for message content, template approval, opt-in/consent,
          customer support workflows, and any charges from Meta or your
          infrastructure providers.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Data</h2>
        <p className="mt-2">
          You are responsible for configuring where your deployment stores
          WhatsApp messages, credentials, logs, and customer data. You must
          protect access tokens and secrets and must not use Better Zap to send
          spam, abusive content, or messages that violate WhatsApp policies.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Availability</h2>
        <p className="mt-2">
          Better Zap is provided as developer software and may depend on third
          party services such as Meta, WhatsApp, hosting providers, and
          databases. We do not guarantee uninterrupted availability of those
          services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Contact</h2>
        <p className="mt-2">
          For questions about these terms, contact the maintainers through{" "}
          <Link
            href="https://github.com/Dosbodoke/better-zap"
            className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:text-[#25D366]"
          >
            github.com/Dosbodoke/better-zap
          </Link>
          .
        </p>
      </section>
    </>
  );
}

function PortugueseTerms() {
  return (
    <>
      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Uso do servico
        </h2>
        <p className="mt-2">
          Better Zap fornece ferramentas para desenvolvedores criarem
          integracoes com a WhatsApp Business Platform. Voce e responsavel por
          usar o Better Zap em conformidade com leis aplicaveis, Termos da
          Plataforma Meta, politicas da WhatsApp Business Platform e regras
          aplicaveis ao seu negocio ou aos seus clientes.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Integracoes com WhatsApp
        </h2>
        <p className="mt-2">
          Voce deve ter autorizacao para conectar e operar cada conta WhatsApp
          Business ou numero de telefone usado com Better Zap. Voce e
          responsavel pelo conteudo das mensagens, aprovacao de templates,
          opt-in/consentimento, fluxos de atendimento e quaisquer custos da Meta
          ou dos seus provedores de infraestrutura.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Dados</h2>
        <p className="mt-2">
          Voce e responsavel por configurar onde sua implantacao armazena
          mensagens do WhatsApp, credenciais, logs e dados de clientes. Voce
          deve proteger tokens e segredos e nao deve usar Better Zap para enviar
          spam, conteudo abusivo ou mensagens que violem politicas do WhatsApp.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Disponibilidade
        </h2>
        <p className="mt-2">
          Better Zap e fornecido como software para desenvolvedores e pode
          depender de servicos de terceiros como Meta, WhatsApp, provedores de
          hospedagem e bancos de dados. Nao garantimos disponibilidade
          ininterrupta desses servicos.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Contato</h2>
        <p className="mt-2">
          Para duvidas sobre estes termos, contate os mantenedores em{" "}
          <Link
            href="https://github.com/Dosbodoke/better-zap"
            className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:text-[#25D366]"
          >
            github.com/Dosbodoke/better-zap
          </Link>
          .
        </p>
      </section>
    </>
  );
}
