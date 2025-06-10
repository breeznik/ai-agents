# 🧠 AI Agent Workspace

Welcome to the master branch. This branch serves as the **global structure and documentation layer** for all AI agent projects in this repository.

---

## 📦 Repository Structure

/frontend → UI or client-facing components
/backend → Server-side logic, tool APIs, and MCP integrations
/agent/* → Versioned branches for active agent implementations


Each folder (in working branches) includes a `README.md` to explain its purpose, flow, and architecture.

---

## 🧠 Active Agent Branches

### `agent/llm-sysinst-tools`
> Basic AI agent using LLM + System Instruction + ToolCall pattern

### `agent/mcp-llm-sysinst-tools`
> [dropped , Moving to Langchain] Evolved version with backend integration via MCP + external tools + RAG for service context 

### `agent/langchain-agent`
> langchain + MCP

Use these branches to explore specific versions.

---

## 🛠 Branching Guidelines

- `master` is documentation-only — **do not develop here**
- Use `agent/*` for stable agent branches
- Use `feat/*`, `fix/*`, `chore/*` for short-lived task branches  
  *(see [`contributing.md`](./contributing.md) for rules)*

Each working branch contains its own:
- Folder structure (`/frontend`, `/backend`)
- Local `README.md` for clarity
- Commit and structure conventions

---

## 📄 Docs & Conventions

- [`contributing.md`](./contributing.md) — How to branch, commit, and contribute

---

## 🚫 Notes

- **Do not commit code directly to `master`**
- All working code exists in a versioned branch under `/agent/`
- Follow naming, commit, and structure conventions to ensure clean modular growth

---

**Author:** [Nikhil Rao](https://github.com/breeznik)

Let’s build clean, modular, and powerful AI agents.
