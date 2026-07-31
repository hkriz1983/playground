import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Splittzy App, Friends, and Bills...');

  // 1. Create or ensure App entry
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  let splittzyApp = await prisma.app.findFirst({ where: { name: 'Splittzy' } });

  if (!splittzyApp) {
    splittzyApp = await prisma.app.create({
      data: {
        name: 'Splittzy',
        description: 'Smart bill-splitting & payment tracking app for groups and friends.',
        icon: 'payments',
        color: 'emerald-500',
        appLink: '/splittzy',
      }
    });
    console.log('Splittzy App created in database.');
  }

  if (admin) {
    const existingAccess = await prisma.userAppAccess.findFirst({
      where: { userId: admin.id, appId: splittzyApp.id }
    });
    if (!existingAccess) {
      await prisma.userAppAccess.create({
        data: {
          userId: admin.id,
          appId: splittzyApp.id
        }
      });
      console.log('Access granted to Admin.');
    }
  }

  // Clear existing splittzy demo data to re-seed cleanly if needed
  await prisma.splittzyBillParticipant.deleteMany();
  await prisma.splittzyBill.deleteMany();
  await prisma.splittzyFriend.deleteMany();

  // 2. Create Friends
  const friendMyself = await prisma.splittzyFriend.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      name: admin ? `${admin.name} (You)` : 'Myself (You)',
      nickname: 'Myself',
      phone: '+91 90000 00000',
      upiId: 'myself@upi',
      avatar: admin?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    }
  });

  const friendRahul = await prisma.splittzyFriend.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      name: 'Rahul Sharma',
      nickname: 'Rahul',
      phone: '+91 98765 43210',
      upiId: 'rahul@upi',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    }
  });

  const friendPriya = await prisma.splittzyFriend.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      name: 'Priya Patel',
      nickname: 'Priya',
      phone: '+91 98123 45678',
      upiId: 'priya@okicici',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    }
  });

  const friendAlex = await prisma.splittzyFriend.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      name: 'Alex Mercer',
      nickname: 'Alex',
      phone: '+91 97788 11223',
      upiId: 'alex@paytm',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    }
  });

  const friendVikram = await prisma.splittzyFriend.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      name: 'Vikram Malhotra',
      nickname: 'Vikram',
      phone: '+91 99001 22334',
      upiId: 'vikram@ybl',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80',
    }
  });

  console.log('Seeded 4 Friends master entries.');

  // 3. Create Sample Bills (Matching Wireframe amounts & cases)

  // Bill 1: Weekend Goa Trip Dinner (Total: ₹1,000; Received: ₹800; Pending: ₹200 to get back)
  const billGoa = await prisma.splittzyBill.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      title: 'Weekend Goa Trip Dinner',
      date: new Date('2026-07-28T19:30:00Z'),
      totalAmount: 1000,
      splitMode: 'CUSTOM_EXACT',
      billPhotos: JSON.stringify([
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
      ]),
      shareCode: 'goa-trip-dinner-2026',
      participants: {
        create: [
          {
            friendId: friendPriya.id,
            shareAmount: 500,
            exactAmount: 500,
            status: 'PAID',
            paidAt: new Date('2026-07-29T10:15:00Z'),
            paymentScreenshot: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80'
          },
          {
            friendId: friendRahul.id,
            shareAmount: 300,
            exactAmount: 300,
            status: 'PAID',
            paidAt: new Date('2026-07-29T11:00:00Z'),
            paymentScreenshot: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80'
          },
          {
            friendId: friendAlex.id,
            shareAmount: 200,
            exactAmount: 200,
            status: 'PENDING',
          }
        ]
      }
    }
  });

  // Bill 2: Movie & Snack Night (Get back ₹500)
  const billMovie = await prisma.splittzyBill.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      title: 'IMAX Movie & Snack Night',
      date: new Date('2026-07-26T21:00:00Z'),
      totalAmount: 1000,
      splitMode: 'AUTO',
      billPhotos: JSON.stringify([
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80'
      ]),
      shareCode: 'imax-movie-night-2026',
      participants: {
        create: [
          {
            friendId: friendRahul.id,
            shareAmount: 500,
            status: 'PENDING',
          }
        ]
      }
    }
  });

  // Bill 3: Apartment Wifi & Utilities (Get back ₹300)
  const billWifi = await prisma.splittzyBill.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      title: 'Apartment Fiber Wifi',
      date: new Date('2026-07-22T14:00:00Z'),
      totalAmount: 600,
      splitMode: 'AUTO',
      billPhotos: JSON.stringify([]),
      shareCode: 'apartment-wifi-july',
      participants: {
        create: [
          {
            friendId: friendVikram.id,
            shareAmount: 300,
            status: 'PENDING',
          }
        ]
      }
    }
  });

  // Bill 4: Group Cab to Airport (You Owe ₹100)
  const billCab = await prisma.splittzyBill.create({
    data: {
      userId: admin ? admin.id : 'mock-user-1234',
      title: 'Airport Taxi Share',
      date: new Date('2026-07-20T08:00:00Z'),
      totalAmount: 400,
      splitMode: 'CUSTOM_EXACT',
      billPhotos: JSON.stringify([]),
      shareCode: 'airport-taxi-share',
      participants: {
        create: [
          {
            friendId: friendRahul.id,
            shareAmount: -100, // Negative share means user owes friend ₹100
            exactAmount: -100,
            status: 'PENDING',
          }
        ]
      }
    }
  });

  console.log('Splittzy seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
