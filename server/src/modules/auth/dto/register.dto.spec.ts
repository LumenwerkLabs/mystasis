import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * TDD Tests for RegisterDto
 *
 * These tests define the expected behavior of RegisterDto validation:
 * 1. Email validation - must be valid email format
 * 2. Password validation - minimum length, complexity requirements
 * 3. Optional firstName and lastName
 *
 * SECURITY NOTE: Role field is intentionally excluded from registration.
 * All users register as PATIENT by default. Role elevation requires admin action.
 *
 * Password requirements:
 * - Minimum 8 characters
 * - Must contain at least one letter
 * - Must contain at least one number
 *
 * RED PHASE: These tests will fail until RegisterDto is implemented.
 */

describe('RegisterDto', () => {
  // DTO will be imported dynamically
  let RegisterDto: new () => {
    email?: string;
    password?: string;
    birthdate?: string;
    firstName?: string;
    lastName?: string;
  };

  beforeAll(async () => {
    try {
      const module = await import('./register.dto');
      RegisterDto = module.RegisterDto;
    } catch {
      // Expected to fail until implementation exists
    }
  });

  describe('module exports', () => {
    it('should export RegisterDto class', () => {
      expect(RegisterDto).toBeDefined();
    });
  });

  // ============================================
  // VALID DATA TESTS
  // ============================================

  describe('valid registration data', () => {
    it('should pass validation with valid email, password, and birthdate', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should pass validation with all fields provided', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should pass validation without optional firstName', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should pass validation without optional lastName', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        firstName: 'John',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  // ============================================
  // EMAIL VALIDATION TESTS
  // ============================================

  describe('email validation', () => {
    it('should reject missing email', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject empty email', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: '',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject invalid email format - no @', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'invalidemail.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject invalid email format - no domain', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject invalid email format - no local part', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: '@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should reject email with spaces', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user @example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should accept valid email formats', async () => {
      // Arrange
      if (!RegisterDto) return;

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user123@example.co.uk',
      ];

      for (const email of validEmails) {
        const dto = plainToInstance(RegisterDto, {
          email,
          password: 'SecurePass123',
          birthdate: '1990-01-15',
        });

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.filter((e) => e.property === 'email').length).toBe(0);
      }
    });
  });

  // ============================================
  // PASSWORD VALIDATION TESTS
  // ============================================

  describe('password validation', () => {
    it('should reject missing password', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject empty password', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: '',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject password shorter than 8 characters', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'Pass1', // Only 5 chars
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject password exactly 7 characters', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'Pass12a', // 7 chars
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should accept password exactly 8 characters with letter and number', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'Pass123a', // 8 chars with letter and number
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'password').length).toBe(0);
    });

    it('should reject password without any letters', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: '12345678', // Numbers only
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should reject password without any numbers', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'PasswordOnly', // Letters only
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should accept password with letters and numbers', async () => {
      // Arrange
      if (!RegisterDto) return;

      const validPasswords = [
        'Password1',
        '1Password',
        'Pass1word',
        'p1a2s3s4w5o6r7d8',
        'UPPERCASE1',
        'lowercase1',
      ];

      for (const password of validPasswords) {
        const dto = plainToInstance(RegisterDto, {
          email: 'user@example.com',
          password,
          birthdate: '1990-01-15',
        });

        // Act
        const errors = await validate(dto);

        // Assert
        expect(errors.filter((e) => e.property === 'password').length).toBe(0);
      }
    });

    it('should accept password with special characters', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'P@ssw0rd!',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'password').length).toBe(0);
    });
  });

  // ============================================
  // NAME VALIDATION TESTS
  // ============================================

  describe('name validation', () => {
    it('should allow omitting firstName (optional)', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'firstName').length).toBe(0);
    });

    it('should allow omitting lastName (optional)', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'lastName').length).toBe(0);
    });

    it('should accept valid firstName', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        firstName: 'John',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'firstName').length).toBe(0);
    });

    it('should accept valid lastName', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        lastName: 'Doe',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'lastName').length).toBe(0);
    });

    it('should accept names with spaces and hyphens', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        firstName: 'Mary-Jane',
        lastName: "O'Connor",
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });
  });

  // ============================================
  // VALIDATION ERROR MESSAGES
  // ============================================

  describe('validation error messages', () => {
    it('should provide meaningful error message for invalid email', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'invalid',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.constraints).toBeDefined();
    });

    it('should provide meaningful error message for short password', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'short',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints).toBeDefined();
    });

    it('should provide meaningful error message for weak password', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'noNumbers', // No numbers
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
      expect(passwordError?.constraints).toBeDefined();
    });
  });

  // ============================================
  // DTO STRUCTURE TESTS
  // ============================================

  describe('DTO structure', () => {
    it('should be instantiatable', () => {
      // Arrange & Act
      if (!RegisterDto) return;

      const dto = new RegisterDto();

      // Assert
      expect(dto).toBeInstanceOf(RegisterDto);
    });

    it('should allow setting properties via assignment', () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = new RegisterDto();

      // Act
      dto.email = 'user@example.com';
      dto.password = 'SecurePass123';
      dto.birthdate = '1990-01-15';
      dto.firstName = 'John';
      dto.lastName = 'Doe';

      // Assert
      expect(dto.email).toBe('user@example.com');
      expect(dto.password).toBe('SecurePass123');
      expect(dto.birthdate).toBe('1990-01-15');
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Doe');
    });

    it('should correctly transform plain object to DTO instance', () => {
      // Arrange
      if (!RegisterDto) return;

      const plainObject = {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Act
      const dto = plainToInstance(RegisterDto, plainObject);

      // Assert
      expect(dto).toBeInstanceOf(RegisterDto);
      expect(dto.email).toBe(plainObject.email);
      expect(dto.password).toBe(plainObject.password);
      expect(dto.birthdate).toBe(plainObject.birthdate);
      expect(dto.firstName).toBe(plainObject.firstName);
      expect(dto.lastName).toBe(plainObject.lastName);
    });

    it('should handle extra properties gracefully', async () => {
      // Arrange
      if (!RegisterDto) return;

      const plainObject = {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
        extraField: 'should be ignored',
        anotherExtra: 123,
      };

      // Act
      const dto = plainToInstance(RegisterDto, plainObject);
      const errors = await validate(dto);

      // Assert - should still be valid, extra props ignored
      expect(errors.length).toBe(0);
    });
  });

  // ============================================
  // BIRTHDATE VALIDATION TESTS
  // ============================================

  describe('birthdate validation', () => {
    it('should reject missing birthdate', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'birthdate')).toBe(true);
    });

    it('should reject empty birthdate', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'birthdate')).toBe(true);
    });

    it('should reject invalid date format', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: 'not-a-date',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'birthdate')).toBe(true);
    });

    it('should accept valid ISO 8601 date', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'birthdate').length).toBe(0);
    });

    it('should accept valid ISO 8601 date with time', async () => {
      // Arrange
      if (!RegisterDto) return;

      const dto = plainToInstance(RegisterDto, {
        email: 'user@example.com',
        password: 'SecurePass123',
        birthdate: '1990-01-15T00:00:00.000Z',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.filter((e) => e.property === 'birthdate').length).toBe(0);
    });
  });
});
