import { type BuyRequest, prisma } from "@repo/prisma";

export class BuyRequestRepository {
  async findActiveLisSkinsBuyRequests(): Promise<BuyRequest[]> {
    return await prisma.buyRequest.findMany({
      where: {
        isActive: true,
      },
    });
  }

  async findById(id: string): Promise<BuyRequest | null> {
    return await prisma.buyRequest.findUnique({
      where: { id },
    });
  }

  async findActiveByUserId(userId: string): Promise<BuyRequest[]> {
    return await prisma.buyRequest.findMany({
      where: {
        createdByUserId: userId,
        isActive: true,
      },
    });
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<BuyRequest> {
    return await prisma.buyRequest.update({
      where: { id },
      data: { isActive },
    });
  }
}
