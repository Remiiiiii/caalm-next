import fs from 'fs/promises';
import path from 'path';

export type PricingPlan = {
  key: 'starter' | 'pro' | 'enterprise';
  name: string;
  monthly: number;
  yearly: number;
  features: string[];
};

export type PricingData = {
  plans: PricingPlan[];
};

function parseCurrencyToNumber(value: string): number {
  const numeric = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sectionFor({
  md,
  heading,
}: {
  md: string;
  heading: string;
}): string | null {
  const re = new RegExp(
    `###\\s+${heading}\\s*[\\r\\n]([\\s\\S]*?)(?=\\n###\\s+|$)`,
    'i'
  );
  const m = md.match(re);
  return m ? m[1] : null;
}

function extractPrices(section: string): { monthly: number; yearly: number } {
  const monthly = section.match(/\*\*Monthly\*\*:\s*\$([0-9.,]+)/i)?.[1] ?? '0';
  const yearly =
    section.match(/\*\*Yearly[^*]*\*\*:\s*\$([0-9.,]+)/i)?.[1] ?? '0';
  return {
    monthly: parseCurrencyToNumber(monthly),
    yearly: parseCurrencyToNumber(yearly),
  };
}

function extractFeatures(section: string): string[] {
  const start = section.search(/-\s*\*\*Includes[^*]*\*\*\s*:/i);
  if (start === -1) return [];
  const slice = section.slice(start);
  const features: string[] = [];
  const re = /\n\s*-\s+([^\n][^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(slice))) {
    const text = m[1].trim();
    if (/^---/.test(text) || /^###\s+/.test(text)) break;
    features.push(text);
  }
  return features;
}

export async function loadPricingFromMarkdown(): Promise<PricingData> {
  // Try multiple locations to be resilient on different deploy targets (e.g., Vercel)
  const candidatePaths = [
    path.join(process.cwd(), 'public', 'PRICING.md'),
    path.join(process.cwd(), 'public', 'docs', 'PRICING.md'),
    path.join(process.cwd(), 'docs', 'PRICING.md'),
  ];

  let md: string | null = null;
  let lastError: Error | null = null;

  for (const p of candidatePaths) {
    try {
      md = await fs.readFile(p, 'utf8');
      console.log(`Successfully loaded pricing from: ${p}`);
      break;
    } catch (err) {
      lastError = err as Error;
      // continue trying next path
    }
  }

  if (!md && lastError) {
    console.warn(
      `Could not find PRICING.md in any of the candidate paths:`,
      candidatePaths
    );
    console.warn(`Last error:`, lastError.message);
  }

  if (md) {
    const planDefs = [
      { key: 'starter' as const, name: 'Starter' },
      { key: 'pro' as const, name: 'Pro' },
      { key: 'enterprise' as const, name: 'Enterprise' },
    ];

    const plans: PricingPlan[] = planDefs.map(({ key, name }) => {
      const sec = sectionFor({ md: md as string, heading: name }) || '';
      const { monthly, yearly } = extractPrices(sec);
      const features = extractFeatures(sec);
      return { key, name, monthly, yearly, features };
    });

    return { plans };
  }

  // Fallback defaults if markdown is not found at build time
  const starterMonthly = 79;
  const proMonthly = 299;
  const enterpriseMonthly = 999;

  const defaults: PricingPlan[] = [
    {
      key: 'starter',
      name: 'Starter',
      monthly: starterMonthly,
      yearly: Math.round(starterMonthly * 12 * 0.8 * 100) / 100,
      features: [
        'Up to **3 departments**',
        'Up to **10 staff users**',
        'Up to **100 active contracts** tracked',
        '**Analytics** for Admin + 2 departments',
        '**Reports** (basic) via `ReportsPage`',
        '**Email support**',
        '**Analytical data retention**: 90 days',
        '**Storage**: 5GB',
      ],
    },
    {
      key: 'pro',
      name: 'Pro',
      monthly: proMonthly,
      yearly: Math.round(proMonthly * 12 * 0.8 * 100) / 100,
      features: [
        'Includes everything in Starter, plus:',
        'Up to **6 departments**',
        'Up to **100 staff users**',
        'Up to **2,500 active contracts**',
        '**Full analytics suite** across all departments',
        '**Report scheduling**',
        '**Webhooks/API access** for integrations',
        '**Priority support**',
        '**Storage**: 100GB',
      ],
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      monthly: enterpriseMonthly,
      yearly: Math.round(enterpriseMonthly * 12 * 0.8 * 100) / 100,
      features: [
        'Includes everything in Pro, plus:',
        '**Unlimited departments**',
        '**Up to 1,000 staff users** (higher limits upon request)',
        '**25,000 active contracts** (higher upon request)',
        '**SSO/SAML & SCIM** (enterprise identity)',
        '**Advanced audit logs & exports**',
        '**Custom roles & permissions**, detailed access',
        '**Uptime SLA** 99.9% and **Dedicated CSM**',
        '**Storage**: 1 TB (expandable)',
        '**Custom integrations** and migration assistance',
      ],
    },
  ];

  return { plans: defaults };
}
