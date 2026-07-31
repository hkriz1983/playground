import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('search')?.toLowerCase() || '';

    // Check if "Myself" entry exists
    const existingSelf = await prisma.splittzyFriend.findFirst({
      where: { nickname: 'Myself' },
    });

    if (!existingSelf) {
      await prisma.splittzyFriend.create({
        data: {
          name: 'Myself (You)',
          nickname: 'Myself',
          phone: null,
          upiId: null,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        },
      });
    }

    const friends = await prisma.splittzyFriend.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query } },
              { nickname: { contains: query } },
              { phone: { contains: query } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(friends);
  } catch (error) {
    console.error('Failed to fetch friends:', error);
    return NextResponse.json({ error: 'Failed to fetch friends' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, nickname, phone, upiId, avatar } = body;

    if (!name || !nickname) {
      return NextResponse.json({ error: 'Name and Nickname are required' }, { status: 400 });
    }

    const friend = await prisma.splittzyFriend.create({
      data: {
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
