// Flat config for this app. Rules live in the monorepo root config; this file
// exists so the Next ESLint plugin resolves this app's directory as the root.
import { dirname } from "path";
import { fileURLToPath } from "url";
import { hiveNextConfig } from "../../eslint.config.mjs";

export default hiveNextConfig(dirname(fileURLToPath(import.meta.url)));
