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
    const projects = await prisma.project.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { requestLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return NextResponse.json({ success: false, message: '获取项目列表失败' }, { status: 500 });
  }
}