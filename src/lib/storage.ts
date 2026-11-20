import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { z } from 'zod'
import { HttpError } from './http'

export const imageLimit = 2 * 1024 * 1024
export const mimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const
const formats = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const
type MimeType = typeof mimeTypes[number]
export const storageKeySchema = z.string().regex(/^(?:seed\/)?[a-z0-9-]+\.(?:jpg|png|webp)$/)
const root = join(process.cwd(), 'public', 'uploads')
const bucket = process.env.STORAGE_BUCKET
let client: S3Client | undefined
function s3() {
  const { STORAGE_REGION, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY } = process.env
  if (!STORAGE_REGION || !STORAGE_ACCESS_KEY_ID || !STORAGE_SECRET_ACCESS_KEY) throw new Error('Falta la configuración de almacenamiento S3.')
  return client ??= new S3Client({
    region: STORAGE_REGION, endpoint: STORAGE_ENDPOINT || undefined, forcePathStyle: !!STORAGE_ENDPOINT,
    credentials: { accessKeyId: STORAGE_ACCESS_KEY_ID, secretAccessKey: STORAGE_SECRET_ACCESS_KEY },
  })
}
export const mediaUrl = (key: string) => key.startsWith('seed/') ? '/uploads/' + key : '/api/media/' + key
export async function inspectImage(bytes: Buffer, declared: string) {
  if (!mimeTypes.includes(declared as MimeType) || !bytes.length) throw new HttpError(400, 'Selecciona una imagen JPG, PNG o WebP.')
  if (bytes.length > imageLimit) throw new HttpError(413, 'Cada imagen puede pesar hasta 2 MB.')
  try {
    const image = sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning' })
    const info = await image.metadata()
    if (!info.format || formats[info.format as keyof typeof formats] !== declared || !info.width || !info.height || (info.pages ?? 1) !== 1) {
      throw new Error('invalid image')
    }
    await image.resize({ width: 1, height: 1 }).toBuffer()
    return { mimeType: declared as MimeType, width: info.autoOrient.width, height: info.autoOrient.height, sizeBytes: bytes.length }
  } catch {
    throw new HttpError(400, 'La imagen está dañada, animada o excede las dimensiones permitidas.')
  }
}
export async function storeImage(bytes: Buffer, mimeType: MimeType) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
  const key = randomUUID() + '.' + extension
  if (bucket) await s3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: mimeType }))
  else {
    await mkdir(root, { recursive: true })
    await writeFile(join(root, key), bytes, { flag: 'wx' })
  }
  return key
}
export async function readImage(key: string) {
  storageKeySchema.parse(key)
  if (!bucket || key.startsWith('seed/')) return readFile(join(root, key))
  const data = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  if (!data.Body) throw new Error('Archivo no encontrado.')
  return Buffer.from(await data.Body.transformToByteArray())
}
export async function discardImage(key: string) {
  storageKeySchema.parse(key)
  if (key.startsWith('seed/')) return
  try {
    if (bucket) await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    else await rm(join(root, key), { force: true })
  } catch (error) {
    console.error('No se pudo limpiar el archivo', key, error)
  }
}
