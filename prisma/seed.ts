import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.organization.findUnique({ where: { slug: "demo" } });
  if (exists) return;

  await prisma.organization.create({
    data: {
      name: "Organización demo",
      slug: "demo",
      intro:
        "Por favor ingresa los datos de tu petición de soporte o solicitud de apoyo tecnológico. La información es para llevar un control de las actividades del equipo de tecnología.",
      note: "NOTA: Los tiempos se ajustarán de acuerdo con la carga de trabajo del equipo de tecnología.",
      areas: {
        create: ["Dirección", "Administración", "Comunicación", "Investigación"].map((name, order) => ({ name, order })),
      },
      requestTypes: {
        create: [
          "Desarrollo",
          "Apoyo desarrollo externo",
          "Actualización",
          "Solicitud de infraestructura",
          "Mantenimiento",
          "Soporte técnico",
        ].map((name, order) => ({ name, order })),
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
