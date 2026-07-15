import { FlatCompat } from "@eslint/eslintrc";
import base from "./base.js";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * Config for the Next.js app: next/core-web-vitals + base.
 * Base comes last so the typescript-eslint parser wins for .ts/.tsx files
 * (eslint-config-next's parser doesn't track type-only usages).
 */
export default [...compat.extends("next/core-web-vitals"), ...base];
