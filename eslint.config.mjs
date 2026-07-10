import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The Flutter app lives in its own subdirectory — its compiled web
    // output (mobile/build, mobile/.dart_tool) includes multi-megabyte
    // generated main.dart.js bundles that aren't meant to be parsed as
    // hand-written JS; linting them was blowing the heap (OOM), both
    // locally and in CI.
    "mobile/**",
  ]),
]);

export default eslintConfig;
