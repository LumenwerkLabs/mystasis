// Jest setup file - automatically restore mocks before afterEach runs
// This ensures that mocks don't leak into afterEach cleanup code

beforeEach(() => {
  // Store reference to current mocks so they can be restored
});

afterEach(() => {
  // Restore all mocks after each test
  // This runs before user-defined afterEach in the order Jest hooks execute
  jest.restoreAllMocks();
});
