

# Unified LSP Architecture

## 1. Context & Objectives
*Define the purpose of this initiative and what constitutes a successful outcome from a business and user perspective.*

- **Problem Statement:** Disparate code models in the backend and IDE cause semantic drift, forcing the AI agent to use shallow guessing that results in frequent patch failures [cite:source1, source6].
- **Business Goal:** Increase the reliability of AI-generated code remediations by ensuring the backend and IDE share an identical understanding of the codebase.
- **Hypothesis:** Moving to a unified LSP-based semantic model will eliminate the need for fragile reconciliation layers and reduce patch failures caused by structural misalignment [cite:source4, source6].
- **Success Metrics:**
    - 95% reduction in patch failures attributed to "semantic drift."
    - Latency for code analysis remains at or below current PSI/Tree-sitter levels [cite:source5].
    - 100% parity in language support compared to the current implementation [cite:source5].

---

## 2. User Scenarios
*Narrative journeys that describe how a person interacts with the solution. Focus on the experience, not the interface.*

- **Scenario: Seamless Large-Scale Refactoring**
    - **User Intent:** The user requests a complex, multi-file refactor from the AI agent.
    - **Desired Experience:** The agent generates patches using the same semantic model the IDE uses to display code, ensuring every change applies correctly without syntax or structural errors [cite:source1, source3].
- **Scenario: Patching Unsaved Editor Changes**
    - **User Intent:** The user asks the agent to fix a bug in a file they have edited but not yet saved to disk.
    - **Desired Experience:** The system uses the Shadow Virtual File System to provide the agent with the exact current state of the editor buffer, allowing the agent to generate a valid patch against the unsaved code [cite:source2].

---

## 3. Functional Requirements
*A high-level list of what the solution must be able to do. Avoid mentioning specific code, databases, or implementation details.*

- **Requirement 1:** The system must synchronize file states, including unsaved editor buffers, between the IDE and the backend [cite:source2].
- **Requirement 2:** Both the backend agent and the IDE plugin must use a single, shared LSP-based model for all semantic code analysis [cite:source1].
- **Requirement 3:** The architecture must support all programming languages currently available in the IDE without requiring custom parser development for each [cite:source5].
- **Requirement 4:** The backend must be able to generate patches directly against the shared semantic model rather than relying on lexical approximations [cite:source1, source3].

---

## 4. Constraints & Guardrails
- **Performance:** Code analysis and patch generation latency must not exceed current benchmarks for the existing PSI and Tree-sitter implementations [cite:source5].
- **Stability:** The system must deprecate and replace the existing GumTree-based reconciliation logic to simplify the maintenance footprint [cite:source4].
- **Language Parity:** New architecture cannot be deployed for a specific language until it reaches full feature parity with existing IDE support for that language [cite:source5].

---

## 5. Acceptance Criteria
*A checklist of conditions that must be met for the solution to be considered complete and successful.*

- [ ] The backend agent can resolve method signatures and variable scopes identically to the IDE [cite:source1].
- [ ] Patches generated against unsaved buffers apply successfully without manual user reconciliation [cite:source2].
- [ ] The GumTree reconciliation layer is fully removed from the codebase [cite:source4].
- [ ] Automated tests confirm that LSP-based analysis latency is within 5% of previous PSI/Tree-sitter performance [cite:source5].
- [ ] All currently supported IDE languages pass the existing suite of remediation verification tests [cite:source5].