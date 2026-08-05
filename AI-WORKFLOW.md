# AI Workflow

This document outlines exactly how Artificial Intelligence was leveraged to accelerate the development of this project, demonstrating a strict boundary between automated code generation and architectural engineering.

## Tooling Used
- **Agentic IDE (Google Antigravity / Gemini)**: Used as an autonomous pair-programmer embedded directly within the VS Code environment, executing file edits and terminal commands contextually.

## The Delegation Boundary
**What was delegated wholesale:**
- Boilerplate setup (`tsconfig.json`, Vite configuration, Dockerfile generation).
- Trivial React UI component scaffolding and CSS Module translation.
- Generating the synthetic spatial math for the database seeder (calculating Haversine distance and random bearings to place 1,200 poles).

**What was heavily monitored or manually overridden:**
- **The Core DFS Localization Algorithm**: Graph traversal mathematics for identifying strict topological boundaries require deterministic precision. AI generation was strictly supervised and heavily refactored to ensure multi-fault support.
- **System Architecture**: The decision to use BullMQ over synchronous Postgres writes, and SSE over WebSockets, were explicit engineering mandates provided *to* the AI, not generated *by* it.

## Concrete AI Failures & Corrections

1. **The Tailwind Clutter Failure**
   - **The Error**: The AI was initially instructed to style the UI, and it enthusiastically implemented heavily bloated Tailwind utility classes, resulting in an unreadable component structure that violated the "zero-dependency" mandate.
   - **The Correction**: The code was rejected, and a strict system mandate was issued: "Strip Tailwind completely. Rewrite the entire frontend using pure CSS Modules". The AI executed the refactor successfully.

2. **The SVG Z-Index Bug**
   - **The Error**: When generating the interactive grid background, the AI applied a `z-index: -10` to the CSS Module of the SVG container, but the parent container lacked a stacking context. This caused the entire SVG canvas to disappear behind the React root div.
   - **The Correction**: The visual regression was caught immediately upon checking the local server. The AI was instructed to investigate the DOM hierarchy and resolve the stacking context by applying `z-index: 0` and position relative to the wrapper.

3. **Verbatim Module Syntax Collision**
   - **The Error**: The AI attempted to set up standard CommonJS exports in the backend, but the global `tsconfig.json` was enforcing strict `verbatimModuleSyntax`. This resulted in massive IDE compilation errors (`ts(1295)` and `ts(1484)`).
   - **The Correction**: The error logs were fed directly back to the agent, which then autonomously updated `moduleResolution` to `Bundler` and `module` to `ESNext` to satisfy modern Node.js environments.

## Percentage of AI Generation
**Estimated 80% AI-generated syntax, 100% human-directed architecture.**
While the AI physically typed the majority of the characters in the repository, it operated strictly under rigorous, step-by-step architectural planning and manual review cycles.

## Best Prompting Excerpt
The most effective use of the agent occurred during the final Phase 7 deployment preparation, where the system architecture clashed with Vercel's serverless constraints:

> *"The user wants to deploy using Vercel (for frontend/backend) and Neon (for PostgreSQL)... However, we have a critical architectural constraint: Vercel only supports Serverless Functions. The BullMQ Worker requires a long-running background process... Server-Sent Events (SSE) requires a persistent, open HTTP connection. To keep our high-performance architecture intact without a massive rewrite, we must split the stack: Database on Neon, Frontend on Vercel, Backend & Worker on Render.com."*

This excerpt highlights the agent's ability to not just blindly execute code, but to evaluate the architectural constraints of different cloud providers and propose a hybrid CI/CD refactor to protect the integrity of the engineering.
