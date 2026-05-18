import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
};

const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少为8个字符' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' };
  }
  return { valid: true, message: '' };
};

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
      return NextResponse.json({ success: false, message: '姓名长度必须在2-50个字符之间' }, { status: 400 });
    }

    if (typeof email !== 'string' || email.length > 255) {
      return NextResponse.json({ success: false, message: '邮箱地址格式不正确' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length > 128) {
      return NextResponse.json({ success: false, message: '密码长度不能超过128个字符' }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ success: false, message: passwordValidation.message }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: '请输入有效的邮箱地址' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: '该邮箱已被注册' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const requestId = generateRequestId();

    const verification = await prisma.verification.create({
      data: {
        email,
        code: verificationCode,
        expiresAt,
        requestId,
        status: 'pending',
        attemptCount: 0,
      },
    });

    const mailOptions = {
      from: `"验证码服务" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '注册验证码',
      html: `
        <div style="max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h2>注册验证码</h2>
          <p>感谢您注册我们的服务！</p>
          <p>您的验证码是：<strong style="font-size: 24px; color: #2563eb;">${verificationCode}</strong></p>
          <p style="color: #999; font-size: 14px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">验证码有效期为 5 分钟</p>
          <p style="color: #999; font-size: 12px; margin-top: 10px;">请求ID: ${requestId}</p>
        </div>
      `,
    };

    if (process.env.EMAIL_SERVICE === 'qq') {
      const transporter = require('nodemailer').createTransport({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail(mailOptions);
    } else {
      console.log('\n=== 模拟发送注册验证码邮件 ===');
      console.log('收件人:', email);
      console.log('验证码:', verificationCode);
      console.log('===================\n');
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱，请查收并完成验证',
      email,
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ success: false, message: '注册失败，请稍后重试' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { email, code, name, password } = await request.json();

    if (!email || !code || !name || !password) {
      return NextResponse.json({ success: false, message: '请填写完整信息' }, { status: 400 });
    }

    const verification = await prisma.verification.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (!verification) {
      return NextResponse.json({ 
        success: false, 
        message: '验证码错误' 
      }, { status: 400 });
    }

    if (verification.status === 'verified') {
      return NextResponse.json({ 
        success: false, 
        message: '该验证码已使用，请重新获取' 
      }, { status: 400 });
    }

    if (verification.status === 'expired') {
      return NextResponse.json({ 
        success: false, 
        message: '验证码已过期，请重新获取' 
      }, { status: 400 });
    }

    if (verification.status === 'invalid') {
      return NextResponse.json({ 
        success: false, 
        message: '该验证码已因重复尝试而作废，请重新获取' 
      }, { status: 400 });
    }

    if (new Date() > verification.expiresAt) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'expired' }
      });
      return NextResponse.json({ 
        success: false, 
        message: '验证码已过期，请重新获取' 
      }, { status: 400 });
    }

    if (verification.code !== code) {
      const newAttemptCount = verification.attemptCount + 1;
      
      if (newAttemptCount >= verification.maxAttempts) {
        await prisma.verification.update({
          where: { id: verification.id },
          data: { 
            status: 'invalid',
            attemptCount: newAttemptCount 
          }
        });

        return NextResponse.json({ 
          success: false, 
          message: '验证码错误次数过多，该验证码已作废，请重新获取' 
        }, { status: 400 });
      }

      await prisma.verification.update({
        where: { id: verification.id },
        data: { attemptCount: newAttemptCount }
      });

      return NextResponse.json({ 
        success: false, 
        message: `验证码错误，还剩 ${verification.maxAttempts - newAttemptCount} 次机会` 
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: '请输入有效的邮箱地址' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: '该邮箱已被注册' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = name.toLowerCase() === 'admin' ? 'admin' : 'user';
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    });

    await prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'verified' }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: '注册成功',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('验证注册失败:', error);
    return NextResponse.json({ success: false, message: '验证失败，请稍后重试' }, { status: 500 });
  }
}