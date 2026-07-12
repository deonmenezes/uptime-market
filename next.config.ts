import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value:
              '</.well-known/api-catalog>; rel="api-catalog", </api/agent>; rel="service-desc", </agents>; rel="service-doc", </.well-known/mcp/server-card.json>; rel="mcp-server"',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
