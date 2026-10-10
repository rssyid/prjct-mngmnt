import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'src/generated/**',
    ],
  },
];

export default eslintConfig;
