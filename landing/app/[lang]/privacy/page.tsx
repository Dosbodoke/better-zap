import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Better Zap",
  description: "Privacy policy for Better Zap.",
};

const updatedAt = "May 19, 2026";

export default async function PrivacyPage({
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
          {isPt ? "Politica de Privacidade" : "Privacy Policy"}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {isPt ? "Ultima atualizacao:" : "Last updated:"} {updatedAt}
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-zinc-700">
          {isPt ? <PortuguesePrivacy /> : <EnglishPrivacy />}
        </div>
      </article>
    </main>
  );
}

function EnglishPrivacy() {
  return (
    <>
      <section>
        <h2 className="text-base font-semibold text-zinc-950">Overview</h2>
        <p className="mt-2">
          Better Zap is a TypeScript SDK and application toolkit for building
          WhatsApp Cloud API integrations, including automated replies,
          webhooks, conversation dashboards, and WhatsApp Business Platform
          onboarding flows.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Information We Process
        </h2>
        <p className="mt-2">
          Depending on how a business deploys Better Zap, the integration may
          process WhatsApp business account identifiers, phone number
          identifiers, access tokens configured by the business, webhook
          payloads, message content, message delivery statuses, contact phone
          numbers, contact names provided by WhatsApp, template metadata, and
          operational logs needed to run and debug the service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          How We Use Information
        </h2>
        <p className="mt-2">
          Information is used to connect customer WhatsApp Business Accounts,
          receive and process WhatsApp webhooks, send messages requested by the
          business, show conversations in the dashboard, manage message
          templates where enabled, prevent duplicate processing, troubleshoot
          errors, and keep the integration secure and reliable.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          WhatsApp And Meta Data
        </h2>
        <p className="mt-2">
          Better Zap integrations use Meta's WhatsApp Business Platform and
          WhatsApp Cloud API. Data received from Meta is used only to provide
          the WhatsApp integration requested by the connected business and is
          handled according to applicable Meta Platform Terms and WhatsApp
          Business Platform policies.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Sharing And Disclosure
        </h2>
        <p className="mt-2">
          We do not sell WhatsApp message data. Information may be shared with
          infrastructure providers, hosting providers, databases, and observability
          services only as needed to operate the integration. Data may also be
          disclosed if required by law or to protect the security and integrity
          of the service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Retention And Deletion
        </h2>
        <p className="mt-2">
          Retention depends on the deployment and configuration chosen by the
          business using Better Zap. Businesses can delete or export conversation
          records from their own storage according to their implementation. To
          request deletion for data controlled by a Better Zap-hosted deployment,
          contact the maintainers through the project repository.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Security</h2>
        <p className="mt-2">
          Better Zap is designed to validate Meta webhook signatures, limit
          access to configured credentials, and process WhatsApp data only for
          authorized business workflows. Businesses are responsible for deploying
          the SDK with appropriate access controls, secrets management, and data
          protection practices.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Contact</h2>
        <p className="mt-2">
          For privacy questions, open an issue or contact the maintainers through
          the Better Zap repository at{" "}
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

function PortuguesePrivacy() {
  return (
    <>
      <section>
        <h2 className="text-base font-semibold text-zinc-950">Visao geral</h2>
        <p className="mt-2">
          Better Zap e um SDK TypeScript e conjunto de ferramentas para criar
          integracoes com a WhatsApp Cloud API, incluindo respostas
          automatizadas, webhooks, dashboards de conversa e fluxos de onboarding
          da WhatsApp Business Platform.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Informacoes que processamos
        </h2>
        <p className="mt-2">
          Dependendo de como uma empresa implanta o Better Zap, a integracao
          pode processar identificadores de contas WhatsApp Business,
          identificadores de numeros de telefone, tokens de acesso configurados
          pela empresa, payloads de webhook, conteudo de mensagens, status de
          entrega, telefones de contatos, nomes de contatos fornecidos pelo
          WhatsApp, metadados de templates e logs operacionais necessarios para
          executar e depurar o servico.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Como usamos as informacoes
        </h2>
        <p className="mt-2">
          As informacoes sao usadas para conectar contas WhatsApp Business de
          clientes, receber e processar webhooks do WhatsApp, enviar mensagens
          solicitadas pela empresa, exibir conversas no dashboard, gerenciar
          templates quando habilitado, evitar processamento duplicado, investigar
          erros e manter a integracao segura e confiavel.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Dados do WhatsApp e da Meta
        </h2>
        <p className="mt-2">
          Integracoes com Better Zap usam a WhatsApp Business Platform e a
          WhatsApp Cloud API da Meta. Dados recebidos da Meta sao usados somente
          para fornecer a integracao de WhatsApp solicitada pela empresa
          conectada e sao tratados de acordo com os Termos da Plataforma Meta e
          politicas da WhatsApp Business Platform aplicaveis.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Compartilhamento
        </h2>
        <p className="mt-2">
          Nao vendemos dados de mensagens do WhatsApp. Informacoes podem ser
          compartilhadas com provedores de infraestrutura, hospedagem, bancos de
          dados e observabilidade somente quando necessario para operar a
          integracao. Dados tambem podem ser divulgados se exigido por lei ou
          para proteger a seguranca e a integridade do servico.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">
          Retencao e exclusao
        </h2>
        <p className="mt-2">
          A retencao depende da implantacao e configuracao escolhidas pela
          empresa que usa o Better Zap. Empresas podem excluir ou exportar
          registros de conversas do proprio armazenamento conforme sua
          implementacao. Para solicitar exclusao de dados controlados por uma
          implantacao hospedada do Better Zap, entre em contato com os
          mantenedores pelo repositorio do projeto.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Seguranca</h2>
        <p className="mt-2">
          Better Zap foi projetado para validar assinaturas de webhooks da Meta,
          limitar acesso a credenciais configuradas e processar dados do
          WhatsApp apenas para fluxos empresariais autorizados. Empresas sao
          responsaveis por implantar o SDK com controles de acesso, gestao de
          segredos e praticas de protecao de dados adequadas.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-zinc-950">Contato</h2>
        <p className="mt-2">
          Para duvidas sobre privacidade, abra uma issue ou contate os
          mantenedores pelo repositorio Better Zap em{" "}
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
