import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user and Notes app...');

  let admin = await prisma.user.findFirst({
    where: { OR: [{ email: 'admin' }, { name: 'admin' }] }
  });

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'admin',
        email: 'admin',
        password: 'admin',
        role: 'ADMIN',
        designation: 'System Administrator',
        avatarColor: 'error',
      }
    });
    console.log('Created admin user: admin / admin');
  } else {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        name: 'admin',
        email: 'admin',
        password: 'admin',
        role: 'ADMIN',
        isActive: true,
      }
    });
    console.log('Updated/Reset admin user credentials to: admin / admin');
  }
  
  let notesApp = await prisma.app.findFirst({ where: { name: 'Quick Notes' } });
  if (!notesApp) {
    notesApp = await prisma.app.create({
      data: {
        name: 'Quick Notes',
        description: 'Simple notes and reminders mini-app inside the Playground ecosystem.',
        icon: 'edit_note',
        color: 'primary',
        appLink: '/notes',
        github: 'playground/notes-reminders'
      }
    });
  }

  const existingAccess = await prisma.userAppAccess.findFirst({
    where: { userId: admin.id, appId: notesApp.id }
  });

  if (!existingAccess) {
    await prisma.userAppAccess.create({
      data: {
        userId: admin.id,
        appId: notesApp.id
      }
    });
  }

  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
