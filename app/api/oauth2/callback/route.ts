import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/email';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json({
        success: false,
        message: `OAuth2 授权失败: ${error}`
      }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({
        success: false,
        message: '缺少 code 参数'
      }, { status: 400 });
    }

    const tokens = await exchangeCodeForTokens(code);

    return NextResponse.json({
      success: true,
      message: 'OAuth2 授权成功',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      instructions: '请将 refresh_token 保存到环境变量 OAUTH_REFRESH_TOKEN 中'
    });
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      message: `OAuth2 授权失败: ${message}`
    }, { status: 500 });
  }
}
