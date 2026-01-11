# Mystasis Multi-Agent Development Pipeline (Interactive Mode)

An interactive orchestration system for feature development using Claude Code agents. You approve all file changes, maintaining full control while following best practices.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  ./scripts/pipeline.sh full "Add feature X" backend            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Planning                                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Claude Session (Interactive)                             │  │
│  │  - Analyzes requirement                                   │  │
│  │  - Explores codebase                                      │  │
│  │  - Creates implementation plan                            │  │
│  │  - YOU approve any file reads/writes                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                         ▼                                       │
│              "Continue to next stage? (y/n)"                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [Stages 2-8 repeat pattern]
```

Each stage:
1. Opens an **interactive Claude session**
2. Claude proposes changes, **you approve each one**
3. When done, exit the session
4. Pipeline asks if you want to continue

## Quick Start

```bash
# Make executable
chmod +x scripts/pipeline.sh

# Run full pipeline
./scripts/pipeline.sh full "Add endpoint for biomarker date filtering" backend

# Or run individual stages
./scripts/pipeline.sh stage review
./scripts/pipeline.sh quick security backend
```

## Directory Structure

```
mystasis/                          # Project root (Flutter)
├── .claude/
│   └── agents/
│       ├── planner.md             # Requirements analysis
│       ├── tester.md              # TDD test writing
│       ├── developer.md           # Implementation
│       ├── reviewer.md            # Code review
│       ├── security-auditor.md    # Security audit
│       └── documenter.md          # Documentation
├── .pipeline/
│   ├── config.yaml                # Pipeline settings
│   ├── logs/                      # Session prompts & logs
│   └── state/                     # Task state tracking
├── scripts/
│   └── pipeline.sh                # Main script
├── server/                        # NestJS backend
│   └── CLAUDE.md                  # Backend context
├── lib/                           # Flutter source
└── CLAUDE.md                      # Frontend context
```

## Pipeline Stages

| # | Stage | Agent | What Happens |
|---|-------|-------|--------------|
| 1 | **Plan** | planner | Analyzes requirement, explores code, creates plan |
| 2 | **Test** | tester | Writes failing tests (TDD red phase) |
| 3 | **Implement** | developer | Writes code to pass tests (TDD green) |
| 4 | **Refactor** | developer | Cleans up while keeping tests green |
| 5 | **Review** | reviewer | Reviews for bugs, security, quality |
| 6 | **Security** | security-auditor | Audits for vulnerabilities, PHI handling |
| 7 | **Document** | documenter | Updates docs, changelog, comments |
| 8 | **Finalize** | developer | Runs final checks, creates commits |

## Commands

### Full Pipeline
```bash
# Backend feature
./scripts/pipeline.sh full "Add biomarker trend calculation" backend

# Frontend feature
./scripts/pipeline.sh full "Create settings screen" frontend

# Full-stack feature
./scripts/pipeline.sh full "Implement notifications" fullstack
```

### Individual Stages
```bash
# Run specific stage (uses generated task ID)
./scripts/pipeline.sh stage plan "Your requirement here"
./scripts/pipeline.sh stage test
./scripts/pipeline.sh stage implement
./scripts/pipeline.sh stage review

# Run with existing task ID
./scripts/pipeline.sh stage review task-20240115-143022-abc123 backend
```

### Quick Commands
```bash
# Quick review of uncommitted changes
./scripts/pipeline.sh quick review backend

# Quick test generation
./scripts/pipeline.sh quick test frontend

# Quick security check
./scripts/pipeline.sh quick security

# Run linter
./scripts/pipeline.sh quick lint all

# Run tests
./scripts/pipeline.sh quick test-run backend
```

### Pipeline Management
```bash
# Check status of all tasks
./scripts/pipeline.sh status

# Check specific task
./scripts/pipeline.sh status task-20240115-143022-abc123

# Resume paused pipeline
./scripts/pipeline.sh resume task-20240115-143022-abc123
```

## Interactive Session Tips

When Claude is running interactively:

### Approving Changes
- Claude will show you proposed changes
- Type `y` to approve, `n` to reject
- You can also type additional instructions

### Exiting a Stage
- Type `exit` or press `Ctrl+D` when the stage task is complete
- The pipeline will ask if you want to continue

### If Something Goes Wrong
- Press `Ctrl+C` to abort the current session
- The pipeline saves state, so you can resume later
- Check `.pipeline/logs/` for session details

## Example Session

```
$ ./scripts/pipeline.sh full "Add date range filter to biomarkers endpoint" backend

═══════════════════════════════════════════════════════════════
  🚀 Starting Interactive Pipeline
═══════════════════════════════════════════════════════════════

Task ID:     task-20240115-143022-a1b2c3d4
Target:      backend
Branch:      feature/task-20240115-143022-a1b2c3d4
Requirement: Add date range filter to biomarkers endpoint

⚠ This is interactive mode - you will approve all file changes.

────────────────────────────────────────────────────────────────
Start Stage 1: Planning? (y/n): y

═══════════════════════════════════════════════════════════════
  Stage 1: Planning
═══════════════════════════════════════════════════════════════

▶ Starting interactive session with planner agent...
ℹ You will approve all file changes. Type 'exit' when done.

─────────────────── Claude Session Start ───────────────────

[Claude analyzes the codebase and creates a plan]
[You see and approve any file operations]

────────────────────── Claude Session End ──────────────────

✓ Planning stage completed

────────────────────────────────────────────────────────────────
Continue to next stage? (y/n): y

[...continues through all stages...]
```

## Pausing and Resuming

The pipeline saves state after each stage:

```bash
# If you pause at stage 4
Continue to next stage? (y/n): n
Pipeline paused. Run './scripts/pipeline.sh resume task-xxx' to continue.

# Later, resume where you left off
./scripts/pipeline.sh resume task-20240115-143022-a1b2c3d4
```

## Configuration

Edit `.pipeline/config.yaml`:

```yaml
project:
  name: mystasis
  backend_path: ./server
  frontend_path: ./

stages:
  test:
    min_coverage: 80
    backend_test_cmd: "cd server && npm test"
    frontend_test_cmd: "flutter test"

medical_safety:
  require_disclaimers: true
  prohibited_patterns:
    - "you have been diagnosed"
```

## Why Interactive Mode?

| Benefit | Description |
|---------|-------------|
| **Control** | You approve every file change |
| **Learning** | See how Claude approaches problems |
| **Safety** | No unexpected modifications |
| **Flexibility** | Add guidance during any stage |
| **Trust** | Build confidence before automation |

Once comfortable, you can explore container-based automation for CI/CD.

## Troubleshooting

### "Claude session exits immediately"
- Make sure `claude` CLI is installed and authenticated
- Try running `claude` directly to test

### "Pipeline state corrupted"
- Delete the state file: `rm .pipeline/state/task-xxx.json`
- Start fresh with a new task

### "Stage seems stuck"
- Type `exit` or `Ctrl+D` to end the Claude session
- The pipeline will continue to the next prompt

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/pipeline.sh` | Main orchestration script |
| `.claude/agents/*.md` | Agent definitions with instructions |
| `.pipeline/config.yaml` | Pipeline configuration |
| `.pipeline/logs/` | Prompts and session logs |
| `.pipeline/state/` | Task state (JSON files) |
| `./CLAUDE.md` | Frontend context for agents |
| `./server/CLAUDE.md` | Backend context for agents |
