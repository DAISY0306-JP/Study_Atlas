import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        Chart: "readonly",
        supabase: "readonly"
      }
    }
  },
  prettier,
  {
    ignores: ["study-atlas-db/**"]
  }
];
