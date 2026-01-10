import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export class PasswordUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validatePasswordStrength(password: string): boolean {
    const minLength = 8;
    const hasNumber = /\d/;
    
    return password.length >= minLength && hasNumber.test(password);
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}