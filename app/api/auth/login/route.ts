import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, message: '请填写邮箱和密码' }, { status: 400 });
    }

    if (typeof email !== 'string' || email.length > 255) {
      return NextResponse.json({ success: false, message: '邮箱地址格式不正确' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length > 128) {
      return NextResponse.json({ success: false, message: '密码格式不正确' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: '邮箱地址格式不正确' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 400 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ success: false, message: '邮箱或密码错误' }, { status: 400 });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return NextResponse.json({
      success: true,
      message: '登录成功',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ success: false, message: '登录失败，请稍后重试' }, { status: 500 });
  }
}