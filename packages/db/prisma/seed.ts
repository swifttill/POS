import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Helper: rupees -> paisa
const rs = (r: number) => Math.round(r * 100);

async function main() {
  console.log("Seeding SwiftTill...");

  await prisma.company.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: "SwiftTill Grill House",
      address: "123 Velocity Avenue, Lahore",
      tagline: "Fast. Accurate. Delicious.",
      currency: "PKR",
      gstEnabled: true,
      gstRate: 16,
    },
  });

  // --- Categories ---------------------------------------------------------
  const burgers = await prisma.category.upsert({
    where: { slug: "burgers" },
    update: {},
    create: { name: "Burgers", slug: "burgers", sortOrder: 1, imageUrl: "" },
  });
  const appetizers = await prisma.category.upsert({
    where: { slug: "appetizers" },
    update: {},
    create: { name: "Appetizers", slug: "appetizers", sortOrder: 2 },
  });
  const drinks = await prisma.category.upsert({
    where: { slug: "drinks" },
    update: {},
    create: { name: "Drinks", slug: "drinks", sortOrder: 3 },
  });
  const desserts = await prisma.category.upsert({
    where: { slug: "desserts" },
    update: {},
    create: { name: "Desserts", slug: "desserts", sortOrder: 4 },
  });

  // --- Menu items with modifiers -----------------------------------------
  const classicBurger = await prisma.menuItem.upsert({
    where: { id: "item-classic-burger" },
    update: {},
    create: {
      id: "item-classic-burger",
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, house sauce.",
      price: rs(650),
      categoryId: burgers.id,
      printerStation: "GRILL",
      sortOrder: 1,
      modifierGroups: {
        create: [
          {
            name: "Meat Temperature",
            required: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 1,
            modifiers: {
              create: [
                { name: "Medium Rare", priceDelta: 0 },
                { name: "Medium", priceDelta: 0 },
                { name: "Well Done", priceDelta: 0 },
              ],
            },
          },
          {
            name: "Add-ons",
            required: false,
            minSelect: 0,
            maxSelect: 5,
            sortOrder: 2,
            modifiers: {
              create: [
                { name: "Extra Cheese", priceDelta: rs(80) },
                { name: "Bacon", priceDelta: rs(120) },
                { name: "Fried Egg", priceDelta: rs(60) },
                { name: "Avocado", priceDelta: rs(100) },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-fries" },
    update: {},
    create: {
      id: "item-fries",
      name: "Loaded Fries",
      description: "Cheese, jalapeno, ranch drizzle.",
      price: rs(320),
      categoryId: appetizers.id,
      printerStation: "FRY",
      sortOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-wings" },
    update: {},
    create: {
      id: "item-wings",
      name: "Buffalo Wings (6pc)",
      price: rs(480),
      categoryId: appetizers.id,
      printerStation: "FRY",
      sortOrder: 2,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-cola" },
    update: {},
    create: {
      id: "item-cola",
      name: "Cola",
      price: rs(120),
      categoryId: drinks.id,
      printerStation: "BAR",
      sortOrder: 1,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-mojito" },
    update: {},
    create: {
      id: "item-mojito",
      name: "Virgin Mojito",
      price: rs(250),
      categoryId: drinks.id,
      printerStation: "BAR",
      sortOrder: 2,
    },
  });

  await prisma.menuItem.upsert({
    where: { id: "item-brownie" },
    update: {},
    create: {
      id: "item-brownie",
      name: "Chocolate Brownie",
      price: rs(300),
      categoryId: desserts.id,
      printerStation: "DESSERT",
      sortOrder: 1,
    },
  });

  // --- Deal: Lunch Special bundle ----------------------------------------
  await prisma.deal.upsert({
    where: { id: "deal-lunch" },
    update: {},
    create: {
      id: "deal-lunch",
      name: "Lunch Special",
      type: "BUNDLE",
      value: rs(850), // Burger + Drink + Fries normally ~990
      active: true,
      items: {
        create: [
          { menuItemId: classicBurger.id, quantity: 1 },
          { menuItemId: "item-cola", quantity: 1 },
          { menuItemId: "item-fries", quantity: 1 },
        ],
      },
    },
  });

  // --- Tables -------------------------------------------------------------
  const tableData = [
    { number: 1, seats: 2, zone: "Indoor", posX: 0, posY: 0 },
    { number: 2, seats: 4, zone: "Indoor", posX: 1, posY: 0 },
    { number: 3, seats: 4, zone: "Indoor", posX: 2, posY: 0 },
    { number: 4, seats: 6, zone: "Patio", posX: 0, posY: 1 },
    { number: 5, seats: 2, zone: "Patio", posX: 1, posY: 1 },
  ];
  for (const t of tableData) {
    await prisma.restaurantTable.upsert({
      where: { number: t.number },
      update: {},
      create: t,
    });
  }

  // --- Users (auth) -------------------------------------------------------
  const adminPin = process.env.ADMIN_PIN ?? "1234";
  await prisma.user.upsert({
    where: { id: "user-admin" },
    update: {},
    create: {
      id: "user-admin",
      name: "Admin",
      role: "ADMIN",
      pinHash: hashPin(adminPin),
    },
  });
  await prisma.user.upsert({
    where: { id: "user-manager" },
    update: {},
    create: {
      id: "user-manager",
      name: "Manager",
      role: "MANAGER",
      pinHash: hashPin("2222"),
    },
  });
  await prisma.user.upsert({
    where: { id: "user-waiter" },
    update: {},
    create: {
      id: "user-waiter",
      name: "Waiter",
      role: "WAITER",
      pinHash: hashPin("3333"),
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
