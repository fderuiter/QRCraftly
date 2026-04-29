## 2025-04-29 - Fixed 404 Metadata Inheritance
**Discovery:** The global metadata setup in Vike inherits the default title and description for 404 pages from the global config or Head component if not explicitly overridden.
**Signal:** Added a `src/pages/_error/+config.ts` file to export a specific `title` and `description` to ensure the 404 page serves correct, descriptive metadata instead of the default global website metadata.
