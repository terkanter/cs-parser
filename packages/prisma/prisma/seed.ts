import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      id: "test-user-1",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("Created/found user:", user);

  // Create test buy requests
  const buyRequest1 = await prisma.buyRequest.create({
    data: {
      platform: "LIS_SKINS",
      query: {
        item: ["AK-47", "AWP"],
        quality: ["FN", "MW"],
        price: [{ gte: 100, lte: 500 }, { gte: 1000 }],
      },
      isActive: true,
      createdByUserId: user.id,
    },
  });

  const buyRequest2 = await prisma.buyRequest.create({
    data: {
      platform: "CS_MONEY",
      query: {
        item: ["M4A4"],
        quality: ["FT"],
        float: [{ gte: 0.15, lte: 0.25 }],
        price: [{ lte: 200 }],
      },
      isActive: false,
      createdByUserId: user.id,
    },
  });

  const buyRequest3 = await prisma.buyRequest.create({
    data: {
      platform: "LIS_SKINS",
      query: {
        item: ["Glock-18"],
        quality: ["BS", "WW"],
        paint_seed: [{ gte: 1, lte: 100 }],
      },
      isActive: true,
      createdByUserId: user.id,
    },
  });

  console.log("Created buy requests:", [buyRequest1.id, buyRequest2.id, buyRequest3.id]);
  console.log("Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
