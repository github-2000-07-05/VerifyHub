import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Promise<Params> }) {
  const params = await context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: '项目不存在' }, { status: 404 });
    }

    if (project.userId !== decoded.userId) {
      return NextResponse.json({ success: false, message: '无权限访问该项目' }, { status: 403 });
    }

    const logs = await prisma.requestLog.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json({ success: false, message: '获取日志失败' }, { status: 500 });
  }
}
