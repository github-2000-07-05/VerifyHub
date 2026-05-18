import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import prisma from '@/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
};

const jsonResponse = (data: any, init?: ResponseInit) => {
  return NextResponse.json(data, { 
    ...init, 
    headers: { 
      ...corsHeaders, 
      ...securityHeaders,
      ...init?.headers 
    } 
  });
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateRequestId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req_${timestamp}_${random}`;
};

const replacePlaceholders = (content: string, code: string, email: string): string => {
  return content
    .replace(/\{\{code\}\}/g, code)
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{\{expireMinutes\}\}/g, '5');
};

export async function POST(request: Request) {
  try {
    const { email, apiKey, skipUserCheck } = await request.json();

    if (!email) {
      return jsonResponse({ success: false, message: '邮箱地址不能为空' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse({ success: false, message: '请输入有效的邮箱地址' }, { status: 400 });
    }

    let emailSubject = '验证码验证';
    let emailContent = '您的验证码是：{{code}}';
    let projectId: string | null = null;

    if (apiKey) {
      const project = await prisma.project.findUnique({ where: { apiKey } });
      if (project) {
        emailSubject = project.emailSubject;
        emailContent = project.emailContent;
        projectId = project.id;
      } else {
        return jsonResponse({ success: false, message: '无效的 API Key' }, { status: 400 });
      }
    }

    let userId: string | null = null;

    if (!skipUserCheck) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return jsonResponse({ success: false, message: '该邮箱未注册' }, { status: 400 });
      }
      userId = user.id;
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const requestId = generateRequestId();

    if (userId) {
      await prisma.verification.upsert({
        where: { userId: userId },
        update: { 
          code, 
          expiresAt, 
          requestId,
          status: 'pending',
          attemptCount: 0,
          updatedAt: new Date()
        },
        create: { 
          userId: userId, 
          code, 
          expiresAt, 
          requestId,
          status: 'pending',
          attemptCount: 0
        },
      });
    } else {
      // 清理旧的验证码记录
      await prisma.verification.deleteMany({
        where: {
          email: email,
          status: { in: ['pending', 'verified'] }
        }
      });

      await prisma.verification.create({
        data: { 
          code, 
          expiresAt, 
          email,
          requestId,
          status: 'pending',
          attemptCount: 0
        },
      });
    }

    const renderedContent = replacePlaceholders(emailContent, code, email);

    let transporter;

    if (process.env.EMAIL_SERVICE === 'gmail') {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
      transporter = nodemailer.createTransport({
        service: 'sendgrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else if (process.env.EMAIL_SERVICE === 'qq') {
      transporter = nodemailer.createTransport({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else if (process.env.EMAIL_SERVICE === 'netease') {
      transporter = nodemailer.createTransport({
        host: 'smtp.163.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
    } else if (process.env.EMAIL_SERVICE === 'outlook') {
      const outlookOptions: any = {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        requireTLS: true,
      };

      if (process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET && process.env.OAUTH_REFRESH_TOKEN) {
        outlookOptions.auth = {
          type: 'OAuth2',
          user: process.env.OUTLOOK_EMAIL,
          clientId: process.env.OAUTH_CLIENT_ID,
          clientSecret: process.env.OAUTH_CLIENT_SECRET,
          refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        };
      } else {
        outlookOptions.auth = {
          user: process.env.OUTLOOK_EMAIL,
          pass: process.env.OUTLOOK_PASSWORD,
        };
      }

      transporter = nodemailer.createTransport(outlookOptions);
    } else {
      console.log('\n=== 模拟发送邮件 ===');
      console.log('收件人:', email);
      console.log('主题:', emailSubject);
      console.log('内容:', renderedContent);
      console.log('===================\n');

      if (projectId) {
        await prisma.requestLog.create({
          data: {
            projectId,
            email,
            status: 'success'
          }
        });
      }

      return jsonResponse({
        success: true,
        message: '验证码已发送到您的邮箱（开发模式）'
      });
    }

    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || '验证码服务'}" <${fromEmail}>`,
      to: email,
      subject: emailSubject,
      html: `
        <div style="max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          ${renderedContent.replace(/\n/g, '<br>')}
          <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">验证码有效期为 5 分钟</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    if (projectId) {
      await prisma.requestLog.create({
        data: {
          projectId,
          email,
          status: 'success'
        }
      });
    }

    return jsonResponse({ success: true, message: '验证码已发送到您的邮箱' });
  } catch (error: any) {
    console.error('发送邮件失败:', error);
    
    if (projectId) {
      await prisma.requestLog.create({
        data: {
          projectId,
          email,
          status: 'failed',
          errorMessage: '发送失败'
        }
      });
    }

    return jsonResponse({ success: false, message: '发送邮件失败，请稍后重试' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { email, code, skipUserCheck } = await request.json();

    if (!email || !code) {
      return jsonResponse({ success: false, message: '邮箱地址和验证码不能为空' }, { status: 400 });
    }

    let verification;

    if (!skipUserCheck) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return jsonResponse({ success: false, message: '该邮箱未注册' }, { status: 400 });
      }
      verification = await prisma.verification.findUnique({ where: { userId: user.id } });
    } else {
      verification = await prisma.verification.findFirst({ 
        where: { email }, 
        orderBy: { createdAt: 'desc' } 
      });
    }

    if (!verification) {
      return jsonResponse({ 
        success: false, 
        message: '请先获取验证码',
        status: 'no_code'
      }, { status: 400 });
    }

    // 检查验证码状态
    if (verification.status === 'verified') {
      return jsonResponse({ 
        success: false, 
        message: '该验证码已使用，请重新获取',
        status: 'verified',
        requestId: verification.requestId
      }, { status: 400 });
    }

    if (verification.status === 'expired') {
      return jsonResponse({ 
        success: false, 
        message: '验证码已过期，请重新获取',
        status: 'expired',
        requestId: verification.requestId
      }, { status: 400 });
    }

    if (verification.status === 'invalid') {
      return jsonResponse({ 
        success: false, 
        message: '该验证码已因重复尝试而作废，请重新获取',
        status: 'invalid',
        requestId: verification.requestId
      }, { status: 400 });
    }

    // 检查是否过期
    if (new Date() > verification.expiresAt) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'expired' }
      });
      
      return jsonResponse({ 
        success: false, 
        message: '验证码已过期，请重新获取',
        status: 'expired',
        requestId: verification.requestId
      }, { status: 400 });
    }

    // 检查验证码是否正确
    if (verification.code !== code) {
      const newAttemptCount = verification.attemptCount + 1;
      
      // 如果达到最大尝试次数，标记为无效
      if (newAttemptCount >= verification.maxAttempts) {
        await prisma.verification.update({
          where: { id: verification.id },
          data: { 
            status: 'invalid',
            attemptCount: newAttemptCount,
            updatedAt: new Date()
          }
        });

        return jsonResponse({ 
          success: false, 
          message: '验证码错误次数过多，该验证码已作废，请重新获取',
          status: 'invalid',
          requestId: verification.requestId,
          attempts: newAttemptCount,
          maxAttempts: verification.maxAttempts
        }, { status: 400 });
      }

      // 更新尝试次数
      await prisma.verification.update({
        where: { id: verification.id },
        data: { 
          attemptCount: newAttemptCount,
          updatedAt: new Date()
        }
      });

      return jsonResponse({ 
        success: false, 
        message: `验证码错误，还剩 ${verification.maxAttempts - newAttemptCount} 次机会`,
        status: 'pending',
        requestId: verification.requestId,
        attempts: newAttemptCount,
        maxAttempts: verification.maxAttempts
      }, { status: 400 });
    }

    // 验证成功
    await prisma.verification.update({
      where: { id: verification.id },
      data: { 
        status: 'verified',
        updatedAt: new Date()
      }
    });

    return jsonResponse({ 
      success: true, 
      message: '验证成功',
      status: 'verified',
      requestId: verification.requestId
    });
  } catch (error) {
    console.error('验证失败:', error);
    return jsonResponse({ success: false, message: '验证失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const requestId = searchParams.get('requestId');

    if (!email && !requestId) {
      return jsonResponse({ success: false, message: '请提供邮箱地址或请求ID' }, { status: 400 });
    }

    let verification;

    if (requestId) {
      verification = await prisma.verification.findUnique({ 
        where: { requestId } 
      });
    } else if (email) {
      verification = await prisma.verification.findFirst({ 
        where: { email }, 
        orderBy: { createdAt: 'desc' } 
      });
    }

    if (!verification) {
      return jsonResponse({ 
        success: false, 
        message: '未找到验证码记录',
        status: 'not_found'
      }, { status: 404 });
    }

    // 检查是否过期（如果状态还是pending）
    if (verification.status === 'pending' && new Date() > verification.expiresAt) {
      verification = await prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'expired' }
      });
    }

    return jsonResponse({ 
      success: true, 
      verification: {
        requestId: verification.requestId,
        status: verification.status,
        email: verification.email,
        expiresAt: verification.expiresAt,
        attemptCount: verification.attemptCount,
        maxAttempts: verification.maxAttempts,
        createdAt: verification.createdAt
      }
    });
  } catch (error) {
    console.error('查询验证码状态失败:', error);
    return jsonResponse({ success: false, message: '查询失败，请稍后重试' }, { status: 500 });
  }
}
