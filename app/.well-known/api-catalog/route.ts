import { NextResponse } from "next/server";

const SITE_URL = "https://culumus.vercel.app";

export function GET() {
  return NextResponse.json(
    {
      linkset: [
        {
          anchor: `${SITE_URL}/api`,
          links: [
            { rel: "service-desc", href: `${SITE_URL}/api/agent`, type: "application/json" },
            { rel: "service-doc", href: `${SITE_URL}/agents`, type: "text/html" },
            { rel: "status", href: `${SITE_URL}/api/state`, type: "application/json" },
          ],
        },
      ],
    },
    { headers: { "Content-Type": "application/linkset+json; charset=utf-8" } }
  );
}
