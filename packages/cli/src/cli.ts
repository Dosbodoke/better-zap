#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  parseCliArgs,
  resolveGenerateOptions,
  runGenerateCommand,
} from "./template-generator";

export function shouldPrintHelp(
  command: string | undefined,
  flags: Record<string, boolean | string>,
): boolean {
  return !command || command === "--help" || command === "-h" || Boolean(flags.help);
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { command, flags } = parseCliArgs(argv);
  const wantsHelp = shouldPrintHelp(command, flags);

  if (!command || wantsHelp) {
    printHelp();
    return;
  }

  if (command !== "generate") {
    throw new Error(
      `[better-zap] Unknown command "${command}". Supported commands: generate.`,
    );
  }

  const options = await resolveGenerateOptions({
    cwd: process.cwd(),
    env: process.env,
    flags,
  });
  const result = await runGenerateCommand(options);

  if (options.check) {
    console.log(
      `[better-zap] ${result.output} is up to date (${result.templateCount} templates).`,
    );
    return;
  }

  console.log(
    `[better-zap] Generated ${result.templateCount} templates at ${result.output}.`,
  );
}

function printHelp(): void {
  console.log(`better-zap

Usage:
  better-zap generate [--access-token <token>] [--waba-id <id>] [--output <path>] [--api-version <version>] [--check]

Options:
  --access-token   Meta access token. Falls back to WHATSAPP_TOKEN or META_ACCESS_TOKEN.
  --waba-id        WhatsApp Business Account ID. Falls back to WHATSAPP_BUSINESS_ACCOUNT_ID.
  --output         Output path for the generated registry file.
  --api-version    Graph API version. Defaults to v25.0.
  --config         Optional config file path. Also auto-discovers better-zap.config.(mjs|js|json).
  --check          Validate that the generated file is already up to date.
  --help           Show this help message.
`);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
