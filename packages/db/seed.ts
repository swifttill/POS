import { db, companies, categories, menuItems, modifierGroups, modifiers, deals, dealItems, restaurantTables, users } from "@swift-till/db";
import crypto from "crypto";

function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Helper: rupees -> paisa
const rs = (r: number) => Math.round(r * 100);

async function main() {
  console.log("Seeding SwiftTill...");

  await db
    .insert(companies)
    .values({
      id: "singleton",
      name: "SwiftTill Grill House",
      address: "123 Velocity Avenue, Lahore",
      tagline: "Fast. Accurate. Delicious.",
      currency: "PKR",
      gstEnabled: true,
      gstRate: 16,
    })
    .onConflictDoUpdate({
      target: companies.id,
      set: {
        name: "SwiftTill Grill House",
        address: "123 Velocity Avenue, Lahore",
        tagline: "Fast. Accurate. Delicious.",
        currency: "PKR",
        gstEnabled: true,
        gstRate: 16,
      },
    });

  // --- Categories ---------------------------------------------------------
  const [burgers] = await db
    .insert(categories)
    .values({ name: "Burgers", slug: "burgers", sortOrder: 1, imageUrl: "" })
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: "Burgers", sortOrder: 1, imageUrl: "" },
    })
    .returning({ id: categories.id });
  const [appetizers] = await db
    .insert(categories)
    .values({ name: "Appetizers", slug: "appetizers", sortOrder: 2 })
    .onConflictDoUpdate({ target: categories.slug, set: { name: "Appetizers", sortOrder: 2 } })
    .returning({ id: categories.id });
  const [drinks] = await db
    .insert(categories)
    .values({ name: "Drinks", slug: "drinks", sortOrder: 3 })
    .onConflictDoUpdate({ target: categories.slug, set: { name: "Drinks", sortOrder: 3 } })
    .returning({ id: categories.id });
  const [desserts] = await db
    .insert(categories)
    .values({ name: "Desserts", slug: "desserts", sortOrder: 4 })
    .onConflictDoUpdate({ target: categories.slug, set: { name: "Desserts", sortOrder: 4 } })
    .returning({ id: categories.id });

  // --- Menu items with modifiers -----------------------------------------
  const [classicBurger] = await db
    .insert(menuItems)
    .values({
      id: "item-classic-burger",
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, house sauce.",
      price: rs(650),
      categoryId: burgers.id,
      printerStation: "GRILL",
      sortOrder: 1,
    })
    .onConflictDoUpdate({
      target: menuItems.id,
      set: {
        name: "Classic Burger",
        description: "Beef patty, lettuce, tomato, house sauce.",
        price: rs(650),
        categoryId: burgers.id,
        printerStation: "GRILL",
        sortOrder: 1,
      },
    })
    .returning({ id: menuItems.id });

  // Modifier groups + modifiers for the classic burger.
  // Use deterministic group ids so re-running the seed is idempotent.
  const meatGroupId = "mg-classic-meat";
  await db
    .insert(modifierGroups)
    .values({
      id: meatGroupId,
      name: "Meat Temperature",
      required: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 1,
      menuItemId: classicBurger.id,
    })
    .onConflictDoUpdate({ target: modifierGroups.id, set: { name: "Meat Temperature", menuItemId: classicBurger.id } });

  const addonsGroupId = "mg-classic-addons";
  await db
    .insert(modifierGroups)
    .values({
      id: addonsGroupId,
      name: "Add-ons",
      required: false,
      minSelect: 0,
      maxSelect: 5,
      sortOrder: 2,
      menuItemId: classicBurger.id,
    })
    .onConflictDoUpdate({ target: modifierGroups.id, set: { name: "Add-ons", menuItemId: classicBurger.id } });

  const meatMods = [
    { name: "Medium Rare", priceDelta: 0 },
    { name: "Medium", priceDelta: 0 },
    { name: "Well Done", priceDelta: 0 },
  ];
  for (const m of meatMods) {
    await db
      .insert(modifiers)
      .values({ name: m.name, priceDelta: m.priceDelta, sortOrder: 1, modifierGroupId: meatGroupId })
      .onConflictDoUpdate({ target: modifiers.id, set: { name: m.name, modifierGroupId: meatGroupId } });
  }

  const addonMods = [
    { name: "Extra Cheese", priceDelta: rs(80) },
    { name: "Bacon", priceDelta: rs(120) },
    { name: "Fried Egg", priceDelta: rs(60) },
    { name: "Avocado", priceDelta: rs(100) },
  ];
  for (const m of addonMods) {
    await db
      .insert(modifiers)
      .values({ name: m.name, priceDelta: m.priceDelta, sortOrder: 2, modifierGroupId: addonsGroupId })
      .onConflictDoUpdate({ target: modifiers.id, set: { name: m.name, modifierGroupId: addonsGroupId } });
  }

  async function upsertItem(values: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    categoryId: string;
    printerStation: string;
    sortOrder: number;
  }) {
    await db
      .insert(menuItems)
      .values(values)
      .onConflictDoUpdate({ target: menuItems.id, set: values });
  }

  await upsertItem({
    id: "item-fries",
    name: "Loaded Fries",
    description: "Cheese, jalapeno, ranch drizzle.",
    price: rs(320),
    categoryId: appetizers.id,
    printerStation: "FRY",
    sortOrder: 1,
  });
  await upsertItem({
    id: "item-wings",
    name: "Buffalo Wings (6pc)",
    price: rs(480),
    categoryId: appetizers.id,
    printerStation: "FRY",
    sortOrder: 2,
  });
  await upsertItem({
    id: "item-cola",
    name: "Cola",
    price: rs(120),
    categoryId: drinks.id,
    printerStation: "BAR",
    sortOrder: 1,
  });
  await upsertItem({
    id: "item-mojito",
    name: "Virgin Mojito",
    price: rs(250),
    categoryId: drinks.id,
    printerStation: "BAR",
    sortOrder: 2,
  });
  await upsertItem({
    id: "item-brownie",
    name: "Chocolate Brownie",
    price: rs(300),
    categoryId: desserts.id,
    printerStation: "DESSERT",
    sortOrder: 1,
  });

  // --- Deal: Lunch Special bundle ----------------------------------------
  const [lunchDeal] = await db
    .insert(deals)
    .values({ id: "deal-lunch", name: "Lunch Special", type: "BUNDLE", value: rs(850), active: true })
    .onConflictDoUpdate({
      target: deals.id,
      set: { name: "Lunch Special", type: "BUNDLE", value: rs(850), active: true },
    })
    .returning({ id: deals.id });

  const dealItemsData = [
    { menuItemId: classicBurger.id, quantity: 1 },
    { menuItemId: "item-cola", quantity: 1 },
    { menuItemId: "item-fries", quantity: 1 },
  ];
  for (const di of dealItemsData) {
    await db
      .insert(dealItems)
      .values({ dealId: lunchDeal.id, menuItemId: di.menuItemId, quantity: di.quantity })
      .onConflictDoUpdate({
        target: [dealItems.dealId, dealItems.menuItemId],
        set: { quantity: di.quantity },
      });
  }

  // --- Tables -------------------------------------------------------------
  const tableData = [
    { number: 1, seats: 2, zone: "Indoor", posX: 0, posY: 0 },
    { number: 2, seats: 4, zone: "Indoor", posX: 1, posY: 0 },
    { number: 3, seats: 4, zone: "Indoor", posX: 2, posY: 0 },
    { number: 4, seats: 6, zone: "Patio", posX: 0, posY: 1 },
    { number: 5, seats: 2, zone: "Patio", posX: 1, posY: 1 },
  ];
  for (const t of tableData) {
    await db
      .insert(restaurantTables)
      .values(t)
      .onConflictDoUpdate({ target: restaurantTables.number, set: t });
  }

  // --- Users (auth) -------------------------------------------------------
  const adminPin = process.env.ADMIN_PIN ?? "1234";
  const admins = [
    {
      id: "user-admin",
      name: "Admin",
      role: "ADMIN",
      pin: adminPin,
      password: process.env.ADMIN_PASS ?? "admin1234",
      username: "admin",
      email: "admin@swifttill.pos",
      phone: "03001234567",
    },
    {
      id: "user-manager",
      name: "Manager",
      role: "MANAGER",
      pin: "2222",
      password: "manager1234",
      username: "manager",
      email: "manager@swifttill.pos",
      phone: "03001234568",
    },
    {
      id: "user-waiter",
      name: "Waiter",
      role: "WAITER",
      pin: "3333",
      password: "waiter1234",
      username: "waiter",
      email: "waiter@swifttill.pos",
      phone: "03001234569",
    },
  ];
  for (const u of admins) {
    await db
      .insert(users)
      .values({
        id: u.id,
        name: u.name,
        role: u.role,
        pinHash: hashPin(u.pin),
        passwordHash: hashPin(u.password),
        username: u.username,
        email: u.email,
        phone: u.phone,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          username: u.username,
          email: u.email,
          phone: u.phone,
          passwordHash: hashPin(u.password),
        },
      });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
