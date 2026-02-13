import nodemailer from 'nodemailer'

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
}

export type SendSmtpMailInput = {
  from: string
  to: string[] | string
  subject: string
  text: string
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function readSmtpConfigFromEnv(): SmtpConfig {
  const host = (process.env.SMTP_HOST || '').trim()
  const user = (process.env.SMTP_USER || '').trim()
  const pass = process.env.SMTP_PASS || ''

  const portRaw = process.env.SMTP_PORT || '465'
  const port = Number(portRaw)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`SMTP_PORT 配置无效：${portRaw}`)
  }

  const secure = parseBoolean(process.env.SMTP_SECURE, port === 465)

  if (!host || !user || !pass) {
    throw new Error('SMTP 配置不完整，请检查 SMTP_HOST / SMTP_USER / SMTP_PASS')
  }

  return { host, port, secure, user, pass }
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null
let cachedKey: string | null = null

function getTransporter() {
  const config = readSmtpConfigFromEnv()
  const configKey = `${config.host}|${config.port}|${config.secure}|${config.user}|${config.pass}`
  if (cachedTransporter && cachedKey === configKey) {
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    connectionTimeout: 8000,
    socketTimeout: 10000,
  })
  cachedKey = configKey
  return cachedTransporter
}

export async function sendSmtpMail(input: SendSmtpMailInput): Promise<void> {
  const transporter = getTransporter()
  const to = Array.isArray(input.to) ? input.to.join(', ') : input.to
  await transporter.sendMail({
    from: input.from,
    to,
    subject: input.subject,
    text: input.text,
  })
}
