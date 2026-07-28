import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Ledger App and Categories...');
  
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  
  if (admin) {
    const ledgerApp = await prisma.app.create({
      data: {
        name: 'Cricket Ledger',
        description: 'Track academy coaching fees and payments.',
        icon: 'account_balance_wallet',
        color: 'primary',
        appLink: '/cricket-ledger',
      }
    });

    await prisma.userAppAccess.create({
      data: {
        userId: admin.id,
        appId: ledgerApp.id
      }
    });
    console.log('Ledger App created and access granted to Admin.');
  }

  const categories = [
    { name: 'Coaching', unitWord: 'session', isFixedRate: true, defaultRate: 2000, order: 1 },
    { name: 'Open Nets', unitWord: 'session', isFixedRate: true, defaultRate: 2500, order: 2 },
    { name: 'Coach Attending Match', unitWord: 'match', isFixedRate: true, defaultRate: 1500, order: 3 },
    { name: 'Me attending a match', unitWord: 'match', isFixedRate: false, defaultRate: 0, order: 4 },
    { name: 'Ancillary Activities', unitWord: 'item', isFixedRate: false, defaultRate: 0, order: 5 },
  ];

  for (const cat of categories) {
    await prisma.ledgerCategory.create({ data: cat });
  }

  console.log('Categories seeded!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
