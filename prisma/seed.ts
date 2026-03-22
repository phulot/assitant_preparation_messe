import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash the default admin password
  const passwordHash = await bcryptjs.hash("admin123", 10);

  // Upsert the default admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@paroisse.local" },
    update: {
      name: "Administrateur",
      passwordHash,
    },
    create: {
      email: "admin@paroisse.local",
      name: "Administrateur",
      passwordHash,
    },
  });

  console.log(`Admin user upserted: ${adminUser.id} (${adminUser.email})`);

  // Upsert the default parish
  // Use a deterministic ID so the upsert is stable across runs
  const PARISH_ID = "default-paroisse-saint-exemple";

  const paroisse = await prisma.paroisse.upsert({
    where: { id: PARISH_ID },
    update: {
      nom: "Paroisse Saint-Exemple",
    },
    create: {
      id: PARISH_ID,
      nom: "Paroisse Saint-Exemple",
    },
  });

  console.log(`Parish upserted: ${paroisse.id} (${paroisse.nom})`);

  // Upsert the ADMIN roleParoisse linking the admin user to the parish
  const roleParoisse = await prisma.roleParoisse.upsert({
    where: {
      userId_paroisseId_role: {
        userId: adminUser.id,
        paroisseId: paroisse.id,
        role: "ADMIN",
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      paroisseId: paroisse.id,
      role: "ADMIN",
    },
  });

  console.log(
    `RoleParoisse upserted: ${roleParoisse.id} (ADMIN for ${adminUser.email} in ${paroisse.nom})`,
  );
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
