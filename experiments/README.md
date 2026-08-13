# Experiments Directory

This is a dedicated self-service playground for developer sandbox prototypes and interactive feature exploration.

## Isolation Rules

1. **Routing Isolation**: Placed outside `/src/pages` to prevent accidental public production crawling or access.
2. **Build Isolation**: Production code MUST never import any file or asset from `/experiments`.
3. **Quality & Compliance Exclusions**: All static validation, duplicate code analysis, dependency compliance, and search engine crawling are automated to ignore this workspace.
