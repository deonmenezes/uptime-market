// The real providers each contract references. Logos are nominative references
// (devicon / simple-icons assets in public/logos).
export interface SourceInfo {
  provider: string;
  logo: string;
  dark?: boolean; // monochrome logo that needs no recolor on white
}

export const SOURCES: Record<string, SourceInfo> = {
  "aws-us-east-1": { provider: "AWS", logo: "/logos/aws.svg" },
  "stripe-api": { provider: "Stripe", logo: "/logos/stripe.svg", dark: true },
  "cloudflare-net": { provider: "Cloudflare", logo: "/logos/cloudflare.svg" },
  "openai-api": { provider: "OpenAI", logo: "/logos/openai.svg", dark: true },
  "epic-fortnite": { provider: "Epic Games", logo: "/logos/epicgames.svg", dark: true },
  "netflix-cdn": { provider: "Netflix", logo: "/logos/netflix.svg" },
  "riot-valorant": { provider: "Riot Games", logo: "/logos/valorant.svg" },
  "checkout-service": { provider: "Simulated", logo: "/logos/grafana.svg" },
};
