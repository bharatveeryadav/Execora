> Backend Truth: Active runtime behavior is defined by apps/api/src/index.ts, apps/api/src/api/index.ts, and apps/api/src/ws/enhanced-handler.ts.\n> Canonical refs: docs/README.md, docs/features/README.md, docs/api/API.md, docs/AUTH.md.\n\n

# Product Images at Scale (100k+ Items)

This document describes how Execora handles real product images and manages large catalogs (100,000+ items) efficiently.

## Architecture Overview

| Component | Purpose |
|-----------|---------|
| **MinIO** | Object storage for product images. Keys: `products/{tenantId}/{productId}/{timestamp}.{ext}` |
| **Product.imageUrl** | Stores either: (a) MinIO object key, or (b) external URL (http/https) |
| **Presigned URLs** | 1-hour expiry; clients fetch images directly from MinIO, reducing API load |

## API Endpoints

### Upload Image
```
POST /api/v1/products/:id/image
Content-Type: multipart/form-data
Body: file (image: jpeg, png, webp; max 5 MB)
Response: { imageUrl: "products/tenant123/prod456/1710000000000.jpg" }
```

### Get Single Image URL
```
GET /api/v1/products/:id/image-url
Response: { url: "https://minio.../products/...?X-Amz-..." }
```
- If `imageUrl` is external (http/https), returns as-is
- Otherwise returns presigned URL (1h expiry)

### Batch Image URLs (for list views)
```
GET /api/v1/products/image-urls?ids=id1,id2,id3
Response: { "id1": "https://...", "id2": "https://..." }
```
- Up to 50 IDs per request
- Cache-Control: ~1 hour
- Use when rendering a page of products (e.g. 20–50 items)

### Delete Image
```
DELETE /api/v1/products/:id/image
Response: { deleted: true }
```

## Frontend Usage

### Product List (100k+ items)
1. **Pagination** — Fetch products in pages (e.g. 20–50 per page)
2. **Batch URLs** — After loading a page, call `GET /api/v1/products/image-urls?ids=...` with all product IDs on that page
3. **Lazy load** — Render images only when in viewport; use `loading="lazy"` or React `IntersectionObserver`
4. **Cache** — Store presigned URLs in memory/state for the session; they expire in ~1h

### Product Form (add/edit)
- Use `POST /api/v1/products/:id/image` for multipart upload
- Or pass external `imageUrl` when creating via draft/API if image is already hosted elsewhere

### Mobile
- Same batch endpoint; call when ItemsScreen loads a page
- Use `Image` with `source={{ uri: url }}`; React Native handles caching

## Scale Optimizations

| Concern | Approach |
|---------|----------|
| **100k products** | Paginate list; never load all at once |
| **Image delivery** | Presigned URLs → MinIO serves directly; API is not in the path |
| **List performance** | Batch `image-urls` for current page only |
| **Storage** | MinIO scales horizontally; consider CDN (CloudFront/Cloudflare) in front for high traffic |
| **Thumbnails** | Optional: generate 150×150 on upload (sharp/imagemagick) and store as `products/{tenant}/{id}/thumb_{ts}.jpg` |
| **Bulk import** | CSV/Excel import with image URLs; or async queue for uploads |

## Database

- `Product.imageUrl` — single primary image (object key or URL)
- `Product.imageUrls` — array for multiple images (future use)

No schema change needed; existing fields are used.

## Bulk CSV Import

```
POST /api/v1/products/import
Content-Type: multipart/form-data
Body: file (CSV)
Response: { imported: N, failed: M, errors: [{ row, message }] }
```

**CSV columns** (header row required): `name`, `price`, `stock`, `sku`, `barcode`, `category`, `unit`, `minStock` (or `min stock`). Name and price are required. Max 1000 rows per file.

## Optional Enhancements

1. **Thumbnail generation** — On upload, create 150×150 thumbnail; list views use thumbnail key
2. **CDN** — Put MinIO behind CloudFront/Cloudflare for global edge caching
3. **Pagination** — Add `?page=1&limit=50` to `GET /api/v1/products` if catalog grows large
4. **Bulk upload** — Queue-based import for CSV with image URLs or batch file uploads
