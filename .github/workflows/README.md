# GitHub Workflows

This directory contains GitHub Actions workflows for the auto-cibolt project.

## Available Workflows

### 1. CI/CD Pipeline (`ci.yml`)
**Triggers:** Push to main/develop, Pull Requests, Releases

**Features:**
- Security auditing and dependency scanning
- Multi-Node.js version testing (16, 18, 20)
- TypeScript compilation and building
- Playwright browser automation testing
- Code quality checks (ESLint, Prettier)
- Automated releases with artifacts
- **Custom environment protection** via "env" environment

**Jobs:**
- `security`: Dependency security scanning
- `build-and-test`: Building and testing across Node.js versions
- `lint`: Code quality and formatting checks
- `integration-tests`: Playwright integration tests
- `release`: Automated release creation

### 2. Playwright Tests (`playwright.yml`)
**Triggers:** Push to main/develop, Pull Requests

**Features:**
- Dedicated Playwright testing workflow
- WebKit browser installation and setup
- Test result and screenshot artifact uploads
- 60-minute timeout for long-running tests
- **Custom environment protection** via "env" environment

### 3. Dependency Updates (`dependency-update.yml`)
**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch

**Features:**
- Automated dependency checking
- Pull request creation for updates
- Limited to minor and patch versions for stability
- Configurable labels and branch naming
- **Custom environment protection** via "env" environment

## Environment Configuration

### Custom Environment: "env"
All workflows use a custom GitHub environment named **"env"** which provides:

- **Environment-specific secrets** and variables
- **Protection rules** (required reviewers, wait timers, etc.)
- **Deployment branches** restrictions
- **Environment-specific configurations**

### Setting Up the Environment
1. Go to your repository Settings → Environments
2. Create a new environment named "env"
3. Configure protection rules as needed:
   - Required reviewers
   - Wait timer
   - Deployment branches
4. Add environment-specific secrets and variables

### Environment Benefits
- **Enhanced security** through protection rules
- **Centralized configuration** for all workflows
- **Audit trail** for deployments and releases
- **Branch-specific** environment variables

## Usage

### Manual Workflow Execution
You can manually trigger workflows from the GitHub Actions tab:
1. Go to your repository's Actions tab
2. Select the workflow you want to run
3. Click "Run workflow"
4. Choose the branch and any parameters

**Note:** Manual runs will respect the "env" environment protection rules.

### Workflow Dependencies
- `security` job runs first and must pass
- `build-and-test` depends on `security`
- `lint` depends on `security`
- `integration-tests` depends on `security` and `build-and-test`
- `release` depends on all other jobs

### Environment Variables
The workflows use these environment variables:
- `NODE_VERSION`: Default Node.js version (18)
- `PLAYWRIGHT_BROWSERS`: Browser to install (webkit)
- `CI`: Set to true for CI environment

**Custom environment variables** can be set in the "env" environment settings.

### Secrets Required
- `GITHUB_TOKEN`: Automatically provided by GitHub
- **Environment-specific secrets** can be configured in the "env" environment
- For npm publishing (if needed): `NPM_TOKEN`

## Customization

### Adding New Node.js Versions
Edit the `matrix.node-version` in `ci.yml`:
```yaml
strategy:
  matrix:
    node-version: [16, 18, 20, 21]  # Add new versions here
```

### Changing Browser Support
Update `PLAYWRIGHT_BROWSERS` in the workflow files:
```yaml
env:
  PLAYWRIGHT_BROWSERS: 'chromium,firefox,webkit'
```

### Adding New Test Commands
Add new test steps in the appropriate workflow:
```yaml
- name: Run custom tests
  run: npm run custom-test
```

### Environment-Specific Configuration
Add environment-specific variables in the "env" environment:
```yaml
- name: Use environment variable
  run: echo ${{ vars.ENV_SPECIFIC_VAR }}
```

## Troubleshooting

### Common Issues

1. **Environment Protection Rules Blocking Workflows**
   - Check if the "env" environment has required reviewers
   - Ensure your branch is in the allowed deployment branches
   - Verify wait timers are not blocking execution

2. **Playwright Installation Fails**
   - Ensure the workflow uses `--with-deps` flag
   - Check if the runner has sufficient disk space

3. **Node.js Version Conflicts**
   - Verify the Node.js version in `package.json` engines field
   - Check compatibility with your dependencies

4. **Test Timeouts**
   - Increase `timeout-minutes` for long-running tests
   - Consider splitting tests into smaller chunks

5. **Dependency Update Failures**
   - Check if `npm-check-updates` is working correctly
   - Verify the GitHub token has sufficient permissions
   - Ensure the "env" environment allows the workflow to run

### Getting Help
- Check the Actions tab for detailed logs
- Review the workflow files for configuration issues
- Ensure all required secrets are properly set
- Verify "env" environment protection rules are configured correctly
- Check environment-specific variables and secrets 