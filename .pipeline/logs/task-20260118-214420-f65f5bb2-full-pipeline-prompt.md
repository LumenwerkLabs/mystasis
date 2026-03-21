# Development Pipeline Task

## Task ID: task-20260118-214420-f65f5bb2
## Requirement: Implement AnalyticsController for cohort-level insights following established patterns.                                       
                                                                                                                                                
  Create the analytics module for clinician dashboards with cohort-level patient insights.                                                      
                                                                                                                                                
  Create:                                                                                                                                       
  1. TDD spec file: analytics.controller.spec.ts (follow alerts.controller.spec.ts pattern)                                                     
  2. DTOs in src/modules/analytics/dto/:                                                                                                        
     - cohort-summary.dto.ts (response DTO with patient count, avg biomarkers, alert stats)                                                     
     - risk-distribution.dto.ts (response DTO with risk level counts)                                                                           
     - get-analytics-query.dto.ts (startDate?, endDate?, biomarkerType?)                                                                        
  3. analytics.service.ts with methods:                                                                                                         
     - getCohortSummary(clinicId, dateRange?) - aggregate stats across clinic patients                                                          
     - getRiskDistribution(clinicId) - patients grouped by risk level (LOW, MEDIUM, HIGH, CRITICAL)                                             
     - getAlertStatistics(clinicId, dateRange?) - alert counts by status/severity                                                               
     - getTrendSummary(clinicId, biomarkerType, dateRange) - population trend for biomarker                                                     
  4. analytics.controller.ts with endpoints:                                                                                                    
     - GET /analytics/cohort/:clinicId/summary - cohort summary stats (CLINICIAN only)                                                          
     - GET /analytics/cohort/:clinicId/risk-distribution - risk level breakdown (CLINICIAN only)                                                
     - GET /analytics/cohort/:clinicId/alerts - alert statistics (CLINICIAN only)                                                               
     - GET /analytics/cohort/:clinicId/trends/:type - population biomarker trends (CLINICIAN only)                                              
  5. analytics.module.ts - register controller and service                                                                                      
                                                                                                                                                
  Access control: All endpoints CLINICIAN only. Clinicians should only access their own clinic's data.                                          
  Use JwtAuthGuard, RolesGuard, @Roles(CLINICIAN), ParseUUIDPipe, ParseEnumPipe.                                                                
                                                                                                                                                
  Service should aggregate data from:                                                                                                           
  - UsersService (patient counts per clinic)                                                                                                    
  - HealthDataService (biomarker aggregates)                                                                                                    
  - AlertsService (alert statistics)                                                                                                            
                                                                                                                                                
  ## Target: backend (/Users/luciaschlegel/development/perso/mystasis/server)                                                                   
                                                                                                                                                
  ## Notes                                                                                                                                      
  - Check if Clinic model exists in schema.prisma; if not, filter by clinicianId instead                                                        
  - Follow medical safety constraints - no patient-identifying info in aggregates                                                               
  - All responses should be anonymized/aggregated data only 
## Target: backend (/Users/luciaschlegel/development/perso/mystasis/server)

## Project Structure
- Frontend (Flutter): /Users/luciaschlegel/development/perso/mystasis
- Backend (NestJS): /Users/luciaschlegel/development/perso/mystasis/server
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
- Run tests to confirm they fail: `cd server && npm test` or `flutter test`
- Tell me when tests are written before moving on

## Stage 3: Implementation (use developer agent)  
- Implement code to make tests pass (TDD green phase)
- Follow existing patterns from CLAUDE.md
- Run tests after each significant change
- Run linter: `cd server && npm run lint` or `flutter analyze`
- Tell me when implementation is complete

## Stage 4: Refactoring (use developer agent)
- Clean up code while keeping tests green
- Extract duplication, improve naming
- Verify tests still pass
- Tell me when refactoring is complete

## Stage 5: Code Review (use reviewer agent)
- Review all changes with `git diff`
- Check for: correctness, security, performance, patterns
- Fix any issues found
- Tell me the review results

## Stage 6: Security Audit (use security-auditor agent)
- Audit for vulnerabilities, especially around data handling
- Run `cd server && npm audit` or check dependencies
- Fix any critical/high issues
- Tell me the security results

## Stage 7: Documentation (use documenter agent)
- Add JSDoc/dartdoc to new functions
- Update README if needed
- Update CHANGELOG.md with the changes
- Tell me when documentation is complete

## Stage 8: Finalization (use developer agent)
- Run final tests: `cd server && npm test` or `flutter test`
- Run final lint check
- Stage changes: `git add -A`
- Create commit with conventional format: `git commit -m "feat(scope): description"`
- Show me the final status

---

Start with Stage 1: Planning. Read the relevant CLAUDE.md first, then explore the codebase and create your plan.
