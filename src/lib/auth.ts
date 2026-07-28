import { NextRequest } from 'next/server';

export const getUserId = (req: NextRequest) => {
  const authCookie = req.cookies.get('playground_auth');
  return authCookie?.value || req.headers.get('x-user-id') || 'mock-user-1234';
};
