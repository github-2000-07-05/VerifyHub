import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

const generateApiKey = (): string => {
  return randomBytes(32).toString('hex');
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const projects = await prisma.project.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('获取项目失败:', error);
    return NextResponse.json({ success: false, message: '获取项目失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { name, description, emailSubject, emailContent } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, message: '请输入项目名称' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
      return NextResponse.json({ success: false, message: '项目名称长度必须在1-100个字符之间' }, { status: 400 });
    }

    if (description && typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ success: false, message: '项目描述长度不能超过500个字符' }, { status: 400 });
    }

    if (emailSubject && typeof emailSubject === 'string' && emailSubject.length > 200) {
      return NextResponse.json({ success: false, message: '邮件主题长度不能超过200个字符' }, { status: 400 });
    }

    if (emailContent && typeof emailContent === 'string' && emailContent.length > 5000) {
      return NextResponse.json({ success: false, message: '邮件内容长度不能超过5000个字符' }, { status: 400 });
    }

    const existingProject = await prisma.project.findFirst({
      where: { userId: decoded.userId, name },
    });

    if (existingProject) {
      return NextResponse.json({ success: false, message: '项目名称已存在' }, { status: 400 });
    }

    let apiKey = generateApiKey();
    while (await prisma.project.findUnique({ where: { apiKey } })) {
      apiKey = generateApiKey();
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        emailSubject: emailSubject || '验证码验证',
        emailContent: emailContent || '您的验证码是：{{code}}',
        apiKey,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('创建项目失败:', error);
    return NextResponse.json({ success: false, message: '创建项目失败' }, { status: 500 });
  }
}