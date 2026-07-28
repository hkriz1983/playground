import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const getUserId = (req: NextRequest) => {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('playground_auth');
  return authCookie?.value || req.headers.get('x-user-id') || 'mock-user-1234';
};
