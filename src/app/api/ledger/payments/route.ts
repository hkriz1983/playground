import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const payment = await prisma.ledgerPayment.create({
      data: {
        date: new Date(data.date),
        amount: data.amount,
        description: data.description,
      }
    });
    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.ledgerPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
