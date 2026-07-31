import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Task Headers and grouped notes...');

  const userId = 'mock-user-1234';

  // Create Task Headers
  const officeParty = await prisma.taskHeader.create({
    data: {
      userId,
      name: 'Office Party Tasks',
      icon: 'celebration',
      color: 'amber-400',
    },
  });

  const projectLaunch = await prisma.taskHeader.create({
    data: {
      userId,
      name: 'Project Launch Prep',
      icon: 'rocket_launch',
      color: 'indigo-400',
    },
  });

  console.log('Task Headers created:', officeParty.name, projectLaunch.name);

  // Add notes under Office Party Tasks
  await prisma.note.create({
    data: {
      userId,
      title: 'Arranging Food & Catering',
      content: '[x] Contact catering vendor\n[ ] Finalize buffet menu (Veg & Non-Veg)\n[ ] Order custom celebration cake\n• Confirm headcount by Thursday\n• Check dietary restrictions',
      category: 'Work',
      taskHeaderId: officeParty.id,
    },
  });

  await prisma.note.create({
    data: {
      userId,
      title: 'Setting Up Decor & Venue',
      content: '[ ] Buy helium balloons & fairy lights\n[ ] Test DJ sound system & microphone\n[ ] Print welcome banner\n• Coordinate entry passes with building management',
      category: 'Work',
      taskHeaderId: officeParty.id,
    },
  });

  // Add notes under Project Launch Prep
  await prisma.note.create({
    data: {
      userId,
      title: 'Production Deployment Checklist',
      content: '[x] Merge feature branch into main\n[ ] Run final E2E test suite\n[ ] Verify SSL certificates & domain DNS\n• Notify team on Slack before deploy',
      category: 'Work',
      taskHeaderId: projectLaunch.id,
    },
  });

  // Add a General note (No Task Header)
  await prisma.note.create({
    data: {
      userId,
      title: 'Weekly Grocery List',
      content: '[ ] Almond milk & organic eggs\n[ ] Whole wheat bread\n[ ] Fresh avocados & berries\n• Remember to bring reusable bags',
      category: 'Personal',
      taskHeaderId: null,
    },
  });

  console.log('Sample notes with bullets and checkboxes seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
