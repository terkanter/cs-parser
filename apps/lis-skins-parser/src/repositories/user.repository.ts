import { prisma, type User } from "@repo/prisma";

export class UserRepository {
  async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        id,
      },
    });
  }
}
