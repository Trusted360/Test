# Claude Rules for Trusted360

## Project Context
This is the Trusted360 self-storage security platform. All development must follow these rules to maintain consistency and quality.

## Development Rules

### 1. Docker-Only Development
- All code must be tested and run inside the Docker Compose environment
- Do not use or suggest tools outside of this setup
- Always verify changes work within the containerized environment

### 2. Simplify Where Possible
- Prefer the simplest working solution
- Avoid overly abstract, over-engineered designs unless a clear and practical advantage can be expressed
- Choose clarity and maintainability over cleverness

### 3. Migrations Are Canonical
- When modifying the database schema, update existing migration files instead of creating new ones
- The baseline should reflect the final desired state
- Do not create additional migration files for schema changes

### 4. Idempotent Build
- The entire application must be destructible and rebuildable from scratch with no manual intervention
- Ensure `docker-compose down -v` followed by `docker-compose up` results in a fully functional system
- All initialization must be automated

### 5. Real Features Only
- Do not mock, fake, or simulate behavior unless explicitly asked to do so
- All features should be real and functional
- No placeholder implementations without explicit user request

### 6. Incremental, Not Fragmented
- Each feature should be built as part of the final PoC, not as isolated test stubs
- No placeholder code for 'later'—build it fully as it's added
- Complete implementations only

### 7. Prompt for Tests
- After each significant change, remind the user to run tests
- Suggest relevant test commands based on the changes made
- Use the test scripts in the project when available

### 8. User-Driven Complexity
- Only implement complex logic (e.g., orchestration, correlation, state management) when requested or demonstrably necessary
- Always validate with user before adding complexity
- Default to simple solutions

### 9. Data Integrity on Rebuild
- Ensure all volumes, seeds, and startup scripts can restore a functional and preconfigured baseline for demo or dev purposes
- Verify that demo data and configurations persist appropriately
- Test teardown and rebuild regularly

### 10. Session Completion Protocol
When completing work:
1. Update all relevant artifact files in the artifacts/ directory to reflect the current state
2. Document progress made and any changes to project status
3. Provide a comprehensive summary including:
   - What was accomplished
   - What remains to be done
   - Current blockers or considerations
   - Specific next steps for the following session
4. Ensure the summary provides enough context for seamless continuation

## Project-Specific Guidelines

### Directory Structure
- Scripts go in `/scripts/{category}/` (dev, deployment, ollama, testing, legacy)
- Current artifacts in `/artifacts/current/{category}/` (architecture, admin, systems)
- Archive old files in `/artifacts/archive/YYYY-MM/`
- Keep only README.md in root directory

### Testing Commands
- Always run `npm run lint` and `npm run typecheck` after code changes
- Use `npm test` for unit tests
- Use test scripts in `/scripts/testing/` for integration tests

### Git Workflow
- Never commit unless explicitly asked
- Always verify changes work in Docker before suggesting commits
- Include clear commit messages following project conventions

### Documentation
- Keep documentation up to date in artifacts directory
- Use markdown for all documentation
- Archive outdated documentation rather than deleting