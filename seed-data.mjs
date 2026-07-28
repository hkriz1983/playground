import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.ledgerCategory.findMany();
  const coaching = cats.find(c => c.name === 'Coaching').id;
  const nets = cats.find(c => c.name === 'Open Nets').id;
  const match = cats.find(c => c.name === 'Coach Attending Match').id;
  const extra = cats.find(c => c.name === 'Ancillary Activities').id;

  await prisma.ledgerEntry.createMany({
    data: [
      { date: new Date('2026-06-02T10:00:00Z'), amount: 2000, categoryId: coaching, description: 'June 2' },
      { date: new Date('2026-06-05T10:00:00Z'), amount: 2000, categoryId: coaching, description: 'June 5' },
      { date: new Date('2026-06-11T10:00:00Z'), amount: 2000, categoryId: coaching, description: 'June 11' },
      { date: new Date('2026-06-19T10:00:00Z'), amount: 2000, categoryId: coaching, description: 'June 19' },
      
      { date: new Date('2026-06-05T12:00:00Z'), amount: 2500, categoryId: nets, description: 'June 5' },
      { date: new Date('2026-06-11T12:00:00Z'), amount: 2500, categoryId: nets, description: 'June 11' },
      
      { date: new Date('2026-06-12T10:00:00Z'), amount: 1500, categoryId: match, description: 'June 12' },
      
      { date: new Date('2026-06-19T14:00:00Z'), amount: 1500, categoryId: extra, description: 'Shoes' },
    ]
  });

  await prisma.ledgerPayment.createMany({
    data: [
      { date: new Date('2026-06-01T10:00:00Z'), amount: 2000, description: 'Credit as on 01/06/26' },
      { date: new Date('2026-06-05T15:00:00Z'), amount: 2500, description: 'Paid on 05/06/26' },
      { date: new Date('2026-06-11T15:00:00Z'), amount: 4200, description: 'Paid on 11/06/26' },
    ]
  });
  console.log('Seeded June data!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
