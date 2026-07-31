import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: { shareCode: string } }) {
  try {
    const { shareCode } = params;
    const body = await req.json();
    const { participantId, screenshotUrl } = body;

    if (!participantId || !screenshotUrl) {
      return NextResponse.json({ error: 'Participant ID and screenshot URL are required' }, { status: 400 });
    }

    // Verify bill exists
    const bill = await prisma.splittzyBill.findUnique({
      where: { shareCode },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Invalid share code' }, { status: 404 });
    }

    if (bill.isCancelled) {
      return NextResponse.json({ error: 'This bill has been cancelled. Payment uploads are disabled.' }, { status: 400 });
    }

    const updated = await prisma.splittzyBillParticipant.update({
      where: { id: participantId },
      data: {
        status: 'PAYMENT_UPLOADED',
        paymentScreenshot: screenshotUrl,
      },
      include: {
        friend: true,
      },
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error) {
    console.error('Failed to upload payment screenshot:', error);
    return NextResponse.json({ error: 'Failed to upload payment screenshot' }, { status: 500 });
  }
}
