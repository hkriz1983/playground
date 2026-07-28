import { NextRequest } from 'next/server';

export const getUserId = (req: NextRequest) => {
  return req.headers.get('x-user-id') || 'mock-user-1234';
};
