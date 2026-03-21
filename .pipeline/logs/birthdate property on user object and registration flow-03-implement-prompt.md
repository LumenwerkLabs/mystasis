Use the developer agent for this task.

## Task ID: birthdate property on user object and registration flow
## Stage: 03-implement

## Project Structure
- Frontend (Flutter): /Users/luciaschlegel/development/perso/mystasis
- Backend (NestJS): /Users/luciaschlegel/development/perso/mystasis/server
- Frontend CLAUDE.md: ./CLAUDE.md
- Backend CLAUDE.md: ./server/CLAUDE.md

## Instructions
Implement the feature to pass all tests written in the previous stage.

Target: backend
Target path: /Users/luciaschlegel/development/perso/mystasis/server

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

Implement the code now, running tests to verify as you go.

Please proceed with the task. I will review and approve any file changes.
