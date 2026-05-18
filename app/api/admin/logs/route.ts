import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const verifyAdminToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role?: string };
    return decoded.role === 'admin' ? decoded : null;
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  const decoded = verifyAdminToken(token);
  
  if (!decoded) {
    return NextResponse.json({ success: false, message: '未授权访问' }, { status: 401 });
  }

  try {
    const requestLogs = await prisma.requestLog.findMany({
      include: {
        project: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, requestLogs });
  } catch (error) {
    console.error('获取请求日志失败:', error);
    return NextResponse.json({ success: false, message: '获取请求日志失败' }, { status: 500 });
  }
}