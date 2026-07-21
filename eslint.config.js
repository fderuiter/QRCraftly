import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import securityPlugin from "eslint-plugin-security";
import jsdoc from "eslint-plugin-jsdoc";
import importPlugin from "eslint-plugin-import";
import vitestPlugin from "eslint-plugin-vitest";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "scripts/**", "e2e/**", "**/*.test.ts", "**/*.test.tsx"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "security": securityPlugin,
      "import": importPlugin,
    },
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      }
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...securityPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-this-alias": "off",

      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",

      "no-useless-escape": "off",
      "no-case-declarations": "off",
      "prefer-const": "off",
      "no-empty": "off",
      "no-useless-assignment": "off",
      "no-control-regex": "off",

      // Enforce standardized import groupings
      "import/order": [
        "error",
        {
          "groups": [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index"
          ],
          "newlines-between": "always"
        }
      ],

      // Enforce manual security utilities
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='JSON'][callee.property.name='stringify']",
          "message": "Direct use of JSON.stringify is restricted for security reasons. Consider using safeJsonLdStringify for JSON-LD schemas or review carefully to prevent XSS."
        },
        {
          "selector": "JSXAttribute[name.name='dangerouslySetInnerHTML'] Property[key.name='__html'][value.type!='CallExpression']",
          "message": "Data passed to dangerouslySetInnerHTML must be sanitized."
        },
        {
          "selector": "JSXAttribute[name.name='dangerouslySetInnerHTML'] Property[key.name='__html'][value.type='CallExpression'][value.callee.name!='safeJsonLdStringify']",
          "message": "Data passed to dangerouslySetInnerHTML must be sanitized using safeJsonLdStringify or another approved security utility to prevent XSS."
        }
      ]
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      "vitest/require-top-level-describe": "error",
      "vitest/no-standalone-expect": "error"
    }
  },
  {
    files: ["src/types.ts", "src/utils/scannabilityWorker.ts"],
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs["flat/recommended-typescript-error"].rules,
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true
          },
          contexts: [
            "TSPropertySignature",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration"
          ]
        }
      ],
      "jsdoc/require-description": "error"
    }
  }
);
