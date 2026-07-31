import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { name, nickname, phone, upiId, avatar } = body;

    const friend = await prisma.splittzyFriend.update({
      where: { id },
      data: {
        name,
        nickname,
        phone: phone || null,
        upiId: upiId || null,
        avatar: avatar || null,
      },
    });

    return NextResponse.json(friend);
  } catch (error) {
    console.error('Failed to update friend:', error);
    return NextResponse.json({ error: 'Failed to update friend' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.splittzyFriend.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete friend:', error);
    return NextResponse.json({ error: 'Failed to delete friend' }, { status: 500 });
  }
}
