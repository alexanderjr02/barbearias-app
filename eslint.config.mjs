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
    // output (mobile/build, mobile/.dart_tool, and any Flutter web build
    // copied into public/mobile-app for local testing) includes
    // multi-megabyte generated main.dart.js bundles that aren't meant to
    // be parsed as hand-written JS. Linting them was blowing the heap
    // (OOM) and, once that was fixed, was still >99% of every lint run's
    // "errors" — none of it real.
    "mobile/**",
    "public/mobile-app/**",
  ]),
]);

export default eslintConfig;
