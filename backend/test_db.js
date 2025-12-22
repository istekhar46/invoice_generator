import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    console.log("⏳ Connecting to database...");

    await prisma.$connect();

    const result = await prisma.$queryRaw`SELECT 1;`;
    console.log("✅ Database connected successfully");
    console.log("Result:", result);
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
