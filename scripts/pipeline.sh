#!/bin/bash

#===============================================================================
# Mystasis Multi-Agent Development Pipeline
# 
# A complete orchestration system for feature development following
# best practices: Plan → Test → Implement → Review → Document → Deploy
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

#-------------------------------------------------------------------------------
# Stack-Specific Commands
#-------------------------------------------------------------------------------

run_backend_tests() {
    print_step "Running backend tests..."
    cd "$BACKEND_PATH" && npm test
}

run_frontend_tests() {
    print_step "Running frontend tests..."
    cd "$FRONTEND_PATH" && flutter test
}

run_backend_lint() {
    print_step "Running backend linter..."
    cd "$BACKEND_PATH" && npm run lint
}

run_frontend_lint() {
    print_step "Running frontend analyzer..."
    cd "$FRONTEND_PATH" && flutter analyze
}

run_backend_build() {
    print_step "Building backend..."
    cd "$BACKEND_PATH" && npm run build
}

run_frontend_build() {
    print_step "Building frontend..."
    cd "$FRONTEND_PATH" && flutter build web --release
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

run_build() {
    local target="$1"
    case "$target" in
        backend|server)
            run_backend_build
            ;;
        frontend|flutter)
            run_frontend_build
            ;;
        fullstack|all)
            run_backend_build
            run_frontend_build
            ;;
    esac
}

#-------------------------------------------------------------------------------
# Agent Invocation Functions
#-------------------------------------------------------------------------------

invoke_agent() {
    local agent_name="$1"
    local prompt="$2"
    local output_file="$3"
    local task_id="$4"
    
    print_step "Invoking ${agent_name} agent..."
    log_info "Agent: $agent_name | Task: $task_id"
    
    # Build the full prompt with agent context
    local full_prompt="Use the ${agent_name} agent for this task.

${prompt}

Task ID: ${task_id}
Timestamp: $(date -Iseconds)

Project Structure:
- Frontend (Flutter): $FRONTEND_PATH
- Backend (NestJS): $BACKEND_PATH"

    # Invoke Claude Code with the agent
    if claude -p "$full_prompt" --output-format json > "$output_file" 2>&1; then
        log_success "$agent_name agent completed successfully"
        return 0
    else
        log_error "$agent_name agent failed"
        return 1
    fi
}

invoke_agent_interactive() {
    local agent_name="$1"
    local prompt="$2"
    
    print_step "Starting interactive session with ${agent_name} agent..."
    
    claude -p "Use the ${agent_name} agent. 

Project Structure:
- Frontend (Flutter): $FRONTEND_PATH  
- Backend (NestJS): $BACKEND_PATH

${prompt}"
}

#-------------------------------------------------------------------------------
# Pipeline Stages
#-------------------------------------------------------------------------------

stage_plan() {
    local requirement="$1"
    local task_id="$2"
    local output_file="$LOG_DIR/${task_id}-01-plan.json"
    
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

Project Structure:
- Frontend (Flutter): Root directory (./)
  - lib/ for source code
  - CLAUDE.md for frontend context
- Backend (NestJS): ./server/
  - src/modules/ for feature modules
  - server/CLAUDE.md for backend context

Consider the mystasis architecture:
- Backend: NestJS modular monolith in ./server (modules/health-data, modules/llm, etc.)
- Frontend: Flutter with feature-first structure in ./lib
- Medical safety constraints for any LLM-related changes"

    if invoke_agent "planner" "$prompt" "$output_file" "$task_id"; then
        save_state "planning" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "planning" "failed" "$task_id"
        return 1
    fi
}

stage_test_first() {
    local plan_file="$1"
    local task_id="$2"
    local target="${3:-backend}" # backend or frontend
    local output_file="$LOG_DIR/${task_id}-02-tests.json"
    
    print_header "Stage 2: Test-First Development"
    save_state "testing" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Based on the implementation plan, write comprehensive tests BEFORE implementation.

Plan file: ${plan_file}
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
1. Tests must be written to FAIL initially (TDD red phase)
2. Cover happy path, edge cases, and error conditions
3. Include test descriptions that document expected behavior
4. Mock external dependencies (API calls, database, LLM)
5. For medical features, test safety constraint enforcement"

    if invoke_agent "tester" "$prompt" "$output_file" "$task_id"; then
        save_state "testing" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "testing" "failed" "$task_id"
        return 1
    fi
}

stage_implement() {
    local plan_file="$1"
    local test_file="$2"
    local task_id="$3"
    local target="${4:-backend}"
    local output_file="$LOG_DIR/${task_id}-03-implement.json"
    
    print_header "Stage 3: Implementation"
    save_state "implementing" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Implement the feature to pass all tests.

Plan: ${plan_file}
Tests: ${test_file}
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
- Run: cd server && npm test && npm run lint

For frontend (./):
- Use theme tokens, no hardcoded styles
- Business logic in controllers, not widgets
- Handle loading/error/success states
- Ensure responsive design (mobile + web)
- Run: flutter test && flutter analyze

Medical safety (if applicable):
- Never generate diagnoses or medication changes
- Include appropriate disclaimers
- Defer to clinician language"

    if invoke_agent "developer" "$prompt" "$output_file" "$task_id"; then
        save_state "implementing" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "implementing" "failed" "$task_id"
        return 1
    fi
}

stage_refactor() {
    local task_id="$1"
    local target="${2:-backend}"
    local output_file="$LOG_DIR/${task_id}-04-refactor.json"
    
    print_header "Stage 4: Refactoring"
    save_state "refactoring" "in_progress" "$task_id"
    
    local target_path=$(get_target_path "$target")
    
    local prompt="Review the implementation and refactor for quality (TDD refactor phase).

Target: ${target}
Target path: ${target_path}

Check for:
1. Code duplication - extract shared logic
2. Long functions - break into smaller units
3. Complex conditionals - simplify or extract
4. Naming clarity - rename unclear variables/functions
5. Performance concerns - optimize if needed
6. Error handling completeness

Constraints:
- All tests must still pass after refactoring
- No functional changes, only structural improvements
- Run linter after changes

Verification:
- Backend: cd server && npm test && npm run lint
- Frontend: flutter test && flutter analyze"

    if invoke_agent "developer" "$prompt" "$output_file" "$task_id"; then
        save_state "refactoring" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "refactoring" "failed" "$task_id"
        return 1
    fi
}

stage_review() {
    local task_id="$1"
    local target="${2:-all}"
    local output_file="$LOG_DIR/${task_id}-05-review.json"
    
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
   - SQL injection (check Prisma usage in ./server/)
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

Output format for each issue:
- Severity: CRITICAL / WARNING / SUGGESTION
- File: path/to/file (relative to project root)
- Line: approximate line number
- Issue: description
- Fix: suggested resolution"

    if invoke_agent "reviewer" "$prompt" "$output_file" "$task_id"; then
        save_state "reviewing" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "reviewing" "failed" "$task_id"
        return 1
    fi
}

stage_security() {
    local task_id="$1"
    local target="${2:-all}"
    local output_file="$LOG_DIR/${task_id}-06-security.json"
    
    print_header "Stage 6: Security Audit"
    save_state "security" "in_progress" "$task_id"
    
    local prompt="Perform a focused security audit on all changes.

Target: ${target}
Backend path: ./server/
Frontend path: ./

Security checklist for health platform:

1. AUTHENTICATION & AUTHORIZATION
   - JWT validation on all protected routes (server/src/common/guards/)
   - Role checks (patient vs clinician) enforced
   - No privilege escalation paths

2. DATA PROTECTION
   - PHI (Protected Health Information) handling
   - Data encryption in transit and at rest
   - Audit logging for sensitive operations
   - No PII in logs or error messages

3. INPUT VALIDATION
   - All user inputs sanitized (server/src/modules/*/dto/)
   - File upload restrictions (if applicable)
   - API rate limiting considered

4. DEPENDENCY SECURITY
   - Backend: cd server && npm audit
   - Frontend: flutter pub deps
   - Check for known vulnerabilities

5. SECRETS MANAGEMENT
   - No hardcoded secrets
   - Environment variables used correctly
   - API keys not exposed to frontend

Report any findings with:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- CWE ID (if applicable)
- Description
- Remediation steps"

    if invoke_agent "security-auditor" "$prompt" "$output_file" "$task_id"; then
        save_state "security" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "security" "failed" "$task_id"
        return 1
    fi
}

stage_document() {
    local task_id="$1"
    local target="${2:-all}"
    local output_file="$LOG_DIR/${task_id}-07-document.json"
    
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
   - New endpoints documented (OpenAPI/Swagger in ./server/)
   - Request/response examples
   - Error codes and meanings
   - Auth requirements

4. CHANGELOG
   - ./CHANGELOG.md at project root
   - Entry following Keep a Changelog format
   - Categorize: Added, Changed, Fixed, Removed
   - Reference issue/ticket numbers

5. CLAUDE.md FILES
   - Update ./CLAUDE.md if frontend patterns changed
   - Update ./server/CLAUDE.md if backend patterns changed

For medical features, also document:
- Safety constraints implemented
- Clinical validation requirements
- Compliance considerations"

    if invoke_agent "documenter" "$prompt" "$output_file" "$task_id"; then
        save_state "documenting" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "documenting" "failed" "$task_id"
        return 1
    fi
}

stage_finalize() {
    local task_id="$1"
    local branch_name="$2"
    local target="${3:-all}"
    local output_file="$LOG_DIR/${task_id}-08-finalize.json"
    
    print_header "Stage 8: Finalization"
    save_state "finalizing" "in_progress" "$task_id"
    
    local prompt="Finalize the changes for commit and PR.

Tasks:
1. Run final test suite and confirm all pass
   - Backend: cd server && npm test
   - Frontend: flutter test

2. Run linter and fix any remaining issues
   - Backend: cd server && npm run lint
   - Frontend: flutter analyze

3. Build and verify
   - Backend: cd server && npm run build
   - Frontend: flutter build web --release

4. Stage all changes with git add

5. Create atomic commits with conventional commit messages:
   - feat: for new features
   - fix: for bug fixes
   - docs: for documentation
   - refactor: for code restructuring
   - test: for test additions
   
6. Push to branch: ${branch_name}

7. Prepare PR description with:
   - Summary of changes
   - Testing performed
   - Screenshots (if UI changes)
   - Checklist for reviewer

Commit message format:
type(scope): brief description

- Detailed bullet point 1
- Detailed bullet point 2

Refs: #issue-number"

    if invoke_agent "developer" "$prompt" "$output_file" "$task_id"; then
        save_state "finalizing" "completed" "$task_id"
        echo "$output_file"
        return 0
    else
        save_state "finalizing" "failed" "$task_id"
        return 1
    fi
}

#-------------------------------------------------------------------------------
# Full Pipeline Orchestration
#-------------------------------------------------------------------------------

run_full_pipeline() {
    local requirement="$1"
    local target="${2:-backend}"
    local task_id=$(generate_task_id)
    local branch_name="feature/${task_id}"
    
    print_header "🚀 Starting Full Pipeline"
    echo -e "${BLUE}Task ID:${NC} $task_id"
    echo -e "${BLUE}Target:${NC} $target"
    echo -e "${BLUE}Branch:${NC} $branch_name"
    echo -e "${BLUE}Requirement:${NC} $requirement"
    echo ""
    echo -e "${BLUE}Project Structure:${NC}"
    echo -e "  Frontend (Flutter): $FRONTEND_PATH"
    echo -e "  Backend (NestJS):   $BACKEND_PATH"
    echo ""
    
    log_info "Starting pipeline for task $task_id"
    
    # Ensure we're in project root
    cd "$PROJECT_ROOT"
    
    # Create feature branch
    print_step "Creating feature branch..."
    git checkout -b "$branch_name" 2>/dev/null || git checkout "$branch_name"
    
    # Stage 1: Planning
    local plan_output
    if ! plan_output=$(stage_plan "$requirement" "$task_id"); then
        log_error "Pipeline failed at planning stage"
        return 1
    fi
    
    # Stage 2: Write tests first
    local test_output
    if ! test_output=$(stage_test_first "$plan_output" "$task_id" "$target"); then
        log_error "Pipeline failed at test-first stage"
        return 1
    fi
    
    # Stage 3: Implementation
    local impl_output
    if ! impl_output=$(stage_implement "$plan_output" "$test_output" "$task_id" "$target"); then
        log_error "Pipeline failed at implementation stage"
        return 1
    fi
    
    # Stage 4: Refactoring
    if ! stage_refactor "$task_id" "$target"; then
        log_error "Pipeline failed at refactoring stage"
        return 1
    fi
    
    # Stage 5: Code Review
    local review_output
    if ! review_output=$(stage_review "$task_id" "$target"); then
        log_error "Pipeline failed at review stage"
        return 1
    fi
    
    # Check for critical issues
    if grep -q '"severity": "CRITICAL"' "$review_output" 2>/dev/null; then
        log_error "Critical issues found in review. Please address before continuing."
        echo -e "${RED}Review the issues in: $review_output${NC}"
        return 1
    fi
    
    # Stage 6: Security Audit
    local security_output
    if ! security_output=$(stage_security "$task_id" "$target"); then
        log_warn "Security audit had issues - review recommended"
    fi
    
    # Check for critical security issues
    if grep -q '"severity": "CRITICAL"' "$security_output" 2>/dev/null; then
        log_error "Critical security issues found. Must address before continuing."
        echo -e "${RED}Review the issues in: $security_output${NC}"
        return 1
    fi
    
    # Stage 7: Documentation
    if ! stage_document "$task_id" "$target"; then
        log_warn "Documentation stage had issues - review recommended"
    fi
    
    # Stage 8: Finalization
    if ! stage_finalize "$task_id" "$branch_name" "$target"; then
        log_error "Pipeline failed at finalization stage"
        return 1
    fi
    
    # Pipeline complete
    print_header "✅ Pipeline Complete"
    echo -e "${GREEN}Task ID:${NC} $task_id"
    echo -e "${GREEN}Branch:${NC} $branch_name"
    echo -e "${GREEN}Logs:${NC} $LOG_DIR/${task_id}-*.json"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Review changes: ${CYAN}git diff main${NC}"
    echo -e "  2. Push branch: ${CYAN}git push -u origin $branch_name${NC}"
    echo -e "  3. Create PR: ${CYAN}gh pr create${NC}"
    
    log_success "Pipeline completed successfully for task $task_id"
    return 0
}

#-------------------------------------------------------------------------------
# Individual Stage Commands
#-------------------------------------------------------------------------------

run_stage() {
    local stage="$1"
    shift
    
    case "$stage" in
        plan)
            local requirement="$1"
            local task_id="${2:-$(generate_task_id)}"
            stage_plan "$requirement" "$task_id"
            ;;
        test)
            local plan_file="$1"
            local task_id="$2"
            local target="${3:-backend}"
            stage_test_first "$plan_file" "$task_id" "$target"
            ;;
        implement)
            local plan_file="$1"
            local test_file="$2"
            local task_id="$3"
            local target="${4:-backend}"
            stage_implement "$plan_file" "$test_file" "$task_id" "$target"
            ;;
        refactor)
            local task_id="$1"
            local target="${2:-backend}"
            stage_refactor "$task_id" "$target"
            ;;
        review)
            local task_id="$1"
            local target="${2:-all}"
            stage_review "$task_id" "$target"
            ;;
        security)
            local task_id="$1"
            local target="${2:-all}"
            stage_security "$task_id" "$target"
            ;;
        document)
            local task_id="$1"
            local target="${2:-all}"
            stage_document "$task_id" "$target"
            ;;
        finalize)
            local task_id="$1"
            local branch_name="$2"
            local target="${3:-all}"
            stage_finalize "$task_id" "$branch_name" "$target"
            ;;
        *)
            echo "Unknown stage: $stage"
            echo "Available stages: plan, test, implement, refactor, review, security, document, finalize"
            return 1
            ;;
    esac
}

#-------------------------------------------------------------------------------
# Quick Commands
#-------------------------------------------------------------------------------

quick_review() {
    local target="${1:-all}"
    print_header "Quick Code Review"
    invoke_agent_interactive "reviewer" "Review all uncommitted changes. Focus on correctness, security, and code quality. Target: ${target}"
}

quick_test() {
    local target="${1:-all}"
    print_header "Quick Test Generation"
    invoke_agent_interactive "tester" "Generate tests for the most recently modified files. Target: ${target}"
}

quick_document() {
    local target="${1:-all}"
    print_header "Quick Documentation Update"
    invoke_agent_interactive "documenter" "Update documentation for all uncommitted changes. Target: ${target}"
}

quick_security() {
    local target="${1:-all}"
    print_header "Quick Security Check"
    invoke_agent_interactive "security-auditor" "Perform a security audit on all uncommitted changes. Target: ${target}"
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
${PURPLE}Mystasis Multi-Agent Development Pipeline${NC}

${CYAN}Project Structure:${NC}
  Frontend (Flutter): ./
  Backend (NestJS):   ./server/

${CYAN}Usage:${NC}
  ./scripts/pipeline.sh <command> [options]

${CYAN}Commands:${NC}
  ${GREEN}full${NC} "<requirement>" [target]
      Run the complete pipeline for a feature requirement
      target: backend (default) | frontend | fullstack

  ${GREEN}stage${NC} <stage-name> [options]
      Run a single pipeline stage
      Stages: plan, test, implement, refactor, review, security, document, finalize

  ${GREEN}quick${NC} <action> [target]
      Quick actions for common tasks
      Actions: review, test, document, security, lint, test-run
      target: backend | frontend | all (default)

  ${GREEN}resume${NC} <task-id>
      Resume a failed or interrupted pipeline from last successful stage

  ${GREEN}status${NC} [task-id]
      Show status of current or specified task

  ${GREEN}help${NC}
      Show this help message

${CYAN}Examples:${NC}
  # Run full pipeline for a backend feature
  ./scripts/pipeline.sh full "Add endpoint to fetch biomarker trends by date range" backend

  # Run full pipeline for frontend feature
  ./scripts/pipeline.sh full "Create biomarker trend chart component" frontend

  # Run full pipeline for fullstack feature
  ./scripts/pipeline.sh full "Implement patient notifications" fullstack

  # Run only the planning stage
  ./scripts/pipeline.sh stage plan "Implement patient notification system"

  # Quick review of current changes (all)
  ./scripts/pipeline.sh quick review

  # Quick review of backend only
  ./scripts/pipeline.sh quick review backend

  # Run tests
  ./scripts/pipeline.sh quick test-run backend
  ./scripts/pipeline.sh quick test-run frontend

  # Check pipeline status
  ./scripts/pipeline.sh status task-20240115-143022-a1b2c3d4

${CYAN}Pipeline Stages:${NC}
  1. ${BLUE}plan${NC}      - Analyze requirements and create implementation plan
  2. ${BLUE}test${NC}      - Write tests before implementation (TDD)
  3. ${BLUE}implement${NC} - Write code to pass tests
  4. ${BLUE}refactor${NC}  - Clean up code while keeping tests green
  5. ${BLUE}review${NC}    - Automated code review
  6. ${BLUE}security${NC}  - Security audit
  7. ${BLUE}document${NC}  - Update documentation
  8. ${BLUE}finalize${NC}  - Commit and prepare PR

${CYAN}Targets:${NC}
  backend   - NestJS server in ./server/
  frontend  - Flutter app in ./
  fullstack - Both backend and frontend
  all       - Alias for fullstack

${CYAN}Configuration:${NC}
  Pipeline config: .pipeline/config.yaml
  Pipeline logs:   .pipeline/logs/
  Pipeline state:  .pipeline/state/
  Agent definitions: .claude/agents/
  Backend CLAUDE.md: ./server/CLAUDE.md
  Frontend CLAUDE.md: ./CLAUDE.md

EOF
}

show_status() {
    local task_id="${1:-}"
    
    if [[ -z "$task_id" ]]; then
        # Show all recent tasks
        print_header "Recent Pipeline Tasks"
        if ls "$STATE_DIR"/*.json 1>/dev/null 2>&1; then
            ls -lt "$STATE_DIR"/*.json 2>/dev/null | head -10 | while read -r line; do
                local file=$(echo "$line" | awk '{print $NF}')
                local task=$(basename "$file" .json)
                local state=$(cat "$file" 2>/dev/null)
                local stage=$(echo "$state" | grep -o '"stage": "[^"]*"' | cut -d'"' -f4)
                local status=$(echo "$state" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)
                echo -e "  ${BLUE}$task${NC}: $stage - $status"
            done
        else
            echo "  No pipeline tasks found."
        fi
    else
        # Show specific task
        local state_file="$STATE_DIR/${task_id}.json"
        if [[ -f "$state_file" ]]; then
            print_header "Task Status: $task_id"
            cat "$state_file"
            echo ""
            echo "Log files:"
            ls -la "$LOG_DIR/${task_id}"*.json 2>/dev/null || echo "  No log files found"
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
    
    # Determine next stage
    local stages=("planning" "testing" "implementing" "refactoring" "reviewing" "security" "documenting" "finalizing")
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
        echo "Pipeline already completed!"
        return 0
    fi
    
    echo "Resuming from stage: ${stages[$start_index]}"
    echo ""
    echo "To continue manually, run:"
    echo "  ./scripts/pipeline.sh stage ${stages[$start_index]%ing} $task_id"
}

#-------------------------------------------------------------------------------
# Main Entry Point
#-------------------------------------------------------------------------------

main() {
    local command="${1:-help}"
    shift || true
    
    # Ensure we're in project root
    cd "$PROJECT_ROOT"
    
    case "$command" in
        full)
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
                *) echo "Unknown quick action: $action" ;;
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
