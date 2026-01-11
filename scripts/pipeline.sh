#!/bin/bash

#===============================================================================
# Mystasis Multi-Agent Development Pipeline (Interactive Mode)
# 
# A complete orchestration system for feature development following
# best practices: Plan → Test → Implement → Review → Document → Deploy
#
# This version runs interactively - Claude will ask for approval before
# writing files, giving you control over all changes.
#
# Project Structure:
#   ./                  - Flutter frontend (project root)
#   ./server/           - NestJS backend
#   ./.claude/agents/   - Agent definitions
#   ./.pipeline/        - Pipeline config, logs, state
#===============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PIPELINE_DIR="$PROJECT_ROOT/.pipeline"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
LOG_DIR="$PIPELINE_DIR/logs"
STATE_DIR="$PIPELINE_DIR/state"

# Project paths (matching config.yaml)
BACKEND_PATH="$PROJECT_ROOT/server"
FRONTEND_PATH="$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$LOG_DIR" "$STATE_DIR"

#-------------------------------------------------------------------------------
# Utility Functions
#-------------------------------------------------------------------------------

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_DIR/pipeline.log"
}

log_info() { log "INFO" "$1"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$1"; }
log_warn() { log "${YELLOW}WARN${NC}" "$1"; }
log_error() { log "${RED}ERROR${NC}" "$1"; }

print_header() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

save_state() {
    local stage="$1"
    local status="$2"
    local task_id="$3"
    echo "{\"stage\": \"$stage\", \"status\": \"$status\", \"timestamp\": \"$(date -Iseconds)\"}" > "$STATE_DIR/${task_id}.json"
}

load_state() {
    local task_id="$1"
    if [[ -f "$STATE_DIR/${task_id}.json" ]]; then
        cat "$STATE_DIR/${task_id}.json"
    else
        echo "{}"
    fi
}

generate_task_id() {
    echo "task-$(date +%Y%m%d-%H%M%S)-$(openssl rand -hex 4)"
}

get_target_path() {
    local target="$1"
    case "$target" in
        backend|server)
            echo "$BACKEND_PATH"
            ;;
        frontend|flutter)
            echo "$FRONTEND_PATH"
            ;;
        *)
            echo "$PROJECT_ROOT"
            ;;
    esac
}

wait_for_confirmation() {
    local message="${1:-Continue to next stage?}"
    echo ""
    echo -e "${YELLOW}────────────────────────────────────────────────────────────────${NC}"
    read -p "$(echo -e ${CYAN}"$message (y/n): "${NC})" -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Pipeline paused. Run './scripts/pipeline.sh resume <task-id>' to continue."
        return 1
    fi
    return 0
}

#-------------------------------------------------------------------------------
# Stack-Specific Commands
#-------------------------------------------------------------------------------

run_backend_tests() {
    print_step "Running backend tests..."
    (cd "$BACKEND_PATH" && npm test)
}

run_frontend_tests() {
    print_step "Running frontend tests..."
    (cd "$FRONTEND_PATH" && flutter test)
}

run_backend_lint() {
    print_step "Running backend linter..."
    (cd "$BACKEND_PATH" && npm run lint)
}

run_frontend_lint() {
    print_step "Running frontend analyzer..."
    (cd "$FRONTEND_PATH" && flutter analyze)
}

run_tests() {
    local target="$1"
    case "$target" in
        backend|server)
            run_backend_tests
            ;;
        frontend|flutter)
            run_frontend_tests
            ;;
        fullstack|all)
            run_backend_tests
            run_frontend_tests
            ;;
    esac
}

run_lint() {
    local target="$1"
    case "$target" in
        backend|server)
            run_backend_lint
            ;;
        frontend|flutter)
            run_frontend_lint
            ;;
        fullstack|all)
            run_backend_lint
            run_frontend_lint
            ;;
    esac
}

#-------------------------------------------------------------------------------
# Agent Invocation (Interactive Mode)
#-------------------------------------------------------------------------------

# Creates a prompt file for the agent session
create_prompt_file() {
    local task_id="$1"
    local stage="$2"
    local content="$3"
    local prompt_file="$LOG_DIR/${task_id}-${stage}-prompt.md"
    
    echo "$content" > "$prompt_file"
    echo "$prompt_file"
}

# Copies text to clipboard if possible
copy_to_clipboard() {
    local text="$1"
    
    # Try different clipboard commands
    if command -v pbcopy &> /dev/null; then
        # macOS
        echo "$text" | pbcopy
        return 0
    elif command -v xclip &> /dev/null; then
        # Linux with xclip
        echo "$text" | xclip -selection clipboard
        return 0
    elif command -v xsel &> /dev/null; then
        # Linux with xsel
        echo "$text" | xsel --clipboard --input
        return 0
    fi
    return 1
}

# Runs Claude interactively with the given prompt
# User will see and approve all file changes
invoke_agent_interactive() {
    local agent_name="$1"
    local prompt="$2"
    local task_id="$3"
    local stage="$4"
    
    print_step "Preparing ${agent_name} agent session..."
    echo ""
    
    # Build the full prompt
    local full_prompt="Use the ${agent_name} agent for this task.

## Task ID: ${task_id}
## Stage: ${stage}

## Project Structure
- Frontend (Flutter): ${FRONTEND_PATH}
- Backend (NestJS): ${BACKEND_PATH}
- Frontend CLAUDE.md: ./CLAUDE.md
- Backend CLAUDE.md: ./server/CLAUDE.md

## Instructions
${prompt}

Please proceed with the task. I will review and approve any file changes."

    # Save the prompt for reference
    local prompt_file=$(create_prompt_file "$task_id" "$stage" "$full_prompt")
    log_info "Prompt saved to: $prompt_file"
    
    # Try to copy to clipboard
    local clipboard_status=""
    if copy_to_clipboard "$full_prompt"; then
        clipboard_status="${GREEN}✓ Prompt copied to clipboard${NC}"
    else
        clipboard_status="${YELLOW}⚠ Could not copy to clipboard (install pbcopy/xclip)${NC}"
    fi
    
    # Display instructions
    local agent_upper=$(echo "$agent_name" | tr '[:lower:]' '[:upper:]')
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ${agent_upper} AGENT - Stage: ${stage}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "$clipboard_status"
    echo -e "Prompt file: ${BLUE}$prompt_file${NC}"
    echo ""
    echo -e "${YELLOW}Instructions:${NC}"
    echo -e "  1. Claude will open in interactive mode"
    echo -e "  2. ${GREEN}Paste the prompt${NC} (Cmd+V / Ctrl+V) to start"
    echo -e "  3. Review and approve file changes as proposed"
    echo -e "  4. Type ${CYAN}/exit${NC} or press ${CYAN}Ctrl+C${NC} when done"
    echo ""
    
    # Show prompt preview (truncated)
    echo -e "${PURPLE}── Prompt Preview ──────────────────────────────────────────${NC}"
    echo "$full_prompt" | head -20
    if [[ $(echo "$full_prompt" | wc -l) -gt 20 ]]; then
        echo -e "${YELLOW}... (truncated, full prompt in clipboard/file)${NC}"
    fi
    echo -e "${PURPLE}────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    # Ask user to confirm before launching
    read -p "$(echo -e ${CYAN}"Press Enter to launch Claude, 's' to skip, 'p' to print full prompt: "${NC})" response
    
    case "$response" in
        s|skip)
            print_warning "Stage skipped by user"
            return 0
            ;;
        p|print)
            echo ""
            echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━ FULL PROMPT ━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "$full_prompt"
            echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            read -p "$(echo -e ${CYAN}"Press Enter to launch Claude: "${NC})"
            ;;
    esac
    
    # Launch Claude with TTY access (no piping)
    cd "$PROJECT_ROOT"
    
    echo ""
    echo -e "${GREEN}Launching Claude... Paste the prompt to begin.${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
    
    # Run claude directly - this preserves TTY
    claude || true
    
    echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    # Log completion
    log_info "Agent session completed: $agent_name | Task: $task_id | Stage: $stage"
    
    return 0
}

# Alternative: Opens Claude with a prompt and lets user continue interactively
invoke_agent_with_continue() {
    local agent_name="$1"
    local prompt="$2"
    local task_id="$3"
    local stage="$4"
    
    print_step "Launching ${agent_name} agent session..."
    print_info "This will open an interactive Claude session."
    print_info "Complete the task, then exit with 'exit' or Ctrl+D."
    echo ""
    
    # Save prompt for reference
    local prompt_file=$(create_prompt_file "$task_id" "$stage" "$prompt")
    
    # Create a temporary file with the initial prompt
    local init_file=$(mktemp)
    cat > "$init_file" << EOF
Use the ${agent_name} agent for this task.

## Task ID: ${task_id}
## Stage: ${stage}

## Project Structure
- Frontend (Flutter): ${FRONTEND_PATH}
- Backend (NestJS): ${BACKEND_PATH}

## Instructions
${prompt}
EOF

    echo -e "${CYAN}─────────────────── Claude Session Start ───────────────────${NC}"
    echo ""
    
    # Run Claude with the initial prompt, then continue interactively
    cd "$PROJECT_ROOT"
    claude -p "$(cat $init_file)" --continue
    
    echo ""
    echo -e "${CYAN}────────────────────── Claude Session End ──────────────────${NC}"
    
    rm -f "$init_file"
    return 0
}

#-------------------------------------------------------------------------------
# Pipeline Stages (Interactive)
#-------------------------------------------------------------------------------

stage_plan() {
    local requirement="$1"
    local task_id="$2"
    
    print_header "Stage 1: Planning"
    save_state "planning" "in_progress" "$task_id"
    
    local prompt="Analyze and create a detailed implementation plan for:

${requirement}

Your plan must include:
1. Summary of changes needed
2. Affected files and modules  
3. New files to create
4. Dependencies or migrations required
5. Potential risks and breaking changes
6. Step-by-step implementation order
7. Acceptance criteria for verification
8. Test scenarios to cover

Consider the mystasis architecture:
- Backend: NestJS modular monolith in ./server/ (modules/health-data, modules/llm, etc.)
- Frontend: Flutter with feature-first structure in ./lib/
- Medical safety constraints for any LLM-related changes

Please explore the codebase first to understand existing patterns, then create the plan."

    invoke_agent_interactive "planner" "$prompt" "$task_id" "01-plan"
    
    save_state "planning" "completed" "$task_id"
    print_success "Planning stage completed"
    return 0
}

stage_test_first() {
    local task_id="$1"
    local target="${2:-backend}"
    
    print_header "Stage 2: Test-First Development (TDD)"
    save_state "testing" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Based on the implementation plan from the previous stage, write comprehensive tests BEFORE implementation.

Target: ${target}
Target path: ${target_path}

For backend (NestJS) in ./server/:
- Unit tests for services with mocked dependencies
- Integration tests for controllers with supertest  
- Test file location: alongside the service/controller with .spec.ts extension
- Run tests with: cd server && npm test

For frontend (Flutter) in ./:
- Widget tests for new screens/components
- Unit tests for controllers/services
- Test file location: test/ directory mirroring lib/ structure
- Run tests with: flutter test

Requirements:
1. Tests should define the expected behavior (TDD red phase)
2. Cover happy path, edge cases, and error conditions
3. Include descriptive test names that document behavior
4. Mock external dependencies (API calls, database, LLM)
5. For medical features, test safety constraint enforcement

Write the test files now. They should fail initially since implementation doesn't exist yet."

    invoke_agent_interactive "tester" "$prompt" "$task_id" "02-test"
    
    save_state "testing" "completed" "$task_id"
    print_success "Test-first stage completed"
    return 0
}

stage_implement() {
    local task_id="$1"
    local target="${2:-backend}"
    
    print_header "Stage 3: Implementation"
    save_state "implementing" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Implement the feature to pass all tests written in the previous stage.

Target: ${target}
Target path: ${target_path}

Implementation requirements:
1. Follow existing codebase patterns exactly
2. Make tests pass one by one (TDD green phase)
3. Keep changes minimal and focused
4. Run tests after each significant change
5. Run linter and fix any issues

For backend (./server/):
- Business logic in services, not controllers
- Use DTOs for all inputs/outputs  
- Use dependency injection
- Handle errors with appropriate exceptions
- Verify with: cd server && npm test && npm run lint

For frontend (./):
- Use theme tokens, no hardcoded styles
- Business logic in controllers, not widgets
- Handle loading/error/success states
- Ensure responsive design (mobile + web)
- Verify with: flutter test && flutter analyze

Medical safety (if applicable):
- Never generate diagnoses or medication changes
- Include appropriate disclaimers
- Use clinician deferral language

Implement the code now, running tests to verify as you go."

    invoke_agent_interactive "developer" "$prompt" "$task_id" "03-implement"
    
    save_state "implementing" "completed" "$task_id"
    print_success "Implementation stage completed"
    return 0
}

stage_refactor() {
    local task_id="$1"
    local target="${2:-backend}"
    
    print_header "Stage 4: Refactoring"
    save_state "refactoring" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Review the implementation and refactor for quality (TDD refactor phase).

Target: ${target}
Target path: ${target_path}

Check for and improve:
1. Code duplication - extract shared logic
2. Long functions - break into smaller units  
3. Complex conditionals - simplify or extract
4. Naming clarity - rename unclear variables/functions
5. Performance concerns - optimize if needed
6. Error handling completeness

Constraints:
- All tests must still pass after refactoring
- No functional changes, only structural improvements

Verification:
- Backend: cd server && npm test && npm run lint
- Frontend: flutter test && flutter analyze

Review the code and make any refactoring improvements while keeping tests green."

    invoke_agent_interactive "developer" "$prompt" "$task_id" "04-refactor"
    
    save_state "refactoring" "completed" "$task_id"
    print_success "Refactoring stage completed"
    return 0
}

stage_review() {
    local task_id="$1"
    local target="${2:-all}"
    
    print_header "Stage 5: Code Review"
    save_state "reviewing" "in_progress" "$task_id"
    
    local prompt="Perform a thorough code review of all changes made in this task.

Target: ${target}
Backend path: ./server/
Frontend path: ./

Review checklist:

1. CORRECTNESS
   - Logic errors or edge cases missed
   - Null/undefined handling
   - Off-by-one errors
   - Race conditions (async code)

2. SECURITY  
   - Input validation completeness
   - SQL injection (check Prisma usage)
   - XSS vulnerabilities (frontend)
   - Sensitive data exposure
   - Auth/authz bypass potential

3. PERFORMANCE
   - N+1 queries (backend)
   - Unnecessary re-renders (Flutter)
   - Missing indexes for new queries
   - Large payload sizes

4. MAINTAINABILITY
   - Code follows existing patterns
   - Clear naming and structure
   - Appropriate comments (why, not what)
   - No dead code

5. MEDICAL SAFETY (if LLM-related)
   - No diagnostic language
   - Clinician deferral present
   - Disclaimers included

6. TEST COVERAGE
   - Critical paths tested
   - Edge cases covered
   - Error conditions tested

Use git diff to see changes, then provide a detailed review with:
- Severity: CRITICAL / WARNING / SUGGESTION
- File and approximate line
- Issue description
- Suggested fix

If you find issues, fix them directly."

    invoke_agent_interactive "reviewer" "$prompt" "$task_id" "05-review"
    
    save_state "reviewing" "completed" "$task_id"
    print_success "Review stage completed"
    return 0
}

stage_security() {
    local task_id="$1"
    local target="${2:-all}"
    
    print_header "Stage 6: Security Audit"
    save_state "security" "in_progress" "$task_id"
    
    local prompt="Perform a focused security audit on all changes.

Target: ${target}
Backend path: ./server/
Frontend path: ./

Security checklist for health platform:

1. AUTHENTICATION & AUTHORIZATION
   - JWT validation on all protected routes
   - Role checks (patient vs clinician) enforced
   - No privilege escalation paths

2. DATA PROTECTION  
   - PHI (Protected Health Information) handling
   - Data encryption in transit and at rest
   - Audit logging for sensitive operations
   - No PII in logs or error messages

3. INPUT VALIDATION
   - All user inputs sanitized
   - File upload restrictions (if applicable)
   - API rate limiting considered

4. DEPENDENCY SECURITY
   - Run: cd server && npm audit
   - Run: flutter pub deps
   - Check for known vulnerabilities

5. SECRETS MANAGEMENT
   - No hardcoded secrets
   - Environment variables used correctly
   - API keys not exposed to frontend

Report findings with:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- CWE ID (if applicable)  
- Description
- Remediation steps

Fix any critical or high severity issues directly."

    invoke_agent_interactive "security-auditor" "$prompt" "$task_id" "06-security"
    
    save_state "security" "completed" "$task_id"
    print_success "Security audit completed"
    return 0
}

stage_document() {
    local task_id="$1"
    local target="${2:-all}"
    
    print_header "Stage 7: Documentation"
    save_state "documenting" "in_progress" "$task_id"
    
    local prompt="Update all documentation for the changes made.

Target: ${target}
Backend path: ./server/
Frontend path: ./

Documentation requirements:

1. CODE DOCUMENTATION
   - Backend: JSDoc for new public functions in ./server/src/
   - Frontend: dartdoc for new public classes/methods in ./lib/
   - Inline comments for complex logic (explain WHY)

2. README UPDATES
   - ./README.md for project-level changes
   - ./server/README.md for backend-specific changes  
   - New features documented
   - New environment variables listed

3. API DOCUMENTATION
   - New endpoints documented (OpenAPI/Swagger)
   - Request/response examples
   - Error codes and meanings
   - Auth requirements

4. CHANGELOG
   - Update ./CHANGELOG.md at project root
   - Follow Keep a Changelog format
   - Categories: Added, Changed, Fixed, Removed
   - Reference issue/ticket numbers

5. CLAUDE.md FILES (if patterns changed)
   - Update ./CLAUDE.md for frontend changes
   - Update ./server/CLAUDE.md for backend changes

For medical features, also document:
- Safety constraints implemented
- Compliance considerations

Update the documentation files now."

    invoke_agent_interactive "documenter" "$prompt" "$task_id" "07-document"
    
    save_state "documenting" "completed" "$task_id"
    print_success "Documentation stage completed"
    return 0
}

stage_finalize() {
    local task_id="$1"
    local branch_name="$2"
    local target="${3:-all}"
    
    print_header "Stage 8: Finalization"
    save_state "finalizing" "in_progress" "$task_id"
    
    local prompt="Finalize the changes for commit and PR.

Branch: ${branch_name}

Tasks:
1. Run final test suite and confirm all pass
   - Backend: cd server && npm test
   - Frontend: flutter test

2. Run linter and fix any remaining issues
   - Backend: cd server && npm run lint  
   - Frontend: flutter analyze

3. Review all changes with: git status && git diff --stat

4. Stage changes: git add -A

5. Create atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - refactor: for code restructuring
   - test: for test additions

   Format:
   type(scope): brief description
   
   - Detailed point 1
   - Detailed point 2
   
   Refs: #issue-number

6. Show final status and next steps for the user

Do NOT push - let the user review and push manually."

    invoke_agent_interactive "developer" "$prompt" "$task_id" "08-finalize"
    
    save_state "finalizing" "completed" "$task_id"
    print_success "Finalization stage completed"
    return 0
}

#-------------------------------------------------------------------------------
# Single Session Pipeline (Recommended - maintains context)
#-------------------------------------------------------------------------------

run_single_session_pipeline() {
    local requirement="$1"
    local target="${2:-backend}"
    local task_id=$(generate_task_id)
    local branch_name="feature/${task_id}"
    
    print_header "🚀 Starting Single-Session Pipeline"
    echo -e "${BLUE}Task ID:${NC}     $task_id"
    echo -e "${BLUE}Target:${NC}      $target"
    echo -e "${BLUE}Branch:${NC}      $branch_name"
    echo -e "${BLUE}Requirement:${NC} $requirement"
    echo ""
    
    log_info "Starting single-session pipeline for task $task_id"
    
    cd "$PROJECT_ROOT"
    
    # Create feature branch
    print_step "Creating feature branch..."
    git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
    print_success "On branch: $branch_name"
    
    # Build the complete pipeline prompt
    local target_path=$(get_target_path "$target")
    
    local full_prompt="# Development Pipeline Task

## Task ID: ${task_id}
## Requirement: ${requirement}
## Target: ${target} (${target_path})

## Project Structure
- Frontend (Flutter): ${FRONTEND_PATH}
- Backend (NestJS): ${BACKEND_PATH}
- Frontend CLAUDE.md: ./CLAUDE.md  
- Backend CLAUDE.md: ./server/CLAUDE.md

---

You will complete this task following a structured pipeline. Work through each stage in order, completing one before moving to the next.

## Stage 1: Planning (use planner agent)
- Read the CLAUDE.md for the target (./server/CLAUDE.md for backend)
- Explore the existing codebase to understand patterns
- Create a detailed implementation plan including:
  - Files to create/modify
  - Dependencies needed
  - Step-by-step implementation order
  - Test scenarios to cover
- Tell me when planning is complete before moving on

## Stage 2: Test-First Development (use tester agent)
- Write failing tests based on your plan (TDD red phase)
- For backend: create .spec.ts files in ./server/
- For frontend: create test files in ./test/
- Cover happy path, edge cases, and error conditions
- Run tests to confirm they fail: \`cd server && npm test\` or \`flutter test\`
- Tell me when tests are written before moving on

## Stage 3: Implementation (use developer agent)  
- Implement code to make tests pass (TDD green phase)
- Follow existing patterns from CLAUDE.md
- Run tests after each significant change
- Run linter: \`cd server && npm run lint\` or \`flutter analyze\`
- Tell me when implementation is complete

## Stage 4: Refactoring (use developer agent)
- Clean up code while keeping tests green
- Extract duplication, improve naming
- Verify tests still pass
- Tell me when refactoring is complete

## Stage 5: Code Review (use reviewer agent)
- Review all changes with \`git diff\`
- Check for: correctness, security, performance, patterns
- Fix any issues found
- Tell me the review results

## Stage 6: Security Audit (use security-auditor agent)
- Audit for vulnerabilities, especially around data handling
- Run \`cd server && npm audit\` or check dependencies
- Fix any critical/high issues
- Tell me the security results

## Stage 7: Documentation (use documenter agent)
- Add JSDoc/dartdoc to new functions
- Update README if needed
- Update CHANGELOG.md with the changes
- Tell me when documentation is complete

## Stage 8: Finalization (use developer agent)
- Run final tests: \`cd server && npm test\` or \`flutter test\`
- Run final lint check
- Stage changes: \`git add -A\`
- Create commit with conventional format: \`git commit -m \"feat(scope): description\"\`
- Show me the final status

---

Start with Stage 1: Planning. Read the relevant CLAUDE.md first, then explore the codebase and create your plan."

    # Save prompt
    local prompt_file="$LOG_DIR/${task_id}-full-pipeline-prompt.md"
    echo "$full_prompt" > "$prompt_file"
    log_info "Prompt saved to: $prompt_file"
    
    # Copy to clipboard
    if copy_to_clipboard "$full_prompt"; then
        echo -e "${GREEN}✓ Prompt copied to clipboard${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}This runs all stages in ONE Claude session, maintaining context.${NC}"
    echo -e "Prompt saved to: ${BLUE}$prompt_file${NC}"
    echo ""
    echo -e "${PURPLE}── Prompt Preview ──────────────────────────────────────────${NC}"
    echo "$full_prompt" | head -30
    echo -e "${YELLOW}... (see full prompt in clipboard or file)${NC}"
    echo -e "${PURPLE}────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    read -p "$(echo -e ${CYAN}"Press Enter to launch Claude, 'p' to print full prompt: "${NC})" response
    
    if [[ "$response" == "p" ]]; then
        echo "$full_prompt"
        echo ""
        read -p "$(echo -e ${CYAN}"Press Enter to launch Claude: "${NC})"
    fi
    
    echo ""
    echo -e "${GREEN}Launching Claude... Paste the prompt to begin the pipeline.${NC}"
    echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
    
    # Single claude session for entire pipeline
    claude || true
    
    echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
    echo ""
    
    print_header "✅ Pipeline Session Complete"
    echo -e "${GREEN}Task ID:${NC} $task_id"
    echo -e "${GREEN}Branch:${NC}  $branch_name"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review: ${CYAN}git log --oneline -5${NC}"
    echo -e "  2. Push:   ${CYAN}git push -u origin $branch_name${NC}"
    echo -e "  3. PR:     ${CYAN}gh pr create${NC}"
    
    log_success "Single-session pipeline completed for task $task_id"
    return 0
}

#-------------------------------------------------------------------------------
# Full Pipeline Orchestration (Multi-Session with Context Passing)
#-------------------------------------------------------------------------------

run_full_pipeline() {
    local requirement="$1"
    local target="${2:-backend}"
    local task_id=$(generate_task_id)
    local branch_name="feature/${task_id}"
    
    print_header "🚀 Starting Interactive Pipeline"
    echo -e "${BLUE}Task ID:${NC}     $task_id"
    echo -e "${BLUE}Target:${NC}      $target"
    echo -e "${BLUE}Branch:${NC}      $branch_name"
    echo -e "${BLUE}Requirement:${NC} $requirement"
    echo ""
    echo -e "${BLUE}Project Structure:${NC}"
    echo -e "  Frontend (Flutter): $FRONTEND_PATH"
    echo -e "  Backend (NestJS):   $BACKEND_PATH"
    echo ""
    print_warning "This is interactive mode - you will approve all file changes."
    print_info "Each stage opens a Claude session. Complete it, then continue."
    echo ""
    
    log_info "Starting interactive pipeline for task $task_id"
    
    # Ensure we're in project root
    cd "$PROJECT_ROOT"
    
    # Create feature branch
    print_step "Creating feature branch..."
    git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
    print_success "On branch: $branch_name"
    
    # Stage 1: Planning
    if ! wait_for_confirmation "Start Stage 1: Planning?"; then
        save_state "planning" "paused" "$task_id"
        return 0
    fi
    stage_plan "$requirement" "$task_id"
    
    # Stage 2: Write tests first
    if ! wait_for_confirmation "Start Stage 2: Test-First Development?"; then
        save_state "testing" "paused" "$task_id"
        return 0
    fi
    stage_test_first "$task_id" "$target"
    
    # Stage 3: Implementation
    if ! wait_for_confirmation "Start Stage 3: Implementation?"; then
        save_state "implementing" "paused" "$task_id"
        return 0
    fi
    stage_implement "$task_id" "$target"
    
    # Stage 4: Refactoring
    if ! wait_for_confirmation "Start Stage 4: Refactoring?"; then
        save_state "refactoring" "paused" "$task_id"
        return 0
    fi
    stage_refactor "$task_id" "$target"
    
    # Stage 5: Code Review
    if ! wait_for_confirmation "Start Stage 5: Code Review?"; then
        save_state "reviewing" "paused" "$task_id"
        return 0
    fi
    stage_review "$task_id" "$target"
    
    # Stage 6: Security Audit
    if ! wait_for_confirmation "Start Stage 6: Security Audit?"; then
        save_state "security" "paused" "$task_id"
        return 0
    fi
    stage_security "$task_id" "$target"
    
    # Stage 7: Documentation
    if ! wait_for_confirmation "Start Stage 7: Documentation?"; then
        save_state "documenting" "paused" "$task_id"
        return 0
    fi
    stage_document "$task_id" "$target"
    
    # Stage 8: Finalization
    if ! wait_for_confirmation "Start Stage 8: Finalization?"; then
        save_state "finalizing" "paused" "$task_id"
        return 0
    fi
    stage_finalize "$task_id" "$branch_name" "$target"
    
    # Pipeline complete
    print_header "✅ Pipeline Complete"
    echo -e "${GREEN}Task ID:${NC} $task_id"
    echo -e "${GREEN}Branch:${NC}  $branch_name"
    echo -e "${GREEN}Logs:${NC}    $LOG_DIR/${task_id}-*"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review changes:  ${CYAN}git log --oneline -5${NC}"
    echo -e "  2. Push branch:     ${CYAN}git push -u origin $branch_name${NC}"
    echo -e "  3. Create PR:       ${CYAN}gh pr create${NC}"
    echo ""
    
    log_success "Pipeline completed successfully for task $task_id"
    save_state "completed" "success" "$task_id"
    return 0
}

#-------------------------------------------------------------------------------
# Individual Stage Commands
#-------------------------------------------------------------------------------

run_stage() {
    local stage="$1"
    shift
    
    local task_id="${1:-$(generate_task_id)}"
    local target="${2:-backend}"
    
    case "$stage" in
        plan)
            local requirement="$1"
            task_id="${2:-$(generate_task_id)}"
            stage_plan "$requirement" "$task_id"
            ;;
        test)
            stage_test_first "$task_id" "$target"
            ;;
        implement)
            stage_implement "$task_id" "$target"
            ;;
        refactor)
            stage_refactor "$task_id" "$target"
            ;;
        review)
            stage_review "$task_id" "$target"
            ;;
        security)
            stage_security "$task_id" "$target"
            ;;
        document)
            stage_document "$task_id" "$target"
            ;;
        finalize)
            local branch_name="${3:-feature/$task_id}"
            stage_finalize "$task_id" "$branch_name" "$target"
            ;;
        *)
            echo "Unknown stage: $stage"
            echo "Available: plan, test, implement, refactor, review, security, document, finalize"
            return 1
            ;;
    esac
}

#-------------------------------------------------------------------------------
# Quick Commands (Interactive)
#-------------------------------------------------------------------------------

quick_review() {
    local target="${1:-all}"
    local task_id=$(generate_task_id)
    print_header "Quick Code Review"
    
    local prompt="Review all uncommitted changes in the repository.
    
Target: ${target}

Focus on:
- Correctness and logic errors
- Security issues
- Code quality and patterns
- Test coverage

Use 'git diff' to see changes, then provide feedback and fix any issues."

    invoke_agent_interactive "reviewer" "$prompt" "$task_id" "quick-review"
}

quick_test() {
    local target="${1:-all}"
    local task_id=$(generate_task_id)
    print_header "Quick Test Generation"
    
    local prompt="Generate tests for recently modified files.

Target: ${target}

Use 'git diff --name-only' to find changed files, then write appropriate tests for them."

    invoke_agent_interactive "tester" "$prompt" "$task_id" "quick-test"
}

quick_document() {
    local target="${1:-all}"
    local task_id=$(generate_task_id)
    print_header "Quick Documentation Update"
    
    local prompt="Update documentation for all uncommitted changes.

Target: ${target}

Use 'git diff' to see what changed, then update relevant documentation."

    invoke_agent_interactive "documenter" "$prompt" "$task_id" "quick-document"
}

quick_security() {
    local target="${1:-all}"
    local task_id=$(generate_task_id)
    print_header "Quick Security Check"
    
    local prompt="Perform a security audit on all uncommitted changes.

Target: ${target}

Check for vulnerabilities, improper data handling, and security best practices."

    invoke_agent_interactive "security-auditor" "$prompt" "$task_id" "quick-security"
}

quick_lint() {
    local target="${1:-all}"
    print_header "Quick Lint"
    run_lint "$target"
}

quick_test_run() {
    local target="${1:-all}"
    print_header "Quick Test Run"
    run_tests "$target"
}

#-------------------------------------------------------------------------------
# Help and Usage
#-------------------------------------------------------------------------------

show_usage() {
    cat << EOF
${PURPLE}Mystasis Multi-Agent Development Pipeline (Interactive Mode)${NC}

${CYAN}Project Structure:${NC}
  Frontend (Flutter): ./
  Backend (NestJS):   ./server/

${CYAN}Usage:${NC}
  ./scripts/pipeline.sh <command> [options]

${CYAN}Commands:${NC}
  ${GREEN}full${NC} "<requirement>" [target]    ${YELLOW}(Recommended)${NC}
      Run complete pipeline in ONE Claude session
      Context is maintained - Claude remembers all previous stages
      target: backend (default) | frontend | fullstack

  ${GREEN}multi${NC} "<requirement>" [target]
      Run pipeline with SEPARATE Claude session per stage
      You paste the prompt for each stage manually
      Less context maintained between stages

  ${GREEN}stage${NC} <stage-name> [task-id] [target]
      Run a single stage interactively
      Stages: plan, test, implement, refactor, review, security, document, finalize

  ${GREEN}quick${NC} <action> [target]
      Quick interactive actions
      Actions: review, test, document, security, lint, test-run
      target: backend | frontend | all (default)

  ${GREEN}resume${NC} <task-id>
      Resume a paused multi-session pipeline

  ${GREEN}status${NC} [task-id]
      Show pipeline status

  ${GREEN}help${NC}
      Show this help

${CYAN}Examples:${NC}
  # Single-session pipeline (recommended)
  ./scripts/pipeline.sh full "Add biomarker date filtering" backend

  # Multi-session pipeline (separate sessions per stage)  
  ./scripts/pipeline.sh multi "Create trend chart widget" frontend

  # Quick review
  ./scripts/pipeline.sh quick review backend

${CYAN}Pipeline Stages:${NC}
  1. ${BLUE}plan${NC}      - Analyze requirements, create plan
  2. ${BLUE}test${NC}      - Write tests first (TDD)
  3. ${BLUE}implement${NC} - Write code to pass tests
  4. ${BLUE}refactor${NC}  - Clean up code
  5. ${BLUE}review${NC}    - Code review
  6. ${BLUE}security${NC}  - Security audit
  7. ${BLUE}document${NC}  - Update documentation
  8. ${BLUE}finalize${NC}  - Commit changes

${CYAN}Single vs Multi Session:${NC}
  ${GREEN}full/single${NC} - One Claude session for entire pipeline
    ✓ Claude remembers what it did in previous stages
    ✓ Better context, more coherent implementation
    ✓ Fewer prompts to paste
    
  ${GREEN}multi${NC} - Separate Claude session per stage
    ✓ Can pause/resume between stages
    ✓ More control over each stage
    ✗ Each stage starts fresh (no memory)

${CYAN}Files:${NC}
  Config:  .pipeline/config.yaml
  Logs:    .pipeline/logs/
  State:   .pipeline/state/
  Agents:  .claude/agents/

EOF
}

show_status() {
    local task_id="${1:-}"
    
    if [[ -z "$task_id" ]]; then
        print_header "Recent Pipeline Tasks"
        if ls "$STATE_DIR"/*.json 1>/dev/null 2>&1; then
            ls -lt "$STATE_DIR"/*.json 2>/dev/null | head -10 | while read -r line; do
                local file=$(echo "$line" | awk '{print $NF}')
                local task=$(basename "$file" .json)
                local state=$(cat "$file" 2>/dev/null)
                local stage=$(echo "$state" | grep -o '"stage": "[^"]*"' | cut -d'"' -f4)
                local status=$(echo "$state" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)
                
                local status_color="${NC}"
                case "$status" in
                    completed|success) status_color="${GREEN}" ;;
                    paused) status_color="${YELLOW}" ;;
                    failed) status_color="${RED}" ;;
                    in_progress) status_color="${CYAN}" ;;
                esac
                
                echo -e "  ${BLUE}$task${NC}: $stage - ${status_color}${status}${NC}"
            done
        else
            echo "  No pipeline tasks found."
        fi
    else
        local state_file="$STATE_DIR/${task_id}.json"
        if [[ -f "$state_file" ]]; then
            print_header "Task: $task_id"
            cat "$state_file" | python3 -m json.tool 2>/dev/null || cat "$state_file"
            echo ""
            echo "Prompt files:"
            ls -la "$LOG_DIR/${task_id}"*.md 2>/dev/null || echo "  None found"
        else
            echo "Task not found: $task_id"
            return 1
        fi
    fi
}

resume_pipeline() {
    local task_id="$1"
    local state_file="$STATE_DIR/${task_id}.json"
    
    if [[ ! -f "$state_file" ]]; then
        log_error "Task not found: $task_id"
        return 1
    fi
    
    local last_stage=$(grep -o '"stage": "[^"]*"' "$state_file" | cut -d'"' -f4)
    local last_status=$(grep -o '"status": "[^"]*"' "$state_file" | cut -d'"' -f4)
    
    print_header "Resuming Pipeline: $task_id"
    echo "Last stage: $last_stage ($last_status)"
    
    local stages=("planning" "testing" "implementing" "refactoring" "reviewing" "security" "documenting" "finalizing")
    local stage_cmds=("plan" "test" "implement" "refactor" "review" "security" "document" "finalize")
    
    local start_index=0
    for i in "${!stages[@]}"; do
        if [[ "${stages[$i]}" == "$last_stage" ]]; then
            if [[ "$last_status" == "completed" ]]; then
                start_index=$((i + 1))
            else
                start_index=$i
            fi
            break
        fi
    done
    
    if [[ $start_index -ge ${#stages[@]} ]]; then
        print_success "Pipeline already completed!"
        return 0
    fi
    
    echo "Resuming from: ${stages[$start_index]}"
    echo ""
    
    # Run remaining stages
    for ((i=start_index; i<${#stages[@]}; i++)); do
        if ! wait_for_confirmation "Run stage: ${stage_cmds[$i]}?"; then
            save_state "${stages[$i]}" "paused" "$task_id"
            return 0
        fi
        run_stage "${stage_cmds[$i]}" "$task_id" "backend"
    done
    
    print_success "Pipeline resumed and completed!"
}

#-------------------------------------------------------------------------------
# Main Entry Point
#-------------------------------------------------------------------------------

main() {
    local command="${1:-help}"
    shift || true
    
    cd "$PROJECT_ROOT"
    
    case "$command" in
        full|single)
            # Recommended: single session maintains context
            run_single_session_pipeline "$@"
            ;;
        multi)
            # Multi-session: separate Claude session per stage
            run_full_pipeline "$@"
            ;;
        stage)
            run_stage "$@"
            ;;
        quick)
            local action="${1:-review}"
            local target="${2:-all}"
            case "$action" in
                review) quick_review "$target" ;;
                test) quick_test "$target" ;;
                document) quick_document "$target" ;;
                security) quick_security "$target" ;;
                lint) quick_lint "$target" ;;
                test-run) quick_test_run "$target" ;;
                *) echo "Unknown action: $action" ;;
            esac
            ;;
        resume)
            resume_pipeline "$@"
            ;;
        status)
            show_status "${1:-}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            echo "Unknown command: $command"
            show_usage
            return 1
            ;;
    esac
}

main "$@"