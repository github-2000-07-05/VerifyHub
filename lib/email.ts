import nodemailer from 'nodemailer';
import axios from 'axios';

export interface EmailConfig {
  service: 'qq' | 'outlook';
  user: string;
  pass?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

const oauth2Config = {
  clientId: process.env.OAUTH_CLIENT_ID || '',
  redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/oauth2/callback',
  scope: 'https://outlook.office.com/SMTP.Send offline_access',
  authUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
};

export const getOAuth2AuthUrl = (): string => {
  const params = new URLSearchParams({
    client_id: oauth2Config.clientId,
    response_type: 'code',
    redirect_uri: oauth2Config.redirectUri,
    response_mode: 'query',
    scope: oauth2Config.scope,
    state: Math.random().toString(36).substring(2, 15),
  });
  return `${oauth2Config.authUrl}?${params.toString()}`;
};

export const getAccessTokenFromRefreshToken = async (refreshToken: string): Promise<string> => {
  try {
    const params = new URLSearchParams({
      client_id: oauth2Config.clientId,
      scope: oauth2Config.scope,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_secret: process.env.OAUTH_CLIENT_SECRET || '',
    });

    const response = await axios.post(oauth2Config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

export const exchangeCodeForTokens = async (code: string): Promise<{ refresh_token: string; access_token: string }> => {
  try {
    const params = new URLSearchParams({
      client_id: oauth2Config.clientId,
      scope: oauth2Config.scope,
      code,
      redirect_uri: oauth2Config.redirectUri,
      grant_type: 'authorization_code',
      client_secret: process.env.OAUTH_CLIENT_SECRET || '',
    });

    const response = await axios.post(oauth2Config.tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      refresh_token: response.data.refresh_token,
      access_token: response.data.access_token,
    };
  } catch (error: any) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    throw new Error('Failed to exchange code for tokens');
  }
};

export const createTransporter = async (config: EmailConfig): Promise<nodemailer.Transporter> => {
  if (config.service === 'qq') {
    return nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  if (config.service === 'outlook') {
    if (config.clientId && config.clientSecret && config.refreshToken) {
      const accessToken = await getAccessTokenFromRefreshToken(config.refreshToken);

      return nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          type: 'OAuth2',
          user: config.user,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
          accessToken,
        },
      });
    }

    if (config.pass) {
      return nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }

    throw new Error('Outlook OAuth2 configuration is incomplete');
  }

  throw new Error(`Unsupported email service: ${config.service}`);
};

export const sendEmail = async (options: SendEmailOptions, config: EmailConfig): Promise<void> => {
  const transporter = await createTransporter(config);

  const fromEmail = options.from || config.user;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || '验证码服务'}" <${fromEmail}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};
