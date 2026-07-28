import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const path = join(process.cwd(), 'public', 'uploads', filename);

    await writeFile(path, buffer);
    const url = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
}
