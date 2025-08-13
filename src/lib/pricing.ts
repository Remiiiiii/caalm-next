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

function sectionFor(md: string, heading: string): string | null {
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
  const filePath = path.join(process.cwd(), 'docs', 'PRICING.md');
  const md = await fs.readFile(filePath, 'utf8');

  const planDefs = [
    { key: 'starter' as const, name: 'Starter' },
    { key: 'pro' as const, name: 'Pro' },
    { key: 'enterprise' as const, name: 'Enterprise' },
  ];

  const plans: PricingPlan[] = planDefs.map(({ key, name }) => {
    const sec = sectionFor(md, name) || '';
    const { monthly, yearly } = extractPrices(sec);
    const features = extractFeatures(sec);
    return { key, name, monthly, yearly, features };
  });

  return { plans };
}
