import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const payments = await prisma.playerPayment.findMany({
      include: { player: true },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch player payments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const payment = await prisma.playerPayment.create({
      data: {
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.playerPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete player payment' }, { status: 500 });
  }
}
