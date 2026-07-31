import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const { id } = params;
    const body = await req.json();
    const { name, nickname, phone, upiId, avatar } = body;

    const existingFriend = await prisma.splittzyFriend.findFirst({
      where: { id, userId },
    });

    if (!existingFriend) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    const updatedFriend = await prisma.splittzyFriend.update({
      where: { id },
      data: {
        name,
        nickname,
        phone: phone || null,
        upiId: upiId || null,
        avatar: avatar || null,
      },
    });

    return NextResponse.json(updatedFriend);
  } catch (error) {
    console.error('Failed to update friend:', error);
    return NextResponse.json({ error: 'Failed to update friend' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const { id } = params;

    const friend = await prisma.splittzyFriend.findFirst({
      where: { id, userId },
    });

    if (!friend) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    if (friend.nickname === 'Myself') {
      return NextResponse.json({ error: 'The "Myself" contact is non-deletable.' }, { status: 400 });
    }

    await prisma.splittzyFriend.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete friend:', error);
    return NextResponse.json({ error: 'Failed to delete friend' }, { status: 500 });
  }
}
