import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const players = await prisma.ledgerPlayer.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(players);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newPlayer = await prisma.ledgerPlayer.create({ data });
    return NextResponse.json(newPlayer);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    const updated = await prisma.ledgerPlayer.update({
      where: { id },
      data
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.ledgerPlayer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 });
  }
}
