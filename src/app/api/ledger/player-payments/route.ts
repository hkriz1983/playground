import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const payments = await prisma.playerPayment.findMany({
      where: { userId },
      include: { player: true },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch player payments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const data = await req.json();
    const payment = await prisma.playerPayment.create({
      data: {
        userId,
        playerId: data.playerId,
        amount: data.amount,
        date: new Date(data.date),
        againstWhat: data.againstWhat,
        receiptUrl: data.receiptUrl,
      },
      include: { player: true }
    });
    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to log player payment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const existing = await prisma.playerPayment.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
    }

    await prisma.playerPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete player payment' }, { status: 500 });
  }
}
