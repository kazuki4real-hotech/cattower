import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "@next/next/google-font-display": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
  globalIgnores([
    "**/.next/**",
    "**/.open-next/**",
    "**/.wrangler/**",
    "**/cloudflare-env.d.ts",
    "prototype/**",
    "node_modules/**",
  ]),
]);
