# Mystasis Multi-Agent Development Pipeline

A comprehensive orchestration system for feature development using Claude Code agents, following software engineering best practices: **Plan → Test → Implement → Review → Document → Deploy**.

## Overview

This pipeline automates the software development lifecycle by coordinating specialized AI agents:

| Agent | Role | Stage |
|-------|------|-------|
| **Planner** | Analyzes requirements, creates implementation plans | 1 |
| **Tester** | Writes tests before implementation (TDD) | 2 |
| **Developer** | Implements features to pass tests | 3, 4 |
| **Reviewer** | Reviews code for quality and correctness | 5 |
| **Security Auditor** | Audits for vulnerabilities and compliance | 6 |
| **Documenter** | Updates documentation | 7 |

## Quick Start

```bash
# Make the pipeline executable
chmod +x scripts/pipeline.sh

# Run the full pipeline for a feature
./scripts/pipeline.sh full "Add endpoint to filter biomarkers by date range" backend

# Run a quick code review
./scripts/pipeline.sh quick review

# Check pipeline status
./scripts/pipeline.sh status
```

## Directory Structure

```
mystasis/                          # Project root (Flutter frontend)
├── .claude/
│   └── agents/
│       ├── planner.md             # Planning agent
│       ├── developer.md           # Implementation agent
│       ├── tester.md              # Test writing agent
│       ├── reviewer.md            # Code review agent
│       ├── security-auditor.md    # Security audit agent
│       └── documenter.md          # Documentation agent
├── .pipeline/
│   ├── config.yaml                # Pipeline configuration
│   ├── logs/                      # Pipeline execution logs
│   └── state/                     # Task state tracking
├── scripts/
│   └── pipeline.sh                # Main pipeline script
├── server/                        # NestJS backend
│   ├── src/
│   │   └── modules/
│   └── CLAUDE.md                  # Backend context for agents
├── lib/                           # Flutter source
├── CLAUDE.md                      # Frontend context for agents
└── pubspec.yaml
```

## Pipeline Stages

### Stage 1: Planning
```bash
./scripts/pipeline.sh stage plan "Your requirement here"
```

The planner agent:
- Analyzes the requirement
- Researches existing codebase patterns
- Identifies affected components
- Creates step-by-step implementation plan
- Lists risks and acceptance criteria

**Output:** Implementation plan with tasks, files, and verification steps.

### Stage 2: Test-First Development
```bash
./scripts/pipeline.sh stage test <plan-file> <task-id> [backend|frontend]
```

The tester agent:
- Writes failing tests based on the plan (TDD red phase)
- Covers happy path, edge cases, error conditions
- Includes security and medical safety tests

**Output:** Test files that define expected behavior.

### Stage 3: Implementation
```bash
./scripts/pipeline.sh stage implement <plan-file> <test-file> <task-id> [backend|frontend]
```

The developer agent:
- Implements code to make tests pass (TDD green phase)
- Follows existing codebase patterns
- Runs linter and fixes issues
- Verifies tests pass

**Output:** Implementation files.

### Stage 4: Refactoring
```bash
./scripts/pipeline.sh stage refactor <task-id>
```

The developer agent:
- Cleans up code while keeping tests green (TDD refactor phase)
- Extracts duplication
- Improves naming and structure
- Optimizes if needed

**Output:** Cleaner code, same functionality.

### Stage 5: Code Review
```bash
./scripts/pipeline.sh stage review <task-id>
```

The reviewer agent checks:
- Correctness (logic errors, edge cases)
- Security (input validation, auth, data exposure)
- Performance (N+1 queries, unnecessary renders)
- Maintainability (patterns, naming, structure)
- Test coverage

**Output:** Review report with issues and suggestions.

### Stage 6: Security Audit
```bash
./scripts/pipeline.sh stage security <task-id>
```

The security auditor checks:
- Authentication & authorization
- PHI/data protection
- Input validation
- API security
- Secrets management
- Dependency vulnerabilities

**Output:** Security report with findings and remediation.

### Stage 7: Documentation
```bash
./scripts/pipeline.sh stage document <task-id>
```

The documenter updates:
- Code documentation (JSDoc/dartdoc)
- README files
- API documentation
- CHANGELOG entries
- Architecture docs (if significant)

**Output:** Updated documentation files.

### Stage 8: Finalization
```bash
./scripts/pipeline.sh stage finalize <task-id> <branch-name>
```

The developer agent:
- Runs final verification
- Creates atomic commits
- Prepares PR description

**Output:** Committed changes ready for PR.

## Full Pipeline Execution

Run all stages in sequence:

```bash
# Backend feature
./scripts/pipeline.sh full "Add patient notification preferences" backend

# Frontend feature
./scripts/pipeline.sh full "Create settings screen for notifications" frontend

# Full-stack feature (runs both)
./scripts/pipeline.sh full "Implement notification system end-to-end" fullstack
```

The pipeline will:
1. Create a feature branch
2. Execute all stages in order
3. Stop if critical issues are found
4. Generate logs for each stage
5. Provide next steps on completion

## Quick Commands

For common tasks without the full pipeline:

```bash
# Quick code review of uncommitted changes
./scripts/pipeline.sh quick review

# Quick test generation for recent changes
./scripts/pipeline.sh quick test

# Quick documentation update
./scripts/pipeline.sh quick document

# Quick security check
./scripts/pipeline.sh quick security
```

## Task Management

```bash
# Check status of a specific task
./scripts/pipeline.sh status task-20240115-143022-a1b2c3d4

# List recent tasks
./scripts/pipeline.sh status

# Resume a failed pipeline
./scripts/pipeline.sh resume task-20240115-143022-a1b2c3d4
```

## Configuration

Edit `.pipeline/config.yaml` to customize:

```yaml
pipeline:
  stop_on_critical: true      # Stop if review finds critical issues
  require_security_audit: true # Always run security audit
  require_documentation: true  # Always update docs

stages:
  test:
    min_coverage: 80          # Minimum test coverage
  
  security:
    blocking_severities:
      - CRITICAL
      - HIGH
```

## Medical Safety

For the Mystasis healthcare platform, the pipeline enforces:

- **No diagnostic language** in LLM outputs
- **Clinician deferral** in all health insights
- **Disclaimers** on AI-generated content
- **PHI protection** checks in security audit
- **Audit logging** for sensitive operations

Configure in `.pipeline/config.yaml`:

```yaml
medical_safety:
  require_disclaimers: true
  prohibited_patterns:
    - "you have been diagnosed"
    - "take \\d+ mg"
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Pipeline Review

on:
  pull_request:
    branches: [main]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
        
      - name: Run Review
        run: ./scripts/pipeline.sh quick review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          
      - name: Run Security Audit
        run: ./scripts/pipeline.sh quick security
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run quick review before commit
./scripts/pipeline.sh quick review

if [ $? -ne 0 ]; then
  echo "Review found issues. Please address before committing."
  exit 1
fi
```

## Logs and Debugging

Logs are stored in `.pipeline/logs/`:

```
.pipeline/logs/
├── pipeline.log                           # Main pipeline log
├── task-20240115-143022-a1b2c3d4-01-plan.json
├── task-20240115-143022-a1b2c3d4-02-tests.json
├── task-20240115-143022-a1b2c3d4-03-implement.json
├── task-20240115-143022-a1b2c3d4-04-refactor.json
├── task-20240115-143022-a1b2c3d4-05-review.json
├── task-20240115-143022-a1b2c3d4-06-security.json
├── task-20240115-143022-a1b2c3d4-07-document.json
└── task-20240115-143022-a1b2c3d4-08-finalize.json
```

Enable verbose logging:

```bash
export PIPELINE_VERBOSE=true
./scripts/pipeline.sh full "feature" backend
```

## Customizing Agents

Agents are defined in `.claude/agents/`. To customize:

1. Edit the agent's markdown file
2. Modify the instructions, checklists, or output format
3. Add project-specific patterns or requirements

Example: Adding a custom check to the reviewer:

```markdown
# In .claude/agents/reviewer.md

### 7. MYSTASIS-SPECIFIC CHECKS

#### Biomarker Validation
- [ ] All biomarker types use the BiomarkerType enum
- [ ] Value ranges are validated (no negative HRV, etc.)
- [ ] Timestamps are in UTC
```

## Best Practices

1. **Start with Planning**: Don't skip the plan stage—it saves time later
2. **Trust the Tests**: If tests pass, the implementation is likely correct
3. **Address Critical Issues**: Never skip critical review or security findings
4. **Keep Documentation Current**: The documenter stage ensures docs stay accurate
5. **Review the Logs**: Stage outputs contain valuable context

## Troubleshooting

### Pipeline hangs at a stage
```bash
# Check the state file
cat .pipeline/state/<task-id>.json

# Check detailed logs
cat .pipeline/logs/<task-id>-<stage>.json
```

### Claude Code not found
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Permission denied on script
```bash
chmod +x scripts/pipeline.sh
```

### Agent not responding as expected
1. Check the agent definition in `.claude/agents/`
2. Verify CLAUDE.md is in the project root
3. Review the stage prompt in `pipeline.sh`

## Contributing

To extend the pipeline:

1. Add new agents in `.claude/agents/`
2. Add new stages in `pipeline.sh`
3. Update configuration schema in `config.yaml`
4. Document changes in this README
