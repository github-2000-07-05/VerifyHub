import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

interface Params {
  id: string;
}

const generateApiKey = (): string => {
  return randomBytes(32).toString('hex');
};

export async function POST(request: Request, context: { params: Promise<Params> }) {
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
      return NextResponse.json({ success: false, message: '无权限修改该项目' }, { status: 403 });
    }

    let apiKey = generateApiKey();
    while (await prisma.project.findUnique({ where: { apiKey } })) {
      apiKey = generateApiKey();
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { apiKey },
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('重新生成API密钥失败:', error);
    return NextResponse.json({ success: false, message: '重新生成API密钥失败' }, { status: 500 });
  }
}