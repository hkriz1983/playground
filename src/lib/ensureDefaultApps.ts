import { PrismaClient } from '@prisma/client';

export async function ensureDefaultApps(prisma: PrismaClient, userId?: string) {
  try {
    const existingApps = await prisma.app.findMany();
    
    const requiredApps = [
      {
        name: 'Quick Notes',
        description: 'Simple notes and reminders mini-app inside the Playground ecosystem.',
        icon: 'edit_note',
        color: 'primary',
        appLink: '/notes',
      },
      {
        name: 'Splittzy',
        description: 'Smart bill-splitting & payment tracking app for groups and friends.',
        icon: 'payments',
        color: 'emerald-500',
        appLink: '/splittzy',
      },
      {
        name: 'Cricket Ledger',
        description: 'Match and session ledger tracking for players.',
        icon: 'sports_cricket',
        color: 'amber-500',
        appLink: '/cricket-ledger',
      },
    ];

    for (const reqApp of requiredApps) {
      const found = existingApps.find(a => a.name === reqApp.name || a.appLink === reqApp.appLink);
      if (!found) {
        const created = await prisma.app.create({ data: reqApp });
        existingApps.push(created);
      }
    }

    // Grant user access if userId provided
    if (userId) {
      for (const app of existingApps) {
        const access = await prisma.userAppAccess.findFirst({
          where: { userId, appId: app.id }
        });
        if (!access) {
          await prisma.userAppAccess.create({
            data: { userId, appId: app.id }
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to ensure default apps:', err);
  }
}
