# Contributing to Axon

First off, thank you for considering contributing to Axon! It's people like you who make the open-source community such a great place to learn, inspire, and create.

## 📜 Code of Conduct
By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and professional in all interactions.

## 🐛 Reporting Bugs
* **Check existing issues:** Before opening a new issue, please search to see if it has already been reported.
* **Use the template:** Provide a clear description of the problem, steps to reproduce, and the expected vs. actual behavior.
* **Include environment info:** Mention your Angular version, Node version, and browser.

## 💡 Feature Requests
We love new ideas! Please open an issue to discuss your feature before starting work on it. This ensures the suggestion aligns with the project's roadmap and prevents wasted effort.

---

## 💻 Development Workflow

This project uses an Angular workspace containing the `axon` library and a `axon-demo` application for testing.

### 1. Prerequisites
* **Node.js:** (v20.x or higher recommended)
* **Angular CLI:** `npm install -g @angular/cli`

### 2. Setup
```bash
git clone https://github.com/your-username/axon.git
cd axon
npm install
```

### 3. Local Development
To work on the library and see changes in real-time, we recommend a two-terminal approach:

* **Terminal 1 (Build Library):**
  ```bash
  ng build axon --watch
  ```
* **Terminal 2 (Run Demo):**
  ```bash
  ng serve axon-demo
  ```
The demo app is configured to point directly to the library source/dist, so it will live-reload as you make changes.

### 4. Coding Standards
* Follow the [Official Angular Style Guide](https://angular.dev/style-guide).
* Use **Standalone Components** for all new library features.
* Ensure all new features include unit tests (`*.spec.ts`).

5. Commit Messages
We strictly follow the Conventional Commits specification. This allows us to automatically generate changelogs and manage semantic versioning.

Format: <type>(<scope>): <description>

Allowed Types:

feat: A new feature for the user, not a new feature for builds.

fix: A bug fix for the user, not a fix to a build script.

perf: A code change that improves performance.

refactor: A code change that neither fixes a bug nor adds a feature.

style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).

test: Adding missing tests or correcting existing tests.

build: Changes that affect the build system or external dependencies (example scopes: npm, glp, webpack).

ci: Changes to our CI configuration files and scripts (example scopes: GitHub Actions, CircleCI).

chore: Other changes that don't modify src or test files (e.g., updating .gitignore).

docs: Documentation only changes.

revert: Reverts a previous commit.

Scopes:
The scope should be the name of the package or area affected (e.g., feat(axon):, docs(demo):, fix(core):).

Breaking Changes:
Breaking changes must be indicated by an ! after the type/scope or by including BREAKING CHANGE: in the footer of the commit message.
Example: feat(axon)!: redesign the core API

## 🚀 Pull Request Process
1. Create a new branch from `main` (e.g., `feat/new-awesome-feature`).
2. Ensure the library builds successfully: `ng build axon`.
3. Ensure all tests pass: `ng test axon`.
4. Update the `README.md` if you are adding or changing public APIs.
5. Submit your PR with a clear description of the changes.

---

## 🏗️ Project Structure
* `projects/axon`: The core library package.
* `projects/axon-demo`: The sandbox application for testing and documentation.
