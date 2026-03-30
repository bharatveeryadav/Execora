// @ts-check
import importPlugin from 'eslint-plugin-import';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';

/**
 * Cross-feature import guard — Bulletproof React pattern.
 * Each feature is a vertical slice; features must not import from sibling features.
 * Unidirectional flow: shared → features → navigation/app
 */
const FEATURES = [
  'billing',
  'customers',
  'products',
  'accounting',
  'expenses',
  'settings',
  'dashboard',
  'sync',
];

const crossFeatureZones = FEATURES.flatMap((domain) =>
  FEATURES.filter((other) => other !== domain).map((other) => ({
    target: `./src/features/${domain}/**`,
    from: `./src/features/${other}/**`,
    message: `[arch] features/${domain} must not import from features/${other}. Use shared/ for cross-feature code.`,
  })),
);

const sharedBoundaryZones = [
  {
    target: './src/shared/**',
    from: './src/features/**',
    message: '[arch] shared/ must not import from features/. Keep shared/ dependency-free from feature code.',
  },
  {
    target: './src/shared/**',
    from: './src/navigation/**',
    message: '[arch] shared/ must not import from navigation/.',
  },
];

const featureToNavZones = [
  {
    target: './src/features/**',
    from: './src/navigation/**',
    message: '[arch] features/ must not import from navigation/. Use typed route params passed as props.',
  },
];

export default [
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parser: tsParser,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            ...crossFeatureZones,
            ...sharedBoundaryZones,
            ...featureToNavZones,
          ],
        },
      ],
    },
  },
];
