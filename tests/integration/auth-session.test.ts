import { describe, it, expect } from 'vitest';
import { GET as getMe } from '@/app/api/me/route';
import { GET as listUnits, POST as createUnit } from '@/app/api/master/[type]/route';
import { GET as listUsers } from '@/app/api/users/route';
import { POST as uploadUrl } from '@/app/api/files/upload-url/route';
import { NextRequest } from 'next/server';

describe('Unauthenticated API Requests (AC-01)', () => {
  it('AC-01 tanpa session mengembalikan 401 UNAUTHENTICATED pada endpoint privat', async () => {
    // 1. GET /api/me
    const meReq = new NextRequest('http://localhost:3000/api/me');
    const meRes = await getMe(meReq);
    expect(meRes.status).toBe(401);
    const meJson = await meRes.json();
    expect(meJson.error.code).toBe('UNAUTHENTICATED');

    // 2. GET /api/master/units
    const unitsReq = new NextRequest('http://localhost:3000/api/master/units');
    const unitsRes = await listUnits(unitsReq, { params: Promise.resolve({ type: 'units' }) });
    expect(unitsRes.status).toBe(401);
    const unitsJson = await unitsRes.json();
    expect(unitsJson.error.code).toBe('UNAUTHENTICATED');

    // 3. POST /api/master/units
    const createUnitReq = new NextRequest('http://localhost:3000/api/master/units', {
      method: 'POST',
      body: JSON.stringify({ code: 'TEST', name: 'Test' }),
    });
    const createUnitRes = await createUnit(createUnitReq, { params: Promise.resolve({ type: 'units' }) });
    expect(createUnitRes.status).toBe(401);
    const createUnitJson = await createUnitRes.json();
    expect(createUnitJson.error.code).toBe('UNAUTHENTICATED');

    // 4. GET /api/users
    const usersReq = new NextRequest('http://localhost:3000/api/users');
    const usersRes = await listUsers(usersReq);
    expect(usersRes.status).toBe(401);
    const usersJson = await usersRes.json();
    expect(usersJson.error.code).toBe('UNAUTHENTICATED');

    // 5. POST /api/files/upload-url
    const fileReq = new NextRequest('http://localhost:3000/api/files/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'DOCUMENT',
        ownerType: 'Test',
        ownerId: '123',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1000,
      }),
    });
    const fileRes = await uploadUrl(fileReq);
    expect(fileRes.status).toBe(401);
    const fileJson = await fileRes.json();
    expect(fileJson.error.code).toBe('UNAUTHENTICATED');
  });
});
