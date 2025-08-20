# Contributing Guide

## Development Workflow

### Local Development
1. Run `npm start` to create your local `answers.json` via interactive questionnaire
2. Run `npm run ship` to generate deliverables (MD/HTML/PDF)
3. Test export functionality with your specific answers

### CI/CD Pipeline

#### Why we use `answers.ci.json`
This project uses **Option B** for CI answers management:

- ✅ **Keeps repo clean**: No user-specific answers committed
- ✅ **CI determinism**: Reliable builds with committed default answers  
- ✅ **Clear separation**: Dev uses `npm start`, CI uses committed defaults
- ✅ **No secrets exposed**: Safe default values only

#### How it works
1. **Development**: Users run `npm start` → creates local `answers.json` (gitignored)
2. **CI builds**: Workflow copies `answers.ci.json` → `answers.json` automatically
3. **Fallback logic**: CI checks for existing `answers.json` first, uses `answers.ci.json` as fallback

#### CI Answers File
The `answers.ci.json` contains safe default values suitable for CI builds:
- No PII or sensitive data
- Generic project information
- Expert mode for comprehensive deliverables
- Values that generate valid outputs for testing

### GitHub Actions Workflow

The `ship-deliverable` workflow includes a "Prepare CI answers" step that:
1. Checks if `answers.json` already exists (user-provided)
2. Falls back to copying `answers.ci.json` if needed
3. Fails explicitly if neither file exists
4. Logs which file source is being used

### Testing CI Changes

To test workflow changes:
1. Update `answers.ci.json` if needed
2. Modify `.github/workflows/ship-deliverable.yml`
3. Commit changes and push
4. Trigger workflow manually via GitHub Actions tab
5. Verify artifacts and export behavior

### Future Improvements

Consider adding:
- Unit test to verify CI always copies `answers.ci.json` correctly
- Validation that `answers.ci.json` matches schema requirements
- Branch protection requiring workflow success before merge