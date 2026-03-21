# Development Pipeline Task

## Task ID: task-20260119-090612-22eaa46a
## Requirement: Implement Clinic Management with Multi-Tenancy                                                                                                                                                    
                                                                                                                                                                                                          
  Implement clinic support to enable multi-tenant data isolation:                                                                                                                                         
                                                                                                                                                                                                          
  1. Prisma Schema Changes (prisma/schema.prisma):                                                                                                                                                        
    - Add Clinic model (id, name, address, phone, createdAt, updatedAt)                                                                                                                                   
    - Add clinicId field to User model (nullable for patients, required for clinicians)                                                                                                                   
    - Add relation: Clinic has many Users                                                                                                                                                                 
  2. ClinicsModule (src/modules/clinics/):                                                                                                                                                                
    - ClinicsController: CRUD endpoints (create, findAll, findOne, update, delete)                                                                                                                        
    - ClinicsService: Business logic with Prisma                                                                                                                                                          
    - DTOs: CreateClinicDto, UpdateClinicDto                                                                                                                                                              
    - RBAC: Only clinicians can manage clinics                                                                                                                                                            
  3. Patient Enrollment:                                                                                                                                                                                  
    - Add POST /clinics/:clinicId/patients/:patientId to assign patient to clinic                                                                                                                         
    - Add DELETE /clinics/:clinicId/patients/:patientId to remove assignment                                                                                                                              
    - Validate clinician owns the clinic before enrollment                                                                                                                                                
  4. Fix Analytics TODO (src/modules/analytics/analytics.controller.ts:62):                                                                                                                               
    - Filter analytics queries by clinician's clinicId                                                                                                                                                    
    - Clinicians only see data for patients in their clinic                                                                                                                                               
  5. Tests: Unit + integration tests following existing TDD patterns                                                                                                                                      
                                                                                                                                                                                                          
  Run npx prisma migrate dev after schema changes. Import AuthModule in new modules that use JwtAuthGuard.
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
