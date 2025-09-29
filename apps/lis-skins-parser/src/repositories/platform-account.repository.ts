import { Platform, type PlatformAccount, prisma } from "@repo/prisma";

export class PlatformAccountRepository {
  async findLisSkinsAccountByUserId(userId: string): Promise<PlatformAccount | null> {
    return await prisma.platformAccount.findFirst({
      where: {
        userId,
        platform: Platform.LIS_SKINS,
      },
    });
  }

  async findByUserIdAndPlatform(userId: string, platform: Platform): Promise<PlatformAccount | null> {
    return await prisma.platformAccount.findFirst({
      where: {
        userId,
        platform,
      },
    });
  }

  async create(data: {
    userId: string;
    platform: Platform;
    credentials: any;
  }): Promise<PlatformAccount> {
    return await prisma.platformAccount.create({
      data,
    });
  }

  async updateCredentials(id: string, credentials: any): Promise<PlatformAccount> {
    return await prisma.platformAccount.update({
      where: { id },
      data: { credentials },
    });
  }
}
