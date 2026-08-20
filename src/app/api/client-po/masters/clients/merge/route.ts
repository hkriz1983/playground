import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { primaryClientId, secondaryClientId } = body;

    if (!primaryClientId || !secondaryClientId) {
      return NextResponse.json({ error: 'Primary and Secondary Client IDs are required' }, { status: 400 });
    }

    if (primaryClientId === secondaryClientId) {
      return NextResponse.json({ error: 'Primary and Secondary Client cannot be the same' }, { status: 400 });
    }

    const primaryClient = await prisma.clientPoClient.findUnique({ where: { id: primaryClientId } });
    const secondaryClient = await prisma.clientPoClient.findUnique({ where: { id: secondaryClientId } });

    if (!primaryClient || !secondaryClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [relinkedProjects, relinkedPOs] = await prisma.$transaction([
      prisma.clientPoProject.updateMany({
        where: { clientId: secondaryClientId },
        data: { clientId: primaryClientId }
      }),
      prisma.clientPoHeader.updateMany({
        where: { clientId: secondaryClientId },
        data: { clientId: primaryClientId }
      }),
      prisma.clientPoClient.delete({
        where: { id: secondaryClientId }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: `Merged '${secondaryClient.name}' into '${primaryClient.name}'. ${relinkedPOs.count} Purchase Order(s) and ${relinkedProjects.count} Project(s) re-linked.`,
      primaryClient
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to merge clients' }, { status: 500 });
  }
}
