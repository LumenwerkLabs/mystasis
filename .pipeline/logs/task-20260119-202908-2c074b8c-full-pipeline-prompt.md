# Development Pipeline Task

## Task ID: task-20260119-202908-2c074b8c
## Requirement: Implement the Users Controller for the Mystasis Backend                                                                                 
                                                                                                                                                
  Context                                                                                                                                       
                                                                                                                                                
  The file server/src/modules/users/users.controller.ts exists but is empty (0 bytes). The users.service.ts already has full implementation with
   methods for user CRUD operations. You need to expose these service methods via REST endpoints.                                               
                                                                                                                                                
  Requirements                                                                                                                                  
                                                                                                                                                
  Implement the following endpoints in server/src/modules/users/users.controller.ts:                                                            
                                                                                                                                                
  1. GET /users/:id - Get user profile by ID                                                                                                    
    - Clinicians can view any user in their clinic                                                                                              
    - Patients can only view their own profile                                                                                                  
    - Return user data (excluding password hash)                                                                                                
  2. PATCH /users/:id - Update user profile                                                                                                     
    - Users can update their own profile (name, birthdate, etc.)                                                                                
    - Clinicians can update role for users in their clinic                                                                                      
    - Validate input with DTOs                                                                                                                  
  3. DELETE /users/:id - Delete user account                                                                                                    
    - Users can delete their own account                                                                                                        
    - Clinicians can delete patients in their clinic                                                                                            
    - Soft delete preferred if supported                                                                                                        
  4. GET /users - List users (clinician only)                                                                                                   
    - Clinicians see patients in their clinics                                                                                                  
    - Support pagination (limit, offset)                                                                                                        
    - Support filtering by clinic ID                                                                                                            
                                                                                                                                                
  Technical Requirements                                                                                                                        
                                                                                                                                                
  - Use existing patterns from other controllers (e.g., clinics.controller.ts, health-data.controller.ts)                                       
  - Apply @UseGuards(JwtAuthGuard) for all endpoints                                                                                            
  - Apply @Roles() decorator where role restrictions apply                                                                                      
  - Use @CurrentUser() decorator to get authenticated user                                                                                      
  - Add full Swagger documentation (@ApiTags, @ApiOperation, @ApiResponse, @ApiBearerAuth)                                                      
  - Create/update DTOs in server/src/modules/users/dto/ for request validation                                                                  
  - Use class-validator decorators for DTO validation                                                                                           
  - Handle errors appropriately (404 for not found, 403 for forbidden)                                                                          
  - Ensure patients cannot access other patients' data
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
