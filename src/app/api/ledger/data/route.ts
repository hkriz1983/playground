import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter is required (YYYY-MM)' }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthInt = parseInt(monthStr) - 1; // 0-indexed for Date

    const startOfMonth = new Date(year, monthInt, 1);
    const endOfMonth = new Date(year, monthInt + 1, 0, 23, 59, 59, 999);

    // Fetch categories
    const categories = await prisma.ledgerCategory.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    });

    // Fetch entries for the month
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: { date: 'asc' }
    });

    // Fetch payments for the month
    const payments = await prisma.ledgerPayment.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: { date: 'asc' }
    });

    // Compute Opening Balance
    // Sum of all payments before startOfMonth
    const pastPayments = await prisma.ledgerPayment.aggregate({
      where: { userId, date: { lt: startOfMonth } },
      _sum: { amount: true }
    });

    // Sum of all entries before startOfMonth
    const pastEntries = await prisma.ledgerEntry.aggregate({
      where: { userId, date: { lt: startOfMonth } },
      _sum: { amount: true }
    });

    const totalPastPayments = pastPayments._sum.amount || 0;
    const totalPastEntries = pastEntries._sum.amount || 0;
    
    // Balance logic: Balance Payable = pastEntries - pastPayments
    const openingBalance = totalPastEntries - totalPastPayments;

    // Fetch player payments for the month
    const playerPayments = await prisma.playerPayment.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: { player: true },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({
      categories,
      entries,
      payments,
      playerPayments,
      openingBalance
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch ledger data' }, { status: 500 });
  }
}
