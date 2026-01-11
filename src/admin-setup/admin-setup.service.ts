import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import * as bcrypt from 'bcrypt';
import { RoleEnum } from '../common/enums/role.enum';

@Injectable()
export class AdminSetupService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createAdmin() {
    const username = process.env.ADMIN_USERNAME!;
    const password = process.env.ADMIN_PASSWORD!;
    const name = process.env.ADMIN_NAME!;
    const email = process.env.ADMIN_EMAIL!;
    const mobile = process.env.ADMIN_MOBILE!;

    const existing = await this.userRepo.findOne({
      where: { username, isDeleted: false },
    });

    if (existing) {
      return { message: 'Admin already exists' };
    }

    const hash = await bcrypt.hash(password, 10);

    const admin = this.userRepo.create({
      username,
      password: hash,
      role: RoleEnum.ADMIN,
      isActive: true,
      name,
      email,
      mobile,
      failedLoginAttempts: 0,
    });

    await this.userRepo.save(admin);

    return { message: 'Admin created successfully' };
  }
}
