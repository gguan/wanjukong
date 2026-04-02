#!/usr/bin/env node
/**
 * Download WeChat Pay platform certificate and append to .env
 *
 * Usage:  node scripts/download-wechat-cert.mjs
 *
 * Reads WECHAT_PAY_MCH_ID, WECHAT_PAY_PRIVATE_KEY, WECHAT_PAY_CERT_SERIAL,
 * WECHAT_PAY_API_V3_KEY from .env, calls GET /v3/certificates, decrypts the
 * cert, and appends WECHAT_PAY_PLATFORM_CERT to .env.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');

// ─── Load .env manually ──────────────────────────────────

function loadEnv() {
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

const env = loadEnv();

const mchId = env.WECHAT_PAY_MCH_ID;
const privateKey = (env.WECHAT_PAY_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const certSerial = env.WECHAT_PAY_CERT_SERIAL;
const apiV3Key = env.WECHAT_PAY_API_V3_KEY;

if (!mchId || !privateKey || !certSerial || !apiV3Key) {
  console.error('Missing required env vars: WECHAT_PAY_MCH_ID, WECHAT_PAY_PRIVATE_KEY, WECHAT_PAY_CERT_SERIAL, WECHAT_PAY_API_V3_KEY');
  process.exit(1);
}

// ─── Build Authorization header ──────────────────────────

function buildAuthHeader(method, urlPath, body) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');

  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto
    .createSign('RSA-SHA256')
    .update(message)
    .sign(privateKey, 'base64');

  return (
    `WECHATPAY2-SHA256-RSA2048 ` +
    `mchid="${mchId}",` +
    `nonce_str="${nonce}",` +
    `timestamp="${timestamp}",` +
    `serial_no="${certSerial}",` +
    `signature="${sign}"`
  );
}

// ─── Decrypt AES-256-GCM ─────────────────────────────────

function decryptAesGcm(ciphertext, nonce, associatedData) {
  const key = Buffer.from(apiV3Key, 'utf-8');
  const iv = Buffer.from(nonce, 'utf-8');
  const cipherBuf = Buffer.from(ciphertext, 'base64');

  const authTag = cipherBuf.slice(cipherBuf.length - 16);
  const cipherText = cipherBuf.slice(0, cipherBuf.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, 'utf-8'));

  return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf-8');
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const urlPath = '/v3/certificates';
  const url = `https://api.mch.weixin.qq.com${urlPath}`;

  console.log('Fetching WeChat platform certificates...');

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: buildAuthHeader('GET', urlPath, ''),
      Accept: 'application/json',
      'Accept-Language': 'zh-CN',
      'User-Agent': 'wanjukong-cert-downloader/1.0',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed: HTTP ${res.status}\n${err}`);
    process.exit(1);
  }

  const data = await res.json();
  const certs = data.data;

  if (!certs || certs.length === 0) {
    console.error('No certificates returned');
    process.exit(1);
  }

  // Use the most recently effective certificate
  certs.sort((a, b) => new Date(b.effective_time) - new Date(a.effective_time));
  const latest = certs[0];

  console.log(`Certificate serial: ${latest.serial_no}`);
  console.log(`Effective: ${latest.effective_time}`);
  console.log(`Expires:   ${latest.expire_time}`);

  // Decrypt the certificate
  const { ciphertext, nonce, associated_data } = latest.encrypt_certificate;
  const certPem = decryptAesGcm(ciphertext, nonce, associated_data);

  console.log('\nDecrypted platform certificate:');
  console.log(certPem.slice(0, 60) + '...');

  // Escape newlines for .env format
  const envValue = certPem.replace(/\n/g, '\\n');

  // Check if already in .env
  const envContent = fs.readFileSync(envPath, 'utf-8');
  if (envContent.includes('WECHAT_PAY_PLATFORM_CERT=')) {
    // Replace existing
    const updated = envContent.replace(
      /WECHAT_PAY_PLATFORM_CERT=.*/,
      `WECHAT_PAY_PLATFORM_CERT=${envValue}`,
    );
    fs.writeFileSync(envPath, updated, 'utf-8');
    console.log('\nUpdated WECHAT_PAY_PLATFORM_CERT in .env');
  } else {
    // Append
    fs.appendFileSync(envPath, `\nWECHAT_PAY_PLATFORM_CERT=${envValue}\n`, 'utf-8');
    console.log('\nAppended WECHAT_PAY_PLATFORM_CERT to .env');
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
