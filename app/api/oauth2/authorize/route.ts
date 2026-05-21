import { NextResponse } from 'next/server';
import { getOAuth2AuthUrl } from '@/lib/email';

export async function GET() {
  try {
    const authUrl = getOAuth2AuthUrl();

    return NextResponse.json({
      success: true,
      authUrl,
      instructions: '访问 authUrl 获取授权码，然后访问 /api/oauth2/callback?code=你的授权码'
    });
  } catch (error) {
    console.error('OAuth2 authorize error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      message: `获取授权链接失败: ${message}`
    }, { status: 500 });
  }
}
