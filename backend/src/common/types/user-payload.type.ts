import { UserRole } from '@prisma/client';

export interface UserPayload {
  sub: number;
  username: string;
  name: string;
  role: UserRole;
  factoryId: number;
  isCenter: boolean;
}
