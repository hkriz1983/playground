import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);

    const headers = await prisma.taskHeader.findMany({
      where: { userId },
      include: {
        _count: {
          select: { notes: true }
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(headers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch task headers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { name, color, icon } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Task header name is required' }, { status: 400 });
    }

    const newHeader = await prisma.taskHeader.create({
      data: {
        userId,
        name: name.trim(),
        color: color || 'primary',
        icon: icon || 'folder',
      },
    });

    return NextResponse.json(newHeader, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create task header' }, { status: 500 });
  }
}
