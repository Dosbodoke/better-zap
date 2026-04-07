import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  LLM_TEXT_ERROR,
  LLM_TEXT_NOT_FOUND,
  getLlmsStaticParams,
  parseLlmsSlug,
  renderPageAsMarkdown,
} from "#lib/llms";
import { source } from "#lib/source";

export const revalidate = false;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  const parsed = parseLlmsSlug(slug);

  if (!parsed) {
    return new NextResponse(LLM_TEXT_NOT_FOUND, {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  const page = source.getPage(parsed.slugs, parsed.language);

  if (!page) {
    return new NextResponse(LLM_TEXT_NOT_FOUND, {
      status: 404,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  try {
    return new NextResponse(renderPageAsMarkdown(page, parsed.language), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating markdown for docs llms route:", error);

    return new NextResponse(LLM_TEXT_ERROR, {
      status: 500,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }
}

export function generateStaticParams() {
  return getLlmsStaticParams();
}
