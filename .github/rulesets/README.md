# Branch Protection Ruleset Documentation

This directory contains the standardized, consolidated branch protection ruleset configuration for this repository. 

## Consolidated Source of Truth
- **Configuration File:** `main.json`
- **Target Branches:** `main` and `backup`

---

## Scope and Rules

### 1. Mandated Quality Gateways (CI Status Checks)
The following status checks must pass successfully before a pull request can be merged into any of the target branches:
- **Quality Checks**
- **Unit Tests**
- **E2E Tests**
- **Docs Audit & Verification**

### 2. Pull Request Requirements
- **Required Approving Reviews:** At least `1` approving review is mandatory before merging.
- **Dismiss Stale Reviews:** Active (dismisses previous approvals when a new commit is pushed).
- **Require Code Owner Review:** Active (requires reviews from designated code owners).
- **Required Review Thread Resolution:** Active (all conversations and review threads must be resolved).
- **Linear History:** Active (requires a linear history for merge commits or squash merges).

### 3. Bypass Configurations
The ruleset defines bypass options for specific roles and automated systems to ensure critical operations are not blocked. The following roles/actors can bypass these rules under appropriate conditions:
- **Administrator Role** (Actor ID: `5`)
- **Write Role** (Actor ID: `1`)
- **Integration/Automation Bot** (Actor ID: `307`)

---

## File Format & Constraints

### Raw JSON Object Requirement
The ruleset configuration must **always** be formatted as a single raw JSON object (i.e., `{ ... }`), and **never** as a JSON array or list (i.e., `[ ... ]`). 

Maintaining the single JSON object format prevents import errors when applying the ruleset dynamically via APIs or GitHub REST commands.

---

## How to Apply and Update the Ruleset

When updating branch policies, follow these steps to avoid configuration drift and maintain continuous protection of our critical branches:

### Step 1: Edit the Configuration Local Copy
Make the required policy adjustments directly inside `.github/rulesets/main.json`. Ensure that you:
- Preserve the mandated status checks and approval parameters.
- Verify that the resulting JSON structure is a valid single JSON object.

### Step 2: Local Linting & Validation
Run local verification commands to check if any formatting is broken:
```bash
# Verify JSON syntax
node -e "JSON.parse(require('fs').readFileSync('.github/rulesets/main.json'))"
```

### Step 3: Apply the Ruleset on GitHub
To import/apply the updated ruleset to your repository:
1. Navigate to **Settings** > **Rulesets** on GitHub.
2. Select the existing ruleset or import/update from JSON.
3. Import the updated `main.json` to overwrite current settings.
4. Verify on the repository branch protection interface that all required quality checks are fully active.
