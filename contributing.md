# Contributing Guidelines

Thank you for contributing to this AI Agent project!  
This guide ensures consistent structure, clean commits, and modular growth.

---

## 📁 Repository Structure

- `master` → Global documentation and folder structure
- `agent/*` → Active AI agent implementations
- Each folder contains its own `README.md` for clarity

---

## 🛠 Branch Naming Conventions

Use descriptive and consistent branch names.

### ✅ Structure-Based Branches
For core versions, modules, or long-term dev:

agent/<module-name>


**Examples:**
- `agent/llm-sysinst-tools`
- `agent/mcp-llm-sysinst-tools`
- `agent/mcp-tools`

---

### ✅ Feature/Hotfix Branches
For short-lived feature or fix work:

feat/<short-description>
fix/<short-description>
chore/<short-description>


**Examples:**
- `feat/tool-call-wrapper`
- `fix/api-null-response`
- `chore/docs-update`

---

## ✅ Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

<type>(<scope>): <summary>


### Type (required)
- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation-only changes
- `style` – Code style (no logic changes)
- `refactor` – Refactoring code
- `perf` – Performance improvements
- `test` – Adding tests
- `chore` – Maintenance, tooling, infra
- `ci` – Continuous integration/config updates

### Scope (optional)
The area affected (e.g., `frontend`, `backend`, `agent`, `tools`)

### Summary
- Use present tense
- Max 50 chars
- No trailing period

### Example Commits

feat(agent): integrate web search tool
fix(api): handle null response from weather service
docs: update MCP agent readme


---

## 📦 Folder Layout

Each `/agent/` branch should contain:
- `/frontend` – Client UI or dashboard (if any)
- `/backend` – Tool API handlers, logic, agent runners
- `README.md` – Explains the purpose and architecture of the agent


---

## 🚀 Contribution Process

1. **Fork and clone** the repository
2. **Create a new branch** (see naming rules above)
3. Make your changes with readable, modular commits
4. **Write or update README** if needed
5. **Submit a pull request** with a clear title + description

---

## 🧼 Code Quality Standards

- Use clean, modular functions
- Write clear comments for complex logic
- Prefer async/await patterns for all I/O
- Use environment variables for secrets, never hardcode
- Add fallback/error handling for tool APIs

---

## 💬 Communication

- Use GitHub issues for feature requests or discussions
- Mention relevant people or issues in your PR if applicable

---

Let’s build powerful agents, one clean commit at a time 💻✨