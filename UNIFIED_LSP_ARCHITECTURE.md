

# Unified LSP Architecture

## 1. Context & Objectives
*Define the purpose of this initiative and what constitutes a successful outcome from a business and user perspective.*

- **Problem Statement:** The Python backend relies on Tree-sitter for lexical analysis while the IDE uses IntelliJ PSI, creating semantic drift that causes patches to fail and requires fragile workarounds [cite:source1].
- **Business Goal:** Improve the reliability of AI-generated code changes by ensuring the agent and the editor see the exact same code structure.
- **Hypothesis:** Adopting a single LSP-based semantic model for both environments will eliminate synchronization errors and remove the need for complex merge logic [cite:source2].
- **Success Metrics:**
    - Zero patch application failures attributed to AST misalignment [cite:source1].
    - Successful removal of the GumTree-based merge reconciliation layer [cite:source1].
    - Backend semantic resolution matches IDE symbol resolution in 100% of test cases [cite:source2].

---

## 2. User Scenarios
*Narrative journeys that describe how a person interacts with the solution. Focus on the experience, not the interface.*

- **Scenario: Cross-File Refactoring**
    - **User Intent:** The user asks the agent to rename a function used across multiple files.
    - **Desired Experience:** The agent identifies all occurrences accurately using a shared semantic index; the resulting patch applies instantly because the backend and IDE share the same understanding of the project's symbols [cite:source1, source2].
- **Scenario: Precise Contextual Troubleshooting**
    - **User Intent:** The user highlights an error in a complex file and asks for a fix.
    - **Desired Experience:** The backend resolves the types and definitions from imported modules using the unified LSP, providing a fix that respects the actual codebase state instead of a shallow lexical guess [cite:source1, source3].

---

## 3. Functional Requirements
*A high-level list of what the solution must be able to do. Avoid mentioning specific code, databases, or implementation details.*

- **Requirement 1:** The system must use a common Language Server to generate a single unified AST for both the IDE plugin and the remote backend [cite:source2].
- **Requirement 2:** The backend must be able to request semantic data (symbols, types, definitions) through the LSP rather than local lexical analysis [cite:source1, source4].
- **Requirement 3:** A shadow Virtual File System (VFS) must synchronize file states between the IDE and backend to ensure the LSP server has an up-to-date view [cite:source2].
- **Requirement 4:** The existing GumTree-based patch reconciliation logic must be deprecated once the unified AST is operational [cite:source1].

---

## 4. Constraints & Guardrails
- The implementation must not increase the latency of code analysis beyond current PSI/Tree-sitter levels.
- The architecture must support all languages currently handled by the IDE without requiring manual parser re-implementation.
- The LSP integration must remain performant even in large repositories with deep dependency graphs.

---

## 5. Acceptance Criteria
*A checklist of conditions that must be met for the solution to be considered complete and successful.*

- [ ] The IDE and backend return identical results for "Go to Definition" requests on the same file content [cite:source2].
- [ ] Patch generation tests no longer trigger the GumTree reconciliation path [cite:source1].
- [ ] Semantic resolution is maintained even when the IDE and backend are running on different operating systems [cite:source1].
- [ ] The backend successfully resolves symbols defined in unsaved IDE buffers [cite:source2].