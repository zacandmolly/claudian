# GPT-5.6 Claudian Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add complete GPT-5.6 Sol, Terra, and Luna support to Claudian's Codex provider and deploy the verified bundle to the active Obsidian vault.

**Architecture:** Keep model-specific capability metadata in `src/providers/codex/types/models.ts`, then have the Codex UI config and runtime consume the same helpers for model options, reasoning effort, context size, and Fast tier. Preserve the existing mixed-provider routing work and migrate only the live Codex CLI paths needed by the active vault.

**Tech Stack:** TypeScript, Jest, Codex app-server, Obsidian plugin build, JSON settings.

---

### Task 1: Define GPT-5.6 capability tests

**Files:**
- Modify: `tests/unit/providers/codex/ui/CodexChatUIConfig.test.ts`
- Modify: `tests/unit/providers/codex/runtime/CodexChatRuntime.test.ts`

**Steps:**
1. Add expectations for the three built-in GPT-5.6 model IDs and labels.
2. Add model-scoped effort expectations: Sol/Terra through `ultra`, Luna through `max`, legacy models through `xhigh`.
3. Add defaults and context-window expectations from the local Codex model catalog.
4. Add Fast-tier expectations for all three GPT-5.6 models.
5. Add runtime assertions that `max` and `ultra` pass through to `turn/start` and collaboration settings.
6. Run the two focused test files and confirm the new expectations fail before implementation.

### Task 2: Implement shared GPT-5.6 metadata

**Files:**
- Modify: `src/providers/codex/types/models.ts`
- Modify: `src/providers/codex/ui/CodexChatUIConfig.ts`
- Modify: `src/providers/codex/runtime/CodexChatRuntime.ts`

**Steps:**
1. Add stable constants and built-in menu entries for Sol, Terra, and Luna.
2. Add shared helpers for supported efforts, default effort, 372K context, and Fast-tier eligibility.
3. Make the UI config query those helpers instead of using global hard-coded values.
4. Extend the runtime effort map to `max` and `ultra` and gate Fast tier through the shared capability helper.
5. Run focused tests until green.

### Task 3: Migrate live CLI path and visible settings

**Files:**
- Modify: `/Users/zaczhu/个人-昊勤/.claudian/claudian-settings.json`

**Steps:**
1. Back up the live settings file without exposing secrets.
2. Replace the removed `/Applications/Codex.app/Contents/Resources/codex` path in the global and hostname-specific Codex settings with `/Applications/ChatGPT.app/Contents/Resources/codex`.
3. Keep the three GPT-5.6 models built-in, removing any duplicate custom entries if present.
4. Validate JSON and verify the configured executable exists.

### Task 4: Full verification and deployment

**Files:**
- Deploy: `/Users/zaczhu/个人-昊勤/.obsidian/plugins/realclaudian/main.js`
- Deploy: `/Users/zaczhu/个人-昊勤/.obsidian/plugins/realclaudian/manifest.json`
- Deploy: `/Users/zaczhu/个人-昊勤/.obsidian/plugins/realclaudian/styles.css`

**Steps:**
1. Run `npm run typecheck`, `npm run lint`, `npm run test -- --runInBand`, and `npm run build`.
2. Back up the active plugin bundle and copy the newly built assets into the live plugin directory.
3. Verify hashes between repo assets and deployed assets.
4. Run harmless OAuth smoke tests for Sol, Terra, and Luna through the configured CLI path.
5. Record exact verification results and any residual reload requirement.

### Task 5: Verify subscription quota semantics and document the work

**Files:**
- Modify: `/Users/zaczhu/个人-昊勤/AI/Briefs/2026-07-02-Claudian-模型路由配置记录.md`

**Steps:**
1. Check current official OpenAI Codex/Help documentation for subscription usage multipliers or credits.
2. Inspect live Codex rate-limit/usage metadata without printing credentials.
3. Separate confirmed subscription rules from API token pricing and clearly mark unknown ratios.
4. Update the tracking note with code changes, live settings migration, tests, deployment, smoke results, and quota findings.
