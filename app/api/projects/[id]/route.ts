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

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('获取项目失败:', error);
    return NextResponse.json({ success: false, message: '获取项目失败' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<Params> }) {
  const params = await context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: '未授权' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { name, description, emailSubject, emailContent } = await request.json();

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    });

    if (!project) {
      return NextResponse.json({ success: false, message: '项目不存在' }, { status: 404 });
    }

    if (project.userId !== decoded.userId) {
      return NextResponse.json({ success: false, message: '无权限修改该项目' }, { status: 403 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: { 
        name, 
        description,
        emailSubject,
        emailContent 
      },
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json({ success: false, message: '更新项目失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<Params> }) {
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
      return NextResponse.json({ success: false, message: '无权限删除该项目' }, { status: 403 });
    }

    await prisma.project.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json({ success: false, message: '删除项目失败' }, { status: 500 });
  }
}