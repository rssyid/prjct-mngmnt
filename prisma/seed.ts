import { prisma } from '../src/infra/db';
import { runSeed } from '../src/domain/admin/seed-service';

async function main() {
  console.log('Menjalankan database seed...');
  const result = await runSeed(prisma);
  console.log('Seed selesai dengan sukses:', result);
}

main()
  .catch((e) => {
    console.error('Error saat seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
