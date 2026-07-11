// Where each service actually runs. Logos are nominative references to the
// real providers (devicon assets in public/logos).
export interface RuntimeInfo {
  provider: string;
  product: string;
  logo: string;
  extraLogo?: string;
}

export const RUNTIMES: Record<string, RuntimeInfo> = {
  "checkout-service": {
    provider: "AWS",
    product: "EKS · us-east-1",
    logo: "/logos/aws.svg",
    extraLogo: "/logos/kubernetes.svg",
  },
  "payments-db": {
    provider: "Google Cloud",
    product: "Cloud SQL · us-central1",
    logo: "/logos/googlecloud.svg",
  },
  "api-gateway": {
    provider: "Cloudflare",
    product: "Workers · global edge",
    logo: "/logos/cloudflare.svg",
  },
  incidents: {
    provider: "Grafana",
    product: "unified alerting",
    logo: "/logos/grafana.svg",
  },
};
