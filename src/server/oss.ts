import crypto from "crypto";
import https from "https";
import http from "http";
import { Readable } from "stream";

const ALGORITHM = "OSS4-HMAC-SHA256";
const REGION = process.env.OSS_REGION || "us-east-1";
const BUCKET = process.env.OSS_BUCKET || "hws-uploads";
const ENDPOINT = process.env.OSS_ENDPOINT || `${BUCKET}.oss-${REGION}.aliyuncs.com`;
const ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || "";
const CDN_BASE = process.env.OSS_CDN_URL || `https://${ENDPOINT}`;

function sha256(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function iso8601(date: Date): string {
  return date.toISOString().replace(/[:\-]/g, "").split(".")[0] + "Z";
}

function dateStr(date: Date): string {
  return date.toISOString().split("T")[0].replace(/-/g, "");
}

function buildCanonicalRequest(method: string, path: string, headers: Record<string, string>): string {
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
    .join("");
  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(";");
  const payloadHash = headers["x-oss-content-sha256"] || "UNSIGNED-PAYLOAD";
  return `${method}\n${path}\n\n${canonicalHeaders}${signedHeaders}\n${payloadHash}`;
}

function buildStringToSign(date: string, canonicalRequest: string): string {
  return `${ALGORITHM}\n${date}\n${sha256(canonicalRequest)}`;
}

function buildAuthorization(key: string, dateStr: string, region: string, signature: string): string {
  const credential = `${key}/${dateStr}/${region}/oss/aliyun_v4_request`;
  return `${ALGORITHM} Credential=${credential},Signature=${signature}`;
}

function sign(method: string, path: string, headers: Record<string, string>): Record<string, string> {
  const now = new Date();
  const date = iso8601(now);
  const ds = dateStr(now);

  headers["x-oss-date"] = date;
  headers["x-oss-content-sha256"] = headers["x-oss-content-sha256"] || "UNSIGNED-PAYLOAD";

  const canonicalRequest = buildCanonicalRequest(method, path, headers);
  const stringToSign = buildStringToSign(date, canonicalRequest);

  const dateKey = hmacSha256(`OSS4-HMAC-SHA256${ACCESS_KEY_SECRET}`, ds);
  const regionKey = hmacSha256(dateKey, REGION);
  const serviceKey = hmacSha256(regionKey, "oss");
  const signingKey = hmacSha256(serviceKey, "aliyun_v4_request");
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  headers["Authorization"] = buildAuthorization(ACCESS_KEY_ID, ds, REGION, signature);
  return headers;
}

export function isOssConfigured(): boolean {
  return !!(ACCESS_KEY_ID && ACCESS_KEY_SECRET && BUCKET);
}

export function getOssUrl(objectKey: string): string {
  return `${CDN_BASE}/${objectKey}`;
}

export function uploadToOss(objectKey: string, buffer: Buffer, contentType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const path = `/${objectKey}`;
    const headers: Record<string, string> = {
      host: ENDPOINT,
      "content-type": contentType,
      "content-length": String(buffer.length),
      "x-oss-content-sha256": sha256(buffer),
    };

    const signedHeaders = sign("PUT", path, headers);

    const options = {
      hostname: ENDPOINT,
      path,
      method: "PUT",
      headers: signedHeaders,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(getOssUrl(objectKey));
        } else {
          reject(new Error(`OSS upload failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(buffer);
    req.end();
  });
}

export function deleteFromOss(objectKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const path = `/${objectKey}`;
    const headers: Record<string, string> = {
      host: ENDPOINT,
    };

    const signedHeaders = sign("DELETE", path, headers);

    const options = {
      hostname: ENDPOINT,
      path,
      method: "DELETE",
      headers: signedHeaders,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`OSS delete failed: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}
