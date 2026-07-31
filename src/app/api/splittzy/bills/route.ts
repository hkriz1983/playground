import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'date_desc';

    let orderBy: Prisma.SplittzyBillOrderByWithRelationInput = { date: 'desc' };
    if (sort === 'date_asc') orderBy = { date: 'asc' };
    if (sort === 'amount_desc') orderBy = { totalAmount: 'desc' };
    if (sort === 'amount_asc') orderBy = { totalAmount: 'asc' };

    const bills = await prisma.splittzyBill.findMany({
      orderBy,
      include: {
        participants: {
          include: {
            friend: true,
          },
        },
      },
    });

    // Calculate Summary Stats:
    // Total Receivable: Sum of pending/uploaded shares where user gets back money (positive shares)
    // Total Due: Sum of pending shares where user owes money (negative shares)
    let totalReceivable = 0;
    let totalDue = 0;

    bills.forEach((bill) => {
      // Do not count cancelled bills in any calculation
      if (bill.isCancelled) return;

      bill.participants.forEach((p) => {
        if (p.status !== 'PAID') {
          if (p.shareAmount > 0) {
            totalReceivable += p.shareAmount;
          } else if (p.shareAmount < 0) {
            totalDue += Math.abs(p.shareAmount);
          }
        }
      });
    });

    const netReceive = totalReceivable - totalDue;

    return NextResponse.json({
      bills,
      summary: {
        totalReceivable,
        totalDue,
        netReceive,
      },
    });
  } catch (error) {
    console.error('Failed to fetch bills:', error);
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, date, totalAmount, splitMode, billPhotos, participants } = body;

    if (!title || !totalAmount || !participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ error: 'Title, total amount, and at least one participant are required' }, { status: 400 });
    }

    const numericTotal = parseFloat(totalAmount);
    const photosJson = JSON.stringify(Array.isArray(billPhotos) ? billPhotos : []);
    const shareCode = `bill-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    type ParticipantInput = {
      friendId: string;
      percentage?: number | string;
      exactAmount?: number | string;
    };

    // Prepare participants with calculated share amounts
    const participantData = (participants as ParticipantInput[]).map((p) => {
      let calculatedShare = 0;
      if (splitMode === 'AUTO') {
        calculatedShare = Number((numericTotal / participants.length).toFixed(2));
      } else if (splitMode === 'CUSTOM_PERCENTAGE') {
        const pct = parseFloat(String(p.percentage || '0'));
        calculatedShare = Number(((numericTotal * pct) / 100).toFixed(2));
      } else if (splitMode === 'CUSTOM_EXACT') {
        calculatedShare = parseFloat(String(p.exactAmount || '0'));
      }

      return {
        friendId: p.friendId,
        shareAmount: calculatedShare,
        percentage: parseFloat(String(p.percentage || '0')),
        exactAmount: parseFloat(String(p.exactAmount || '0')),
        status: 'PENDING',
      };
    });

    const newBill = await prisma.splittzyBill.create({
      data: {
        title,
        date: date ? new Date(date) : new Date(),
        totalAmount: numericTotal,
        splitMode: splitMode || 'AUTO',
        billPhotos: photosJson,
        shareCode,
        participants: {
          create: participantData,
        },
      },
      include: {
        participants: {
          include: {
            friend: true,
          },
        },
      },
    });

    return NextResponse.json(newBill, { status: 201 });
  } catch (error) {
    console.error('Failed to create bill:', error);
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}
