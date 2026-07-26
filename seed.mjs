import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user and Notes app...');
  
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin',
      password: 'admin',
      role: 'ADMIN',
      designation: 'System Administrator',
      avatarColor: 'error',
    }
  });
  
  const notesApp = await prisma.app.create({
    data: {
      name: 'Quick Notes',
      description: 'Simple notes and reminders mini-app inside the Playground ecosystem.',
      icon: 'edit_note',
      color: 'primary',
      appLink: '/notes',
      github: 'playground/notes-reminders'
    }
  });

  await prisma.userAppAccess.create({
    data: {
      userId: admin.id,
      appId: notesApp.id
    }
  });

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
