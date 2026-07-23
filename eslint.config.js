import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import securityPlugin from "eslint-plugin-security";
import jsdoc from "eslint-plugin-jsdoc";
import jsxA11y from "eslint-plugin-jsx-a11y";

const jsdocWarnRules = {};
for (const [ruleName, ruleVal] of Object.entries(jsdoc.configs["flat/recommended-typescript-error"].rules)) {
  if (ruleVal === "error") {
    jsdocWarnRules[ruleName] = "warn";
  } else if (Array.isArray(ruleVal) && ruleVal[0] === "error") {
    jsdocWarnRules[ruleName] = ["warn", ...ruleVal.slice(1)];
  } else {
    jsdocWarnRules[ruleName] = ruleVal;
  }
}

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
      "jsx-a11y": jsxA11y,
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
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
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
    files: ["src/types.ts", "src/utils/scannabilityWorker.ts", "src/engine/**/*.ts"],
    plugins: { jsdoc },
    rules: {
      ...jsdoc.configs["flat/recommended-typescript-error"].rules,
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
            ClassDeclaration: false,
            ClassExpression: false,
            MethodDefinition: false
          },
          contexts: [
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportDefaultDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression",
            "ExportNamedDeclaration",
            "MethodDefinition",
            "ClassDeclaration",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ObjectExpression > Property",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSInterfaceDeclaration TSPropertySignature",
            "TSTypeAliasDeclaration TSPropertySignature"
          ]
        }
      ],
      "jsdoc/require-description": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error"
    }
  },
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/context/**/*.{ts,tsx}",
      "src/layouts/**/*.{ts,tsx}",
      "src/pages/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/registry.tsx"
    ],
    plugins: { jsdoc },
    rules: {
      ...jsdocWarnRules,
      "jsdoc/require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
            ClassDeclaration: false,
            ClassExpression: false,
            MethodDefinition: false
          },
          contexts: [
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportDefaultDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > FunctionExpression",
            "ExportNamedDeclaration",
            "MethodDefinition",
            "ClassDeclaration",
            "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ObjectExpression > Property",
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSInterfaceDeclaration TSPropertySignature",
            "TSTypeAliasDeclaration TSPropertySignature"
          ]
        }
      ],
      "jsdoc/require-description": "warn",
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-returns-description": "warn"
    }
  }
);
