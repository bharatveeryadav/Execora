import * as Minio from 'minio';
import { config } from '../config';
import { logger } from './logger';
import { Readable } from 'stream';

class MinioClient {
  private client: Minio.Client;
  private bucket: string;
  private initialized: boolean = false;

  constructor() {
    this.client = new Minio.Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
    this.bucket = config.minio.bucket;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        logger.info({ bucket: this.bucket }, 'MinIO bucket created');
      }
      this.initialized = true;
    } catch (error) {
      logger.error({ error }, 'MinIO initialization error');
      throw error;
    }
  }

  async uploadFile(
    fileName: string,
    data: Buffer | Readable,
    metadata?: Record<string, string>
  ): Promise<string> {
    await this.initialize();

    const uploadMetadata = {
      'Content-Type': metadata?.contentType || 'application/octet-stream',
      ...metadata,
    };

    const stream = Buffer.isBuffer(data) ? Readable.from(data) : data;

    await this.client.putObject(this.bucket, fileName, stream, uploadMetadata as any);
    return fileName;
  }

  async getFile(fileName: string): Promise<Buffer> {
    await this.initialize();
    const chunks: Buffer[] = [];
    const stream = await this.client.getObject(this.bucket, fileName);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getPresignedUrl(fileName: string, expirySeconds: number = 3600): Promise<string> {
    await this.initialize();
    return await this.client.presignedGetObject(this.bucket, fileName, expirySeconds);
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.initialize();
    await this.client.removeObject(this.bucket, fileName);
  }

  async fileExists(fileName: string): Promise<boolean> {
    await this.initialize();
    try {
      await this.client.statObject(this.bucket, fileName);
      return true;
    } catch {
      return false;
    }
  }
}

export const minioClient = new MinioClient();
