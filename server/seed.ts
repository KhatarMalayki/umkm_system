import { drizzle } from "drizzle-orm/mysql2";
import { units, paymentMethods } from "../drizzle/schema";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required for seeding");
  process.exit(1);
}

const db = drizzle(connectionString);

async function seed() {
  console.log("Seeding database...");

  try {
    // Seed Units
    console.log("Seeding units...");
    const unitData = [
      { name: "kg", label: "Kilogram" },
      { name: "pcs", label: "Pieces" },
      { name: "liter", label: "Liter" },
      { name: "box", label: "Box" },
      { name: "pack", label: "Pack" },
    ];

    for (const unit of unitData) {
      await db.insert(units).values(unit).onDuplicateKeyUpdate({ set: { label: unit.label } });
    }

    // Seed Payment Methods
    console.log("Seeding payment methods...");
    const paymentData = [
      { name: "cod", label: "Cash on Delivery", isActive: true },
      { name: "transfer", label: "Bank Transfer", isActive: true },
    ];

    for (const method of paymentData) {
      await db.insert(paymentMethods).values(method).onDuplicateKeyUpdate({ set: { label: method.label, isActive: method.isActive } });
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
