let prisma;

if (process.env.USE_FAKE_DB === "true") {
  const fakeModule = await import("../dev/fakePrisma.js");

  prisma = fakeModule.default;

  console.log("🧪 Using local in-memory fake database");
} else {
  const { PrismaClient } = await import("@prisma/client");

  prisma = new PrismaClient();

  console.log("🗄️ Using real Prisma database");
}

export { prisma };
export default prisma;