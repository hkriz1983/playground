import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('search')?.toLowerCase() || '';

    // Fetch logged-in user profile
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Check if "Myself" entry exists for this user
    const existingSelf = await prisma.splittzyFriend.findFirst({
      where: { userId, nickname: 'Myself' },
    });

    if (!existingSelf) {
      await prisma.splittzyFriend.create({
        data: {
          userId,
          name: currentUser ? currentUser.name : 'Myself',
          nickname: 'Myself',
          phone: null,
          upiId: null,
          avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        },
      });
    } else if (currentUser && existingSelf.name !== currentUser.name) {
      // Keep "Myself" card name dynamically synced with logged-in user profile
      await prisma.splittzyFriend.update({
        where: { id: existingSelf.id },
        data: {
          name: currentUser.name,
          avatar: existingSelf.avatar || currentUser.avatar || null,
        },
      });
    }

    const friends = await prisma.splittzyFriend.findMany({
      where: {
        userId,
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { nickname: { contains: query } },
                { phone: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(friends);
  } catch (error) {
    console.error('Failed to fetch friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const body = await req.json();
    const { name, nickname, phone, upiId, avatar } = body;

    if (!name || !nickname) {
      return NextResponse.json({ error: 'Name and Nickname are required' }, { status: 400 });
    }

    const friend = await prisma.splittzyFriend.create({
      data: {
        userId,
        name,
        nickname,
        phone: phone || null,
        upiId: upiId || null,
        avatar: avatar || null,
      },
    });

    return NextResponse.json(friend, { status: 201 });
  } catch (error) {
    console.error('Failed to create friend:', error);
    return NextResponse.json({ error: 'Failed to create friend' }, { status: 500 });
  }
}
