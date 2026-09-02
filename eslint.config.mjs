// Shared ESLint flat config for every Next.js app in the monorepo.
//
// The repository had no ESLint configuration at all, which is why `next lint`
// dropped into its interactive setup prompt and could never run in CI. ESLint 9
// requires flat config, so this replaces the .eslintrc that never existed
// rather than migrating one.
//
// Each app re-exports this from its own eslint.config.mjs so the Next plugin
// resolves pages/app directories relative to that app.

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * @param {string} appDir Absolute path of the app being linted.
 * @returns {import("eslint").Linter.Config[]}
 */
export function hiveNextConfig(appDir) {
  const appCompat = new FlatCompat({ baseDirectory: appDir });

  return [
    {
      ignores: [
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
        "**/build/**",
        "**/out/**",
        "**/coverage/**",
        "**/public/sw.js",
        "**/public/workbox-*.js",
        "**/next-env.d.ts",
        "**/_generated/**",
      ],
    },
    ...appCompat.extends("next/core-web-vitals"),
    {
      rules: {
        // The codebase predates any linting. These are the rules that would
        // otherwise report thousands of pre-existing findings without
        // indicating a defect; they are downgraded to warnings so CI gates on
        // real errors now, rather than gating on nothing until a cleanup lands.
        "@next/next/no-img-element": "warn",
        "react-hooks/exhaustive-deps": "warn",
        "react/no-unescaped-entities": "warn",
      },
    },
  ];
}

export default [...compat.extends("next/core-web-vitals")];
