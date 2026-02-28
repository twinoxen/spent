Create a pull request for the current changes following the project's branching workflow.

## Steps

1. **Check the current branch:**
   Run `git branch --show-current` and `git status` to understand the current state.

2. **If on `main`, create a new branch:**
   - Inspect the staged and unstaged changes with `git diff HEAD` and `git status` to understand what was changed.
   - Choose the correct prefix based on the nature of the changes:
     - `feat/` — new feature or capability
     - `fix/` — bug fix
     - `chore/` — maintenance, dependencies, config, tooling
     - `refactor/` — restructuring without behavior change
   - Create a short, kebab-case branch name (e.g. `feat/export-csv`, `fix/auth-redirect`) and check it out:
     ```
     git checkout -b <branch-name>
     ```

3. **If already on a feature branch**, continue from step 4.

4. **Stage and commit all changes:**
   - Stage everything: `git add -A`
   - Write a concise, meaningful commit message focused on *why*, not just *what*
   - Commit the changes

5. **Push the branch and open a PR:**
   - Push: `git push -u origin HEAD`
   - Create the PR with `gh pr create`, writing a clear title and a body that includes:
     - A short **Summary** (bullet points of what changed and why)
     - A **Test plan** checklist for verifying the changes
   - Use the same prefix convention in the PR title as the branch name (e.g. `feat: export CSV` or `fix: auth redirect loop`)

6. **Return the PR URL** to the user.
