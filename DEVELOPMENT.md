# Development Workflow

## Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage git hooks:

- **Pre-commit**: Runs TypeScript type checking and ESLint to ensure code quality
- **Pre-push**: Runs beachball check to ensure change files exist for versioning

## Versioning with Beachball

We use [Beachball](https://microsoft.github.io/beachball/) for automated semantic versioning and changelog generation.

### Before Making Changes

No special setup required - just start coding!

### Before Committing/Pushing

When you have changes that affect the public API or add features:

1. **Run the change command**:
   ```bash
   yarn change
   ```

2. **Select the appropriate change type**:
   - `patch` - Bug fixes, small improvements (0.1.0 → 0.1.1)
   - `minor` - New features, backwards compatible (0.1.0 → 0.2.0)
   - `major` - Breaking changes (0.1.0 → 1.0.0)

3. **Write a clear description** of your changes for the changelog

4. **Commit and push** - the pre-push hook will verify everything is ready

### Available Scripts

- `yarn change` - Create a change file for your modifications
- `yarn change:check` - Check if change files are needed (runs automatically on pre-push)
- `yarn version` - Bump version and generate changelog (typically done during releases)
- `yarn release` - Publish to npm (for maintainers)

### When Change Files Are NOT Needed

- Documentation updates
- Internal refactoring that doesn't change the API
- Build/tooling changes that don't affect consumers
- Test updates

The pre-push hook will let you know if a change file is required based on the actual code changes detected.