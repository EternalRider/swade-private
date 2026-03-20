// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["**/*.js"],
  },
  {
    files: ["**/*.ts"],
    rules: {
      "no-useless-assignment": "off", // Messes with some of the reducer and mapper functions
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/array-type": "warn",
      "@typescript-eslint/consistent-indexed-object-style": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off", //Required for some fvtt-types
      "@typescript-eslint/no-empty-object-type": "off", //False-flags some of the fvtt-type
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ]
    }
  }
);
