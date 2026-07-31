import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const bill = await prisma.splittzyBill.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            friend: true,
          },
        },
      },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Failed to fetch bill detail:', error);
    return NextResponse.json({ error: 'Failed to fetch bill detail' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { action } = body;

    // Action 1: Settle or toggle participant payment status
    if (action === 'settle_participant') {
      const { participantId, status } = body; // status = 'PAID' | 'PENDING'
      const updatedParticipant = await prisma.splittzyBillParticipant.update({
        where: { id: participantId },
        data: {
          status: status || 'PAID',
          paidAt: status === 'PAID' ? new Date() : null,
        },
      });
      return NextResponse.json({ success: true, participant: updatedParticipant });
    }

    // Action 1B: Upload payment proof for participant directly
    if (action === 'upload_participant_proof') {
      const { participantId, screenshotUrl, status } = body;
      const updatedParticipant = await prisma.splittzyBillParticipant.update({
        where: { id: participantId },
        data: {
          paymentScreenshot: screenshotUrl,
          status: status || 'PAID',
          paidAt: status === 'PAID' ? new Date() : undefined,
        },
      });
      return NextResponse.json({ success: true, participant: updatedParticipant });
    }

    // Action 2: Replace / Update Bill Photos
    if (action === 'update_photos') {
      const { billPhotos } = body;
      const updatedBill = await prisma.splittzyBill.update({
        where: { id },
        data: {
          billPhotos: JSON.stringify(Array.isArray(billPhotos) ? billPhotos : []),
        },
      });
      return NextResponse.json(updatedBill);
    }

    // Action 3: Add friend to existing bill
    if (action === 'add_participant') {
      const { friendId, shareAmount } = body;
      const newParticipant = await prisma.splittzyBillParticipant.create({
        data: {
          billId: id,
          friendId,
          shareAmount: parseFloat(shareAmount || 0),
          status: 'PENDING',
        },
        include: {
          friend: true,
        },
      });
      return NextResponse.json(newParticipant);
    }

    // Action 4: Cancel bill with reason
    if (action === 'cancel_bill') {
      const { cancellationReason } = body;
      if (!cancellationReason || !cancellationReason.trim()) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 });
      }
      const updatedBill = await prisma.splittzyBill.update({
        where: { id },
        data: {
          isCancelled: true,
          cancellationReason: cancellationReason.trim(),
        },
      });
      return NextResponse.json(updatedBill);
    }

    // Action 5: Restore / Un-cancel bill
    if (action === 'uncancel_bill') {
      const updatedBill = await prisma.splittzyBill.update({
        where: { id },
        data: {
          isCancelled: false,
          cancellationReason: null,
        },
      });
      return NextResponse.json(updatedBill);
    }

    // Action 4: Edit full bill details
    const { title, totalAmount, date } = body;
    const updated = await prisma.splittzyBill.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        totalAmount: totalAmount !== undefined ? parseFloat(totalAmount) : undefined,
        date: date ? new Date(date) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update bill:', error);
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    await prisma.splittzyBill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bill:', error);
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
  }
}
