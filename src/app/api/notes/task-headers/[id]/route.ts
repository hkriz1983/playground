import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(req);
    const { name, color, icon } = await req.json();

    const existing = await prisma.taskHeader.findFirst({
      where: { id: params.id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task header not found' }, { status: 404 });
    }

    const updated = await prisma.taskHeader.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        color: color || existing.color,
        icon: icon || existing.icon,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update task header' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getUserId(req);

    const existing = await prisma.taskHeader.findFirst({
      where: { id: params.id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Task header not found' }, { status: 404 });
    }

    await prisma.taskHeader.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete task header' }, { status: 500 });
  }
}
