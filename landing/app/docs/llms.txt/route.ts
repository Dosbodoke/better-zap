import { NextResponse } from "next/server";
import { renderLlmsIndex } from "#lib/llms";

export const revalidate = false;

export async function GET() {
  return new NextResponse(renderLlmsIndex(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
