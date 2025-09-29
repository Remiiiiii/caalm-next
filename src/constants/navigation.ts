// Static navigation configuration to prevent hydration mismatches
export const NAVIGATION_CONFIG = {
  admin: {
    analytics: {
      name: 'Overview',
      url: '/analytics/admin',
      icon: '/assets/icons/analytics.svg',
    },
  },
  executive: {
    analytics: {
      name: 'Overview',
      url: '/analytics/admin',
      icon: '/assets/icons/analytics.svg',
    },
    quickView: {
      name: 'Quick View',
      url: '/analytics',
      icon: '/assets/icons/analytics.svg',
    },
  },
  manager: {
    analytics: (division: string) => ({
      name: division
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      url: `/analytics/${division}`,
      icon: '/assets/icons/chart.svg',
    }),
  },
} as const;

// Consistent route mapping
export const ROUTE_MAPPING = {
  'behavioral-health': 'behavioral-health',
  'child-welfare': 'child-welfare',
  clinic: 'clinic',
  'c-suite': 'c-suite',
  cfs: 'cfs',
  hr: 'hr',
  residential: 'residential',
  support: 'support',
  'help-desk': 'help-desk',
  accounting: 'accounting',
} as const;

export const mapDatabaseToRouteDivision = (dbDivision: string): string => {
  return ROUTE_MAPPING[dbDivision as keyof typeof ROUTE_MAPPING] || dbDivision;
};
