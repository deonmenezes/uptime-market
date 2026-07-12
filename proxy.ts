import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.headers.get("accept")?.includes("text/markdown")) {
    return NextResponse.rewrite(new URL("/_agent-markdown", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
