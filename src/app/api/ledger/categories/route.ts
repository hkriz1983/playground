import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const categories = await prisma.ledgerCategory.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const data = await req.json();
    const newCategory = await prisma.ledgerCategory.create({ 
      data: { ...data, userId } 
    });
    return NextResponse.json(newCategory);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    
    // Check ownership
    const existing = await prisma.ledgerCategory.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
    }

    const updated = await prisma.ledgerCategory.update({
      where: { id },
      data
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const existing = await prisma.ledgerCategory.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 403 });
    }

    await prisma.ledgerCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
