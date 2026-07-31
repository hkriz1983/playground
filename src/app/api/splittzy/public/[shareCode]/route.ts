import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { shareCode: string } }) {
  try {
    const { shareCode } = params;

    const bill = await prisma.splittzyBill.findUnique({
      where: { shareCode },
      include: {
        participants: {
          include: {
            friend: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill link not found or invalid' }, { status: 404 });
    }

    // Owner details (mock or system user)
    const owner = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { name: true, email: true },
    });

    return NextResponse.json({
      bill,
      ownerUpiId: 'splittzy.owner@okicici', // Primary owner UPI ID for receiving payments
      ownerName: owner ? owner.name : 'Splittzy Owner',
    });
  } catch (error) {
    console.error('Failed to fetch public bill:', error);
    return NextResponse.json({ error: 'Failed to fetch bill' }, { status: 500 });
  }
}
