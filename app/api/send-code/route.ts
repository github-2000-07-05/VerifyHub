import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail, EmailConfig } from '@/lib/email';

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

const getEmailConfig = (): EmailConfig | null => {
  const service = process.env.EMAIL_SERVICE?.toLowerCase();

  if (service === 'qq') {
    return {
      service: 'qq',
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS,
    };
  }

  if (service === 'outlook') {
    return {
      service: 'outlook',
      user: process.env.OUTLOOK_EMAIL || process.env.EMAIL_USER || '',
      pass: process.env.OUTLOOK_PASSWORD,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    };
  }

  return null;
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
    const emailConfig = getEmailConfig();

    if (!emailConfig) {
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

    const htmlContent = `
      <div style="max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        ${renderedContent.replace(/\n/g, '<br>')}
        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">验证码有效期为 5 分钟</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: emailSubject,
      html: htmlContent,
    }, emailConfig);

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
        message: '验证码已作废，请重新获取',
        status: 'invalid',
        requestId: verification.requestId
      }, { status: 400 });
    }

    if (verification.expiresAt < new Date()) {
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

    if (verification.attemptCount >= verification.maxAttempts) {
      await prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'invalid' }
      });
      return jsonResponse({
        success: false,
        message: '验证码错误次数过多，请重新获取',
        status: 'invalid',
        requestId: verification.requestId
      }, { status: 400 });
    }

    if (verification.code !== code) {
      const newAttemptCount = verification.attemptCount + 1;
      const remainingAttempts = verification.maxAttempts - newAttemptCount;

      await prisma.verification.update({
        where: { id: verification.id },
        data: { attemptCount: newAttemptCount }
      });

      if (newAttemptCount >= verification.maxAttempts) {
        await prisma.verification.update({
          where: { id: verification.id },
          data: { status: 'invalid' }
        });
        return jsonResponse({
          success: false,
          message: '验证码错误次数过多，请重新获取',
          status: 'invalid',
          requestId: verification.requestId,
          remainingAttempts: 0
        }, { status: 400 });
      }

      return jsonResponse({
        success: false,
        message: `验证码错误，剩余 ${remainingAttempts} 次尝试机会`,
        status: 'incorrect',
        requestId: verification.requestId,
        remainingAttempts
      }, { status: 400 });
    }

    await prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'verified' }
    });

    return jsonResponse({
      success: true,
      message: '验证成功',
      requestId: verification.requestId
    });
  } catch (error: any) {
    console.error('验证失败:', error);
    return jsonResponse({ success: false, message: '验证失败，请稍后重试' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return jsonResponse({ success: false, message: '缺少 requestId 参数' }, { status: 400 });
    }

    const verification = await prisma.verification.findUnique({
      where: { requestId }
    });

    if (!verification) {
      return jsonResponse({ success: false, message: '验证码不存在' }, { status: 404 });
    }

    return jsonResponse({
      success: true,
      status: verification.status,
      requestId: verification.requestId,
      attemptCount: verification.attemptCount,
      remainingAttempts: verification.maxAttempts - verification.attemptCount,
      expiresAt: verification.expiresAt,
      createdAt: verification.createdAt
    });
  } catch (error: any) {
    console.error('查询验证码状态失败:', error);
    return jsonResponse({ success: false, message: '查询失败，请稍后重试' }, { status: 500 });
  }
}
