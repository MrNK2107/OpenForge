import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber idioms: three.js objects are mutated imperatively inside
    // useFrame, and particle/shard layouts are generated once with Math.random
    // inside useMemo. The React Compiler purity rules don't model this.
    files: ["src/components/ForgeScene/**", "src/components/ThreeSceneContent.tsx", "src/components/LandingPage.tsx"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".kilo/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
