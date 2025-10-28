'use strict';

var chunk3NVJ6W27_cjs = require('./chunk-3NVJ6W27.cjs');
var chunk4BJGEGX5_cjs = require('./chunk-4BJGEGX5.cjs');
var chunkLEG4KNFP_cjs = require('./chunk-LEG4KNFP.cjs');
var chunk3SPQ3J4N_cjs = require('./chunk-3SPQ3J4N.cjs');
var chunkOQFE3DSZ_cjs = require('./chunk-OQFE3DSZ.cjs');
var chunkRCQ2HIQD_cjs = require('./chunk-RCQ2HIQD.cjs');
var hono = require('hono');
var cors = require('hono/cors');
var zod = require('zod');
var cookie = require('hono/cookie');
var html = require('hono/html');

// src/schemas/index.ts
var schemaDefinitions = [];
var apiContentCrudRoutes = new hono.Hono();
apiContentCrudRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const stmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const content = await stmt.bind(id).first();
    if (!content) {
      return c.json({ error: "Content not found" }, 404);
    }
    const transformedContent = {
      id: content.id,
      title: content.title,
      slug: content.slug,
      status: content.status,
      collectionId: content.collection_id,
      data: content.data ? JSON.parse(content.data) : {},
      created_at: content.created_at,
      updated_at: content.updated_at
    };
    return c.json({ data: transformedContent });
  } catch (error) {
    console.error("Error fetching content:", error);
    return c.json({
      error: "Failed to fetch content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
apiContentCrudRoutes.post("/", chunk4BJGEGX5_cjs.requireAuth(), async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get("user");
    const body = await c.req.json();
    const { collectionId, title, slug, status, data } = body;
    if (!collectionId) {
      return c.json({ error: "collectionId is required" }, 400);
    }
    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }
    let finalSlug = slug || title;
    finalSlug = finalSlug.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
    const duplicateCheck = db.prepare(
      "SELECT id FROM content WHERE collection_id = ? AND slug = ?"
    );
    const existing = await duplicateCheck.bind(collectionId, finalSlug).first();
    if (existing) {
      return c.json({ error: "A content item with this slug already exists in this collection" }, 409);
    }
    const contentId = crypto.randomUUID();
    const now = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO content (
        id, collection_id, slug, title, data, status,
        author_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertStmt.bind(
      contentId,
      collectionId,
      finalSlug,
      title,
      JSON.stringify(data || {}),
      status || "draft",
      user?.userId || "unknown",
      now,
      now
    ).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    await cache.invalidate(`content:list:${collectionId}:*`);
    await cache.invalidate("content-filtered:*");
    const getStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const createdContent = await getStmt.bind(contentId).first();
    return c.json({
      data: {
        id: createdContent.id,
        title: createdContent.title,
        slug: createdContent.slug,
        status: createdContent.status,
        collectionId: createdContent.collection_id,
        data: createdContent.data ? JSON.parse(createdContent.data) : {},
        created_at: createdContent.created_at,
        updated_at: createdContent.updated_at
      }
    }, 201);
  } catch (error) {
    console.error("Error creating content:", error);
    return c.json({
      error: "Failed to create content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
apiContentCrudRoutes.put("/:id", chunk4BJGEGX5_cjs.requireAuth(), async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const body = await c.req.json();
    const existingStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const existing = await existingStmt.bind(id).first();
    if (!existing) {
      return c.json({ error: "Content not found" }, 404);
    }
    const updates = [];
    const params = [];
    if (body.title !== void 0) {
      updates.push("title = ?");
      params.push(body.title);
    }
    if (body.slug !== void 0) {
      let finalSlug = body.slug.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
      updates.push("slug = ?");
      params.push(finalSlug);
    }
    if (body.status !== void 0) {
      updates.push("status = ?");
      params.push(body.status);
    }
    if (body.data !== void 0) {
      updates.push("data = ?");
      params.push(JSON.stringify(body.data));
    }
    const now = Date.now();
    updates.push("updated_at = ?");
    params.push(now);
    params.push(id);
    const updateStmt = db.prepare(`
      UPDATE content SET ${updates.join(", ")}
      WHERE id = ?
    `);
    await updateStmt.bind(...params).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    await cache.delete(cache.generateKey("content", id));
    await cache.invalidate(`content:list:${existing.collection_id}:*`);
    await cache.invalidate("content-filtered:*");
    const getStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const updatedContent = await getStmt.bind(id).first();
    return c.json({
      data: {
        id: updatedContent.id,
        title: updatedContent.title,
        slug: updatedContent.slug,
        status: updatedContent.status,
        collectionId: updatedContent.collection_id,
        data: updatedContent.data ? JSON.parse(updatedContent.data) : {},
        created_at: updatedContent.created_at,
        updated_at: updatedContent.updated_at
      }
    });
  } catch (error) {
    console.error("Error updating content:", error);
    return c.json({
      error: "Failed to update content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
apiContentCrudRoutes.delete("/:id", chunk4BJGEGX5_cjs.requireAuth(), async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const existingStmt = db.prepare("SELECT collection_id FROM content WHERE id = ?");
    const existing = await existingStmt.bind(id).first();
    if (!existing) {
      return c.json({ error: "Content not found" }, 404);
    }
    const deleteStmt = db.prepare("DELETE FROM content WHERE id = ?");
    await deleteStmt.bind(id).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    await cache.delete(cache.generateKey("content", id));
    await cache.invalidate(`content:list:${existing.collection_id}:*`);
    await cache.invalidate("content-filtered:*");
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    return c.json({
      error: "Failed to delete content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
var api_content_crud_default = apiContentCrudRoutes;

// src/routes/api.ts
var apiRoutes = new hono.Hono();
apiRoutes.use("*", async (c, next) => {
  const startTime = Date.now();
  c.set("startTime", startTime);
  await next();
  const totalTime = Date.now() - startTime;
  c.header("X-Response-Time", `${totalTime}ms`);
});
apiRoutes.use("*", async (c, next) => {
  const cacheEnabled = await chunk4BJGEGX5_cjs.isPluginActive(c.env.DB, "core-cache");
  c.set("cacheEnabled", cacheEnabled);
  await next();
});
apiRoutes.use("*", cors.cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));
function addTimingMeta(c, meta = {}, executionStartTime) {
  const totalTime = Date.now() - c.get("startTime");
  const executionTime = executionStartTime ? Date.now() - executionStartTime : void 0;
  return {
    ...meta,
    timing: {
      total: totalTime,
      execution: executionTime,
      unit: "ms"
    }
  };
}
apiRoutes.get("/", (c) => {
  return c.json({
    name: "SonicJS API",
    version: "2.0.0",
    description: "RESTful API for SonicJS headless CMS",
    endpoints: {
      health: "/api/health",
      collections: "/api/collections",
      content: "/api/content",
      contentById: "/api/content/:id",
      collectionContent: "/api/collections/:collection/content"
    },
    documentation: "/docs"
  });
});
apiRoutes.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    schemas: schemaDefinitions.map((s) => s.name)
  });
});
apiRoutes.get("/collections", async (c) => {
  const executionStart = Date.now();
  try {
    const db = c.env.DB;
    const cacheEnabled = c.get("cacheEnabled");
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    const cacheKey = cache.generateKey("collections", "all");
    if (cacheEnabled) {
      const cacheResult = await cache.getWithSource(cacheKey);
      if (cacheResult.hit && cacheResult.data) {
        c.header("X-Cache-Status", "HIT");
        c.header("X-Cache-Source", cacheResult.source);
        if (cacheResult.ttl) {
          c.header("X-Cache-TTL", Math.floor(cacheResult.ttl).toString());
        }
        const dataWithMeta = {
          ...cacheResult.data,
          meta: addTimingMeta(c, {
            ...cacheResult.data.meta,
            cache: {
              hit: true,
              source: cacheResult.source,
              ttl: cacheResult.ttl ? Math.floor(cacheResult.ttl) : void 0
            }
          }, executionStart)
        };
        return c.json(dataWithMeta);
      }
    }
    c.header("X-Cache-Status", "MISS");
    c.header("X-Cache-Source", "database");
    const stmt = db.prepare("SELECT * FROM collections WHERE is_active = 1");
    const { results } = await stmt.all();
    const transformedResults = results.map((row) => ({
      ...row,
      schema: row.schema ? JSON.parse(row.schema) : {},
      is_active: row.is_active
      // Keep as number (1 or 0)
    }));
    const responseData = {
      data: transformedResults,
      meta: addTimingMeta(c, {
        count: results.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        cache: {
          hit: false,
          source: "database"
        }
      }, executionStart)
    };
    if (cacheEnabled) {
      await cache.set(cacheKey, responseData);
    }
    return c.json(responseData);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return c.json({ error: "Failed to fetch collections" }, 500);
  }
});
apiRoutes.get("/content", async (c) => {
  const executionStart = Date.now();
  try {
    const db = c.env.DB;
    const queryParams = c.req.query();
    if (queryParams.collection) {
      const collectionName = queryParams.collection;
      const collectionStmt = db.prepare("SELECT id FROM collections WHERE name = ? AND is_active = 1");
      const collectionResult = await collectionStmt.bind(collectionName).first();
      if (collectionResult) {
        queryParams.collection_id = collectionResult.id;
        delete queryParams.collection;
      } else {
        return c.json({
          data: [],
          meta: addTimingMeta(c, {
            count: 0,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            message: `Collection '${collectionName}' not found`
          }, executionStart)
        });
      }
    }
    const filter = chunkOQFE3DSZ_cjs.QueryFilterBuilder.parseFromQuery(queryParams);
    if (!filter.limit) {
      filter.limit = 50;
    }
    filter.limit = Math.min(filter.limit, 1e3);
    const builder = new chunkOQFE3DSZ_cjs.QueryFilterBuilder();
    const queryResult = builder.build("content", filter);
    if (queryResult.errors.length > 0) {
      return c.json({
        error: "Invalid filter parameters",
        details: queryResult.errors
      }, 400);
    }
    const cacheEnabled = c.get("cacheEnabled");
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    const cacheKey = cache.generateKey("content-filtered", JSON.stringify({ filter, query: queryResult.sql }));
    if (cacheEnabled) {
      const cacheResult = await cache.getWithSource(cacheKey);
      if (cacheResult.hit && cacheResult.data) {
        c.header("X-Cache-Status", "HIT");
        c.header("X-Cache-Source", cacheResult.source);
        if (cacheResult.ttl) {
          c.header("X-Cache-TTL", Math.floor(cacheResult.ttl).toString());
        }
        const dataWithMeta = {
          ...cacheResult.data,
          meta: addTimingMeta(c, {
            ...cacheResult.data.meta,
            cache: {
              hit: true,
              source: cacheResult.source,
              ttl: cacheResult.ttl ? Math.floor(cacheResult.ttl) : void 0
            }
          }, executionStart)
        };
        return c.json(dataWithMeta);
      }
    }
    c.header("X-Cache-Status", "MISS");
    c.header("X-Cache-Source", "database");
    const stmt = db.prepare(queryResult.sql);
    const boundStmt = queryResult.params.length > 0 ? stmt.bind(...queryResult.params) : stmt;
    const { results } = await boundStmt.all();
    const transformedResults = results.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      collectionId: row.collection_id,
      data: row.data ? JSON.parse(row.data) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    const responseData = {
      data: transformedResults,
      meta: addTimingMeta(c, {
        count: results.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        filter,
        query: {
          sql: queryResult.sql,
          params: queryResult.params
        },
        cache: {
          hit: false,
          source: "database"
        }
      }, executionStart)
    };
    if (cacheEnabled) {
      await cache.set(cacheKey, responseData);
    }
    return c.json(responseData);
  } catch (error) {
    console.error("Error fetching content:", error);
    return c.json({
      error: "Failed to fetch content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
apiRoutes.get("/collections/:collection/content", async (c) => {
  const executionStart = Date.now();
  try {
    const collection = c.req.param("collection");
    const db = c.env.DB;
    const queryParams = c.req.query();
    const collectionStmt = db.prepare("SELECT * FROM collections WHERE name = ? AND is_active = 1");
    const collectionResult = await collectionStmt.bind(collection).first();
    if (!collectionResult) {
      return c.json({ error: "Collection not found" }, 404);
    }
    const filter = chunkOQFE3DSZ_cjs.QueryFilterBuilder.parseFromQuery(queryParams);
    if (!filter.where) {
      filter.where = { and: [] };
    }
    if (!filter.where.and) {
      filter.where.and = [];
    }
    filter.where.and.push({
      field: "collection_id",
      operator: "equals",
      value: collectionResult.id
    });
    if (!filter.limit) {
      filter.limit = 50;
    }
    filter.limit = Math.min(filter.limit, 1e3);
    const builder = new chunkOQFE3DSZ_cjs.QueryFilterBuilder();
    const queryResult = builder.build("content", filter);
    if (queryResult.errors.length > 0) {
      return c.json({
        error: "Invalid filter parameters",
        details: queryResult.errors
      }, 400);
    }
    const cacheEnabled = c.get("cacheEnabled");
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.api);
    const cacheKey = cache.generateKey("collection-content-filtered", `${collection}:${JSON.stringify({ filter, query: queryResult.sql })}`);
    if (cacheEnabled) {
      const cacheResult = await cache.getWithSource(cacheKey);
      if (cacheResult.hit && cacheResult.data) {
        c.header("X-Cache-Status", "HIT");
        c.header("X-Cache-Source", cacheResult.source);
        if (cacheResult.ttl) {
          c.header("X-Cache-TTL", Math.floor(cacheResult.ttl).toString());
        }
        const dataWithMeta = {
          ...cacheResult.data,
          meta: addTimingMeta(c, {
            ...cacheResult.data.meta,
            cache: {
              hit: true,
              source: cacheResult.source,
              ttl: cacheResult.ttl ? Math.floor(cacheResult.ttl) : void 0
            }
          }, executionStart)
        };
        return c.json(dataWithMeta);
      }
    }
    c.header("X-Cache-Status", "MISS");
    c.header("X-Cache-Source", "database");
    const stmt = db.prepare(queryResult.sql);
    const boundStmt = queryResult.params.length > 0 ? stmt.bind(...queryResult.params) : stmt;
    const { results } = await boundStmt.all();
    const transformedResults = results.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      collectionId: row.collection_id,
      data: row.data ? JSON.parse(row.data) : {},
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    const responseData = {
      data: transformedResults,
      meta: addTimingMeta(c, {
        collection: {
          ...collectionResult,
          schema: collectionResult.schema ? JSON.parse(collectionResult.schema) : {}
        },
        count: results.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        filter,
        query: {
          sql: queryResult.sql,
          params: queryResult.params
        },
        cache: {
          hit: false,
          source: "database"
        }
      }, executionStart)
    };
    if (cacheEnabled) {
      await cache.set(cacheKey, responseData);
    }
    return c.json(responseData);
  } catch (error) {
    console.error("Error fetching content:", error);
    return c.json({
      error: "Failed to fetch content",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
apiRoutes.route("/content", api_content_crud_default);
var api_default = apiRoutes;
function generateId() {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 21);
}
async function emitEvent(eventName, data) {
  console.log(`[Event] ${eventName}:`, data);
}
var fileValidationSchema = zod.z.object({
  name: zod.z.string().min(1).max(255),
  type: zod.z.string().refine(
    (type) => {
      const allowedTypes = [
        // Images
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        // Documents
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Videos
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
        // Audio
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/m4a"
      ];
      return allowedTypes.includes(type);
    },
    { message: "Unsupported file type" }
  ),
  size: zod.z.number().min(1).max(50 * 1024 * 1024)
  // 50MB max
});
var apiMediaRoutes = new hono.Hono();
apiMediaRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
apiMediaRoutes.post("/upload", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const fileData = formData.get("file");
    if (!fileData || typeof fileData === "string") {
      return c.json({ error: "No file provided" }, 400);
    }
    const file = fileData;
    const validation = fileValidationSchema.safeParse({
      name: file.name,
      type: file.type,
      size: file.size
    });
    if (!validation.success) {
      return c.json({
        error: "File validation failed",
        details: validation.error.issues
      }, 400);
    }
    const fileId = generateId();
    const fileExtension = file.name.split(".").pop() || "";
    const filename = `${fileId}.${fileExtension}`;
    const folder = formData.get("folder") || "uploads";
    const r2Key = `${folder}/${filename}`;
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${file.name}"`
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.userId,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    if (!uploadResult) {
      return c.json({ error: "Failed to upload file to storage" }, 500);
    }
    const bucketName = c.env.BUCKET_NAME || "sonicjs-media-dev";
    const publicUrl = `https://pub-${bucketName}.r2.dev/${r2Key}`;
    let width;
    let height;
    if (file.type.startsWith("image/") && !file.type.includes("svg")) {
      try {
        const dimensions = await getImageDimensions(arrayBuffer);
        width = dimensions.width;
        height = dimensions.height;
      } catch (error) {
        console.warn("Failed to extract image dimensions:", error);
      }
    }
    let thumbnailUrl;
    if (file.type.startsWith("image/") && c.env.IMAGES_ACCOUNT_ID) {
      thumbnailUrl = `https://imagedelivery.net/${c.env.IMAGES_ACCOUNT_ID}/${r2Key}/thumbnail`;
    }
    const mediaRecord = {
      id: fileId,
      filename,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
      width,
      height,
      folder,
      r2_key: r2Key,
      public_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      uploaded_by: user.userId,
      uploaded_at: Math.floor(Date.now() / 1e3),
      created_at: Math.floor(Date.now() / 1e3)
    };
    const stmt = c.env.DB.prepare(`
      INSERT INTO media (
        id, filename, original_name, mime_type, size, width, height, 
        folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt.bind(
      mediaRecord.id,
      mediaRecord.filename,
      mediaRecord.original_name,
      mediaRecord.mime_type,
      mediaRecord.size,
      mediaRecord.width ?? null,
      mediaRecord.height ?? null,
      mediaRecord.folder,
      mediaRecord.r2_key,
      mediaRecord.public_url,
      mediaRecord.thumbnail_url ?? null,
      mediaRecord.uploaded_by,
      mediaRecord.uploaded_at
    ).run();
    await emitEvent("media.upload", { id: mediaRecord.id, filename: mediaRecord.filename });
    return c.json({
      success: true,
      file: {
        id: mediaRecord.id,
        filename: mediaRecord.filename,
        originalName: mediaRecord.original_name,
        mimeType: mediaRecord.mime_type,
        size: mediaRecord.size,
        width: mediaRecord.width,
        height: mediaRecord.height,
        publicUrl: mediaRecord.public_url,
        thumbnailUrl: mediaRecord.thumbnail_url,
        uploadedAt: new Date(mediaRecord.uploaded_at * 1e3).toISOString()
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});
apiMediaRoutes.post("/upload-multiple", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const filesData = formData.getAll("files");
    const files = [];
    for (const f of filesData) {
      if (typeof f !== "string") {
        files.push(f);
      }
    }
    if (!files || files.length === 0) {
      return c.json({ error: "No files provided" }, 400);
    }
    const uploadResults = [];
    const errors = [];
    for (const file of files) {
      try {
        const validation = fileValidationSchema.safeParse({
          name: file.name,
          type: file.type,
          size: file.size
        });
        if (!validation.success) {
          errors.push({
            filename: file.name,
            error: "Validation failed",
            details: validation.error.issues
          });
          continue;
        }
        const fileId = generateId();
        const fileExtension = file.name.split(".").pop() || "";
        const filename = `${fileId}.${fileExtension}`;
        const folder = formData.get("folder") || "uploads";
        const r2Key = `${folder}/${filename}`;
        const arrayBuffer = await file.arrayBuffer();
        const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            contentDisposition: `inline; filename="${file.name}"`
          },
          customMetadata: {
            originalName: file.name,
            uploadedBy: user.userId,
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
        if (!uploadResult) {
          errors.push({
            filename: file.name,
            error: "Failed to upload to storage"
          });
          continue;
        }
        const bucketName = c.env.BUCKET_NAME || "sonicjs-media-dev";
        const publicUrl = `https://pub-${bucketName}.r2.dev/${r2Key}`;
        let width;
        let height;
        if (file.type.startsWith("image/") && !file.type.includes("svg")) {
          try {
            const dimensions = await getImageDimensions(arrayBuffer);
            width = dimensions.width;
            height = dimensions.height;
          } catch (error) {
            console.warn("Failed to extract image dimensions:", error);
          }
        }
        let thumbnailUrl;
        if (file.type.startsWith("image/") && c.env.IMAGES_ACCOUNT_ID) {
          thumbnailUrl = `https://imagedelivery.net/${c.env.IMAGES_ACCOUNT_ID}/${r2Key}/thumbnail`;
        }
        const mediaRecord = {
          id: fileId,
          filename,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          width,
          height,
          folder,
          r2_key: r2Key,
          public_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          uploaded_by: user.userId,
          uploaded_at: Math.floor(Date.now() / 1e3)
        };
        const stmt = c.env.DB.prepare(`
          INSERT INTO media (
            id, filename, original_name, mime_type, size, width, height, 
            folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        await stmt.bind(
          mediaRecord.id,
          mediaRecord.filename,
          mediaRecord.original_name,
          mediaRecord.mime_type,
          mediaRecord.size,
          mediaRecord.width ?? null,
          mediaRecord.height ?? null,
          mediaRecord.folder,
          mediaRecord.r2_key,
          mediaRecord.public_url,
          mediaRecord.thumbnail_url ?? null,
          mediaRecord.uploaded_by,
          mediaRecord.uploaded_at
        ).run();
        uploadResults.push({
          id: mediaRecord.id,
          filename: mediaRecord.filename,
          originalName: mediaRecord.original_name,
          mimeType: mediaRecord.mime_type,
          size: mediaRecord.size,
          width: mediaRecord.width,
          height: mediaRecord.height,
          publicUrl: mediaRecord.public_url,
          thumbnailUrl: mediaRecord.thumbnail_url,
          uploadedAt: new Date(mediaRecord.uploaded_at * 1e3).toISOString()
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: "Upload failed",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    if (uploadResults.length > 0) {
      await emitEvent("media.upload", { count: uploadResults.length });
    }
    return c.json({
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error("Multiple upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});
apiMediaRoutes.post("/bulk-delete", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const fileIds = body.fileIds;
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: "No file IDs provided" }, 400);
    }
    if (fileIds.length > 50) {
      return c.json({ error: "Too many files selected. Maximum 50 files per operation." }, 400);
    }
    const results = [];
    const errors = [];
    for (const fileId of fileIds) {
      try {
        const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ?");
        const fileRecord = await stmt.bind(fileId).first();
        if (!fileRecord) {
          errors.push({ fileId, error: "File not found" });
          continue;
        }
        if (fileRecord.deleted_at !== null) {
          console.log(`File ${fileId} already deleted, skipping`);
          results.push({
            fileId,
            filename: fileRecord.original_name,
            success: true,
            alreadyDeleted: true
          });
          continue;
        }
        if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
          errors.push({ fileId, error: "Permission denied" });
          continue;
        }
        try {
          await c.env.MEDIA_BUCKET.delete(fileRecord.r2_key);
        } catch (error) {
          console.warn(`Failed to delete from R2 for file ${fileId}:`, error);
        }
        const deleteStmt = c.env.DB.prepare("UPDATE media SET deleted_at = ? WHERE id = ?");
        await deleteStmt.bind(Math.floor(Date.now() / 1e3), fileId).run();
        results.push({
          fileId,
          filename: fileRecord.original_name,
          success: true
        });
      } catch (error) {
        errors.push({
          fileId,
          error: "Delete failed",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    if (results.length > 0) {
      await emitEvent("media.delete", { count: results.length, ids: fileIds });
    }
    return c.json({
      success: results.length > 0,
      deleted: results,
      errors,
      summary: {
        total: fileIds.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return c.json({ error: "Bulk delete failed" }, 500);
  }
});
apiMediaRoutes.post("/create-folder", async (c) => {
  try {
    const body = await c.req.json();
    const folderName = body.folderName;
    if (!folderName || typeof folderName !== "string") {
      return c.json({ success: false, error: "No folder name provided" }, 400);
    }
    const folderPattern = /^[a-z0-9-_]+$/;
    if (!folderPattern.test(folderName)) {
      return c.json({
        success: false,
        error: "Folder name can only contain lowercase letters, numbers, hyphens, and underscores"
      }, 400);
    }
    const checkStmt = c.env.DB.prepare("SELECT COUNT(*) as count FROM media WHERE folder = ? AND deleted_at IS NULL");
    const existingFolder = await checkStmt.bind(folderName).first();
    return c.json({
      success: true,
      message: `Folder "${folderName}" created successfully`,
      folder: folderName
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return c.json({ success: false, error: "Failed to create folder" }, 500);
  }
});
apiMediaRoutes.post("/bulk-move", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const fileIds = body.fileIds;
    const targetFolder = body.folder;
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return c.json({ error: "No file IDs provided" }, 400);
    }
    if (!targetFolder || typeof targetFolder !== "string") {
      return c.json({ error: "No target folder provided" }, 400);
    }
    if (fileIds.length > 50) {
      return c.json({ error: "Too many files selected. Maximum 50 files per operation." }, 400);
    }
    const results = [];
    const errors = [];
    for (const fileId of fileIds) {
      try {
        const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL");
        const fileRecord = await stmt.bind(fileId).first();
        if (!fileRecord) {
          errors.push({ fileId, error: "File not found" });
          continue;
        }
        if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
          errors.push({ fileId, error: "Permission denied" });
          continue;
        }
        if (fileRecord.folder === targetFolder) {
          results.push({
            fileId,
            filename: fileRecord.original_name,
            success: true,
            skipped: true
          });
          continue;
        }
        const oldR2Key = fileRecord.r2_key;
        const filename = oldR2Key.split("/").pop() || fileRecord.filename;
        const newR2Key = `${targetFolder}/${filename}`;
        try {
          const object = await c.env.MEDIA_BUCKET.get(oldR2Key);
          if (!object) {
            errors.push({ fileId, error: "File not found in storage" });
            continue;
          }
          await c.env.MEDIA_BUCKET.put(newR2Key, object.body, {
            httpMetadata: object.httpMetadata,
            customMetadata: {
              ...object.customMetadata,
              movedBy: user.userId,
              movedAt: (/* @__PURE__ */ new Date()).toISOString()
            }
          });
          await c.env.MEDIA_BUCKET.delete(oldR2Key);
        } catch (error) {
          console.warn(`Failed to move file in R2 for file ${fileId}:`, error);
          errors.push({ fileId, error: "Failed to move file in storage" });
          continue;
        }
        const bucketName = c.env.BUCKET_NAME || "sonicjs-media-dev";
        const newPublicUrl = `https://pub-${bucketName}.r2.dev/${newR2Key}`;
        const updateStmt = c.env.DB.prepare(`
          UPDATE media
          SET folder = ?, r2_key = ?, public_url = ?, updated_at = ?
          WHERE id = ?
        `);
        await updateStmt.bind(
          targetFolder,
          newR2Key,
          newPublicUrl,
          Math.floor(Date.now() / 1e3),
          fileId
        ).run();
        results.push({
          fileId,
          filename: fileRecord.original_name,
          success: true,
          skipped: false
        });
      } catch (error) {
        errors.push({
          fileId,
          error: "Move failed",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
    if (results.length > 0) {
      await emitEvent("media.move", { count: results.length, targetFolder, ids: fileIds });
    }
    return c.json({
      success: results.length > 0,
      moved: results,
      errors,
      summary: {
        total: fileIds.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error("Bulk move error:", error);
    return c.json({ error: "Bulk move failed" }, 500);
  }
});
apiMediaRoutes.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");
    const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL");
    const fileRecord = await stmt.bind(fileId).first();
    if (!fileRecord) {
      return c.json({ error: "File not found" }, 404);
    }
    if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
      return c.json({ error: "Permission denied" }, 403);
    }
    try {
      await c.env.MEDIA_BUCKET.delete(fileRecord.r2_key);
    } catch (error) {
      console.warn("Failed to delete from R2:", error);
    }
    const deleteStmt = c.env.DB.prepare("UPDATE media SET deleted_at = ? WHERE id = ?");
    await deleteStmt.bind(Math.floor(Date.now() / 1e3), fileId).run();
    await emitEvent("media.delete", { id: fileId });
    return c.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return c.json({ error: "Delete failed" }, 500);
  }
});
apiMediaRoutes.patch("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");
    const body = await c.req.json();
    const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL");
    const fileRecord = await stmt.bind(fileId).first();
    if (!fileRecord) {
      return c.json({ error: "File not found" }, 404);
    }
    if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
      return c.json({ error: "Permission denied" }, 403);
    }
    const allowedFields = ["alt", "caption", "tags", "folder"];
    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(key === "tags" ? JSON.stringify(value) : value);
      }
    }
    if (updates.length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }
    updates.push("updated_at = ?");
    values.push(Math.floor(Date.now() / 1e3));
    values.push(fileId);
    const updateStmt = c.env.DB.prepare(`
      UPDATE media SET ${updates.join(", ")} WHERE id = ?
    `);
    await updateStmt.bind(...values).run();
    await emitEvent("media.update", { id: fileId });
    return c.json({ success: true, message: "File updated successfully" });
  } catch (error) {
    console.error("Update error:", error);
    return c.json({ error: "Update failed" }, 500);
  }
});
async function getImageDimensions(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  if (uint8Array[0] === 255 && uint8Array[1] === 216) {
    return getJPEGDimensions(uint8Array);
  }
  if (uint8Array[0] === 137 && uint8Array[1] === 80 && uint8Array[2] === 78 && uint8Array[3] === 71) {
    return getPNGDimensions(uint8Array);
  }
  return { width: 0, height: 0 };
}
function getJPEGDimensions(uint8Array) {
  let i = 2;
  while (i < uint8Array.length) {
    if (i + 8 >= uint8Array.length) break;
    if (uint8Array[i] === 255 && uint8Array[i + 1] === 192) {
      if (i + 8 < uint8Array.length) {
        return {
          height: uint8Array[i + 5] << 8 | uint8Array[i + 6],
          width: uint8Array[i + 7] << 8 | uint8Array[i + 8]
        };
      }
    }
    if (i + 3 < uint8Array.length) {
      i += 2 + (uint8Array[i + 2] << 8 | uint8Array[i + 3]);
    } else {
      break;
    }
  }
  return { width: 0, height: 0 };
}
function getPNGDimensions(uint8Array) {
  if (uint8Array.length < 24) {
    return { width: 0, height: 0 };
  }
  return {
    width: uint8Array[16] << 24 | uint8Array[17] << 16 | uint8Array[18] << 8 | uint8Array[19],
    height: uint8Array[20] << 24 | uint8Array[21] << 16 | uint8Array[22] << 8 | uint8Array[23]
  };
}
var api_media_default = apiMediaRoutes;
var apiSystemRoutes = new hono.Hono();
apiSystemRoutes.get("/health", async (c) => {
  try {
    const startTime = Date.now();
    let dbStatus = "unknown";
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await c.env.DB.prepare("SELECT 1").first();
      dbLatency = Date.now() - dbStart;
      dbStatus = "healthy";
    } catch (error) {
      console.error("Database health check failed:", error);
      dbStatus = "unhealthy";
    }
    let kvStatus = "not_configured";
    let kvLatency = 0;
    if (c.env.CACHE_KV) {
      try {
        const kvStart = Date.now();
        await c.env.CACHE_KV.get("__health_check__");
        kvLatency = Date.now() - kvStart;
        kvStatus = "healthy";
      } catch (error) {
        console.error("KV health check failed:", error);
        kvStatus = "unhealthy";
      }
    }
    let r2Status = "not_configured";
    if (c.env.MEDIA_BUCKET) {
      try {
        await c.env.MEDIA_BUCKET.head("__health_check__");
        r2Status = "healthy";
      } catch (error) {
        r2Status = "healthy";
      }
    }
    const totalLatency = Date.now() - startTime;
    const overall = dbStatus === "healthy" ? "healthy" : "degraded";
    return c.json({
      status: overall,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: totalLatency,
      checks: {
        database: {
          status: dbStatus,
          latency: dbLatency
        },
        cache: {
          status: kvStatus,
          latency: kvLatency
        },
        storage: {
          status: r2Status
        }
      },
      environment: c.env.ENVIRONMENT || "production"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return c.json({
      status: "unhealthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      error: "Health check failed"
    }, 503);
  }
});
apiSystemRoutes.get("/info", (c) => {
  const appVersion = c.get("appVersion") || "1.0.0";
  return c.json({
    name: "SonicJS",
    version: appVersion,
    description: "Modern headless CMS built on Cloudflare Workers",
    endpoints: {
      api: "/api",
      auth: "/auth",
      health: "/api/system/health",
      docs: "/docs"
    },
    features: {
      content: true,
      media: true,
      auth: true,
      collections: true,
      caching: !!c.env.CACHE_KV,
      storage: !!c.env.MEDIA_BUCKET
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiSystemRoutes.get("/stats", async (c) => {
  try {
    const db = c.env.DB;
    const contentStats = await db.prepare(`
      SELECT COUNT(*) as total_content
      FROM content
      WHERE deleted_at IS NULL
    `).first();
    const mediaStats = await db.prepare(`
      SELECT
        COUNT(*) as total_files,
        SUM(size) as total_size
      FROM media
      WHERE deleted_at IS NULL
    `).first();
    const userStats = await db.prepare(`
      SELECT COUNT(*) as total_users
      FROM users
    `).first();
    return c.json({
      content: {
        total: contentStats?.total_content || 0
      },
      media: {
        total_files: mediaStats?.total_files || 0,
        total_size_bytes: mediaStats?.total_size || 0,
        total_size_mb: Math.round((mediaStats?.total_size || 0) / 1024 / 1024 * 100) / 100
      },
      users: {
        total: userStats?.total_users || 0
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Stats query failed:", error);
    return c.json({ error: "Failed to fetch system statistics" }, 500);
  }
});
apiSystemRoutes.get("/ping", async (c) => {
  try {
    const start = Date.now();
    await c.env.DB.prepare("SELECT 1").first();
    const latency = Date.now() - start;
    return c.json({
      pong: true,
      latency,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Ping failed:", error);
    return c.json({
      pong: false,
      error: "Database connection failed"
    }, 503);
  }
});
apiSystemRoutes.get("/env", (c) => {
  return c.json({
    environment: c.env.ENVIRONMENT || "production",
    features: {
      database: !!c.env.DB,
      cache: !!c.env.CACHE_KV,
      media_bucket: !!c.env.MEDIA_BUCKET,
      email_queue: !!c.env.EMAIL_QUEUE,
      sendgrid: !!c.env.SENDGRID_API_KEY,
      cloudflare_images: !!(c.env.IMAGES_ACCOUNT_ID && c.env.IMAGES_API_TOKEN)
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var api_system_default = apiSystemRoutes;
var adminApiRoutes = new hono.Hono();
adminApiRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
adminApiRoutes.use("*", chunk4BJGEGX5_cjs.requireRole(["admin", "editor"]));
adminApiRoutes.get("/stats", async (c) => {
  try {
    const db = c.env.DB;
    let collectionsCount = 0;
    try {
      const collectionsStmt = db.prepare("SELECT COUNT(*) as count FROM collections WHERE is_active = 1");
      const collectionsResult = await collectionsStmt.first();
      collectionsCount = collectionsResult?.count || 0;
    } catch (error) {
      console.error("Error fetching collections count:", error);
    }
    let contentCount = 0;
    try {
      const contentStmt = db.prepare("SELECT COUNT(*) as count FROM content WHERE deleted_at IS NULL");
      const contentResult = await contentStmt.first();
      contentCount = contentResult?.count || 0;
    } catch (error) {
      console.error("Error fetching content count:", error);
    }
    let mediaCount = 0;
    let mediaSize = 0;
    try {
      const mediaStmt = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL");
      const mediaResult = await mediaStmt.first();
      mediaCount = mediaResult?.count || 0;
      mediaSize = mediaResult?.total_size || 0;
    } catch (error) {
      console.error("Error fetching media count:", error);
    }
    let usersCount = 0;
    try {
      const usersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
      const usersResult = await usersStmt.first();
      usersCount = usersResult?.count || 0;
    } catch (error) {
      console.error("Error fetching users count:", error);
    }
    return c.json({
      collections: collectionsCount,
      contentItems: contentCount,
      mediaFiles: mediaCount,
      mediaSize,
      users: usersCount,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch statistics" }, 500);
  }
});
adminApiRoutes.get("/storage", async (c) => {
  try {
    const db = c.env.DB;
    let databaseSize = 0;
    try {
      const result = await db.prepare("SELECT 1").run();
      databaseSize = result?.meta?.size_after || 0;
    } catch (error) {
      console.error("Error fetching database size:", error);
    }
    let mediaSize = 0;
    try {
      const mediaStmt = db.prepare("SELECT COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL");
      const mediaResult = await mediaStmt.first();
      mediaSize = mediaResult?.total_size || 0;
    } catch (error) {
      console.error("Error fetching media size:", error);
    }
    return c.json({
      databaseSize,
      mediaSize,
      totalSize: databaseSize + mediaSize,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return c.json({ error: "Failed to fetch storage usage" }, 500);
  }
});
adminApiRoutes.get("/activity", async (c) => {
  try {
    const db = c.env.DB;
    const limit = parseInt(c.req.query("limit") || "10");
    const activityStmt = db.prepare(`
      SELECT
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.details,
        a.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_type IN ('content', 'collections', 'users', 'media')
      ORDER BY a.created_at DESC
      LIMIT ?
    `);
    const { results } = await activityStmt.bind(limit).all();
    const recentActivity = (results || []).map((row) => {
      const userName = row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.email || "System";
      let details = {};
      try {
        details = row.details ? JSON.parse(row.details) : {};
      } catch (e) {
        console.error("Error parsing activity details:", e);
      }
      return {
        id: row.id,
        type: row.resource_type,
        action: row.action,
        resource_id: row.resource_id,
        details,
        timestamp: new Date(Number(row.created_at)).toISOString(),
        user: userName
      };
    });
    return c.json({
      data: recentActivity,
      count: recentActivity.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return c.json({ error: "Failed to fetch recent activity" }, 500);
  }
});
var createCollectionSchema = zod.z.object({
  name: zod.z.string().min(1).max(255).regex(/^[a-z0-9_]+$/, "Must contain only lowercase letters, numbers, and underscores"),
  display_name: zod.z.string().min(1).max(255),
  description: zod.z.string().optional()
});
var updateCollectionSchema = zod.z.object({
  display_name: zod.z.string().min(1).max(255).optional(),
  description: zod.z.string().optional(),
  is_active: zod.z.boolean().optional()
});
adminApiRoutes.get("/collections", async (c) => {
  try {
    const db = c.env.DB;
    const search = c.req.query("search") || "";
    const includeInactive = c.req.query("includeInactive") === "true";
    let stmt;
    let results;
    if (search) {
      stmt = db.prepare(`
        SELECT id, name, display_name, description, created_at, updated_at, is_active, managed
        FROM collections
        WHERE ${includeInactive ? "1=1" : "is_active = 1"}
        AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)
        ORDER BY created_at DESC
      `);
      const searchParam = `%${search}%`;
      const queryResults = await stmt.bind(searchParam, searchParam, searchParam).all();
      results = queryResults.results;
    } else {
      stmt = db.prepare(`
        SELECT id, name, display_name, description, created_at, updated_at, is_active, managed
        FROM collections
        ${includeInactive ? "" : "WHERE is_active = 1"}
        ORDER BY created_at DESC
      `);
      const queryResults = await stmt.all();
      results = queryResults.results;
    }
    const fieldCountStmt = db.prepare("SELECT collection_id, COUNT(*) as count FROM content_fields GROUP BY collection_id");
    const { results: fieldCountResults } = await fieldCountStmt.all();
    const fieldCounts = new Map((fieldCountResults || []).map((row) => [String(row.collection_id), Number(row.count)]));
    const collections = (results || []).map((row) => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      is_active: row.is_active === 1,
      managed: row.managed === 1,
      field_count: fieldCounts.get(String(row.id)) || 0
    }));
    return c.json({
      data: collections,
      count: collections.length,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return c.json({ error: "Failed to fetch collections" }, 500);
  }
});
adminApiRoutes.get("/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const stmt = db.prepare("SELECT * FROM collections WHERE id = ?");
    const collection = await stmt.bind(id).first();
    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }
    const fieldsStmt = db.prepare(`
      SELECT * FROM content_fields
      WHERE collection_id = ?
      ORDER BY field_order ASC
    `);
    const { results: fieldsResults } = await fieldsStmt.bind(id).all();
    const fields = (fieldsResults || []).map((row) => ({
      id: row.id,
      field_name: row.field_name,
      field_type: row.field_type,
      field_label: row.field_label,
      field_options: row.field_options ? JSON.parse(row.field_options) : {},
      field_order: row.field_order,
      is_required: row.is_required === 1,
      is_searchable: row.is_searchable === 1,
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at)
    }));
    return c.json({
      data: {
        ...collection,
        is_active: collection.is_active === 1,
        managed: collection.managed === 1,
        schema: collection.schema ? JSON.parse(collection.schema) : null,
        created_at: Number(collection.created_at),
        updated_at: Number(collection.updated_at),
        fields
      }
    });
  } catch (error) {
    console.error("Error fetching collection:", error);
    return c.json({ error: "Failed to fetch collection" }, 500);
  }
});
adminApiRoutes.post("/collections", async (c) => {
  try {
    const body = await c.req.json();
    const validation = createCollectionSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Validation failed", details: validation.error.errors }, 400);
    }
    const validatedData = validation.data;
    const db = c.env.DB;
    const user = c.get("user");
    const existingStmt = db.prepare("SELECT id FROM collections WHERE name = ?");
    const existing = await existingStmt.bind(validatedData.name).first();
    if (existing) {
      return c.json({ error: "A collection with this name already exists" }, 400);
    }
    const basicSchema = {
      type: "object",
      properties: {
        title: {
          type: "string",
          title: "Title",
          required: true
        },
        content: {
          type: "string",
          title: "Content",
          format: "richtext"
        },
        status: {
          type: "string",
          title: "Status",
          enum: ["draft", "published", "archived"],
          default: "draft"
        }
      },
      required: ["title"]
    };
    const collectionId = crypto.randomUUID();
    const now = Date.now();
    const insertStmt = db.prepare(`
        INSERT INTO collections (id, name, display_name, description, schema, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
    await insertStmt.bind(
      collectionId,
      validatedData.name,
      validatedData.display_name,
      validatedData.description || null,
      JSON.stringify(basicSchema),
      1,
      // is_active
      now,
      now
    ).run();
    try {
      await c.env.CACHE_KV.delete("cache:collections:all");
      await c.env.CACHE_KV.delete(`cache:collection:${validatedData.name}`);
    } catch (e) {
      console.error("Error clearing cache:", e);
    }
    return c.json({
      data: {
        id: collectionId,
        name: validatedData.name,
        display_name: validatedData.display_name,
        description: validatedData.description,
        created_at: now
      }
    }, 201);
  } catch (error) {
    console.error("Error creating collection:", error);
    return c.json({ error: "Failed to create collection" }, 500);
  }
});
adminApiRoutes.patch("/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const validation = updateCollectionSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Validation failed", details: validation.error.errors }, 400);
    }
    const validatedData = validation.data;
    const db = c.env.DB;
    const checkStmt = db.prepare("SELECT * FROM collections WHERE id = ?");
    const existing = await checkStmt.bind(id).first();
    if (!existing) {
      return c.json({ error: "Collection not found" }, 404);
    }
    const updateFields = [];
    const updateParams = [];
    if (validatedData.display_name !== void 0) {
      updateFields.push("display_name = ?");
      updateParams.push(validatedData.display_name);
    }
    if (validatedData.description !== void 0) {
      updateFields.push("description = ?");
      updateParams.push(validatedData.description);
    }
    if (validatedData.is_active !== void 0) {
      updateFields.push("is_active = ?");
      updateParams.push(validatedData.is_active ? 1 : 0);
    }
    if (updateFields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }
    updateFields.push("updated_at = ?");
    updateParams.push(Date.now());
    updateParams.push(id);
    const updateStmt = db.prepare(`
        UPDATE collections
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `);
    await updateStmt.bind(...updateParams).run();
    try {
      await c.env.CACHE_KV.delete("cache:collections:all");
      await c.env.CACHE_KV.delete(`cache:collection:${existing.name}`);
    } catch (e) {
      console.error("Error clearing cache:", e);
    }
    return c.json({ message: "Collection updated successfully" });
  } catch (error) {
    console.error("Error updating collection:", error);
    return c.json({ error: "Failed to update collection" }, 500);
  }
});
adminApiRoutes.delete("/collections/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const contentStmt = db.prepare("SELECT COUNT(*) as count FROM content WHERE collection_id = ?");
    const contentResult = await contentStmt.bind(id).first();
    if (contentResult && contentResult.count > 0) {
      return c.json({
        error: `Cannot delete collection: it contains ${contentResult.count} content item(s). Delete all content first.`
      }, 400);
    }
    const collectionStmt = db.prepare("SELECT name FROM collections WHERE id = ?");
    const collection = await collectionStmt.bind(id).first();
    const deleteFieldsStmt = db.prepare("DELETE FROM content_fields WHERE collection_id = ?");
    await deleteFieldsStmt.bind(id).run();
    const deleteStmt = db.prepare("DELETE FROM collections WHERE id = ?");
    await deleteStmt.bind(id).run();
    try {
      await c.env.CACHE_KV.delete("cache:collections:all");
      if (collection) {
        await c.env.CACHE_KV.delete(`cache:collection:${collection.name}`);
      }
    } catch (e) {
      console.error("Error clearing cache:", e);
    }
    return c.json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return c.json({ error: "Failed to delete collection" }, 500);
  }
});
var admin_api_default = adminApiRoutes;

// src/templates/pages/auth-login.template.ts
function renderLoginPage(data, demoLoginActive = false) {
  return `
    <!DOCTYPE html>
    <html lang="en" class="h-full dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Login - SonicJS AI</title>
      <link rel="icon" type="image/x-icon" href="https://demo.sonicjs.com/images/favicon.ico">
      <script src="https://unpkg.com/htmx.org@2.0.3"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {
              colors: {
                error: '#ef4444'
              }
            }
          }
        }
      </script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
      </style>
    </head>
    <body class="h-full bg-zinc-950">
      <div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <!-- Logo Section -->
        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div class="mx-auto w-64 mb-8">
            <svg class="w-full h-auto" viewBox="380 1300 2250 400" aria-hidden="true">
              <path fill="#F1F2F2" d="M476.851,1404.673h168.536c4.714,0,8.695-1.618,11.944-4.866c3.241-3.241,4.866-7.222,4.866-11.943    c0-2.357-0.443-4.569-1.327-6.636c-0.885-2.06-2.067-3.829-3.539-5.308c-1.479-1.472-3.249-2.654-5.308-3.538    c-2.067-0.885-4.279-1.327-6.635-1.327H476.851c-20.057,0-37.158,7.154-51.313,21.454c-14.155,14.308-21.233,31.483-21.233,51.534    c0,20.058,7.078,37.234,21.233,51.534c14.155,14.308,31.255,21.454,51.313,21.454h112.357c10.907,0,20.196,3.837,27.868,11.502    c7.666,7.672,11.502,16.885,11.502,27.646c0,10.769-3.836,19.982-11.502,27.647c-7.672,7.673-16.961,11.502-27.868,11.502H421.115    c-4.721,0-8.702,1.624-11.944,4.865c-3.248,3.249-4.866,7.23-4.866,11.944c0,3.248,0.733,6.123,2.212,8.626    c1.472,2.509,3.462,4.499,5.971,5.972c2.502,1.472,5.378,2.212,8.626,2.212h168.094c20.052,0,37.227-7.078,51.534-21.234    c14.3-14.155,21.454-31.331,21.454-51.534c0-20.196-7.154-37.379-21.454-51.534c-14.308-14.156-31.483-21.234-51.534-21.234    H476.851c-10.616,0-19.76-3.905-27.426-11.721c-7.672-7.811-11.501-17.101-11.501-27.87c0-10.761,3.829-19.975,11.501-27.647    C457.091,1408.508,466.235,1404.673,476.851,1404.673z"></path>
              <path fill="#F1F2F2" d="M974.78,1398.211c-5.016,6.574-10.034,13.146-15.048,19.721c-1.828,2.398-3.657,4.796-5.487,7.194    c1.994,1.719,3.958,3.51,5.873,5.424c18.724,18.731,28.089,41.216,28.089,67.459c0,26.251-9.366,48.658-28.089,67.237    c-18.731,18.579-41.215,27.868-67.459,27.868c-9.848,0-19.156-1.308-27.923-3.923l-4.185,3.354    c-8.587,6.885-17.154,13.796-25.725,20.702c17.52,8.967,36.86,13.487,58.054,13.487c35.533,0,65.91-12.608,91.124-37.821    c25.214-25.215,37.821-55.584,37.821-91.125c0-35.534-12.607-65.911-37.821-91.126    C981.004,1403.663,977.926,1400.854,974.78,1398.211z"></path>
              <path fill="#F1F2F2" d="M1364.644,1439.619c-4.72,0-8.702,1.624-11.943,4.865c-3.249,3.249-4.866,7.23-4.866,11.944v138.014    l-167.651-211.003c-0.297-0.586-0.74-1.03-1.327-1.326c-4.721-4.714-10.249-7.742-16.588-9.069    c-6.346-1.326-12.608-0.732-18.801,1.77c-6.192,2.509-11.059,6.49-14.598,11.944c-3.539,5.46-5.308,11.577-5.308,18.357v208.348    c0,4.721,1.618,8.703,4.866,11.944c3.241,3.241,7.222,4.865,11.943,4.865c2.945,0,5.751-0.738,8.405-2.211    c2.654-1.472,4.713-3.463,6.193-5.971c1.473-2.503,2.212-5.378,2.212-8.627v-205.251l166.325,209.675    c2.06,2.654,4.423,4.865,7.078,6.635c5.308,3.829,11.349,5.75,18.137,5.75c5.308,0,10.464-1.182,15.482-3.538    c3.539-1.769,6.56-4.127,9.069-7.078c2.502-2.945,4.491-6.338,5.971-10.175c1.473-3.829,2.212-7.664,2.212-11.501v-141.552    c0-4.714-1.624-8.695-4.865-11.944C1373.339,1441.243,1369.359,1439.619,1364.644,1439.619z"></path>
              <path fill="#F1F2F2" d="M1508.406,1432.983c-2.654-1.472-5.46-2.212-8.404-2.212c-4.721,0-8.703,1.7-11.944,5.087    c-3.249,3.395-4.865,7.3-4.865,11.723v163.228c0,4.721,1.616,8.702,4.865,11.943c3.241,3.249,7.223,4.866,11.944,4.866    c2.944,0,5.751-0.732,8.404-2.212c2.655-1.472,4.714-3.539,6.193-6.194c1.473-2.654,2.213-5.453,2.213-8.404V1447.58    c0-2.945-0.74-5.75-2.213-8.405C1513.12,1436.522,1511.06,1434.462,1508.406,1432.983z"></path>
              <path fill="#F1F2F2" d="M1499.78,1367.957c-4.575,0-8.481,1.625-11.722,4.866c-3.249,3.249-4.865,7.23-4.865,11.943    c0,2.951,0.732,5.75,2.212,8.405c1.472,2.654,3.463,4.721,5.971,6.193c2.503,1.479,5.378,2.212,8.627,2.212    c4.423,0,8.328-1.618,11.721-4.865c3.387-3.243,5.088-7.224,5.088-11.944c0-4.713-1.701-8.694-5.088-11.943    C1508.33,1369.582,1504.349,1367.957,1499.78,1367.957z"></path>
              <path fill="#F1F2F2" d="M1859.627,1369.727H1747.27c-35.388,0-65.69,12.607-90.904,37.821    c-25.213,25.215-37.82,55.591-37.82,91.125c0,35.54,12.607,65.911,37.82,91.125c25.215,25.215,55.516,37.821,90.904,37.821h56.178    c4.714,0,8.695-1.618,11.944-4.866c3.241-3.241,4.865-7.222,4.865-11.943c0-4.714-1.624-8.695-4.865-11.943    c-3.249-3.243-7.23-4.866-11.944-4.866h-56.178c-26.251,0-48.659-9.359-67.237-28.09c-18.579-18.723-27.868-41.207-27.868-67.459    c0-26.243,9.29-48.659,27.868-67.237c18.579-18.579,40.987-27.868,67.237-27.868h112.357c4.714,0,8.696-1.693,11.944-5.087    c3.241-3.387,4.865-7.368,4.865-11.943c0-4.569-1.624-8.475-4.865-11.723C1868.322,1371.351,1864.341,1369.727,1859.627,1369.727z    "></path>
              <path fill="#06b6d4" d="M2219.256,1371.054h-112.357c-4.423,0-8.336,1.624-11.723,4.865c-3.393,3.249-5.087,7.23-5.087,11.944    c0,4.721,1.694,8.702,5.087,11.943c3.387,3.249,7.3,4.866,11.723,4.866h95.547v95.105c0,26.251-9.365,48.659-28.088,67.237    c-18.731,18.579-41.215,27.868-67.459,27.868c-26.251,0-48.659-9.289-67.237-27.868c-18.579-18.579-27.868-40.987-27.868-67.237    c0-4.713-1.701-8.771-5.088-12.165c-3.393-3.387-7.374-5.087-11.943-5.087c-4.575,0-8.481,1.7-11.722,5.087    c-3.249,3.393-4.865,7.451-4.865,12.165c0,35.388,12.607,65.69,37.82,90.904c25.215,25.213,55.584,37.82,91.126,37.82    c35.532,0,65.91-12.607,91.125-37.82c25.214-25.215,37.82-55.516,37.82-90.904v-111.915c0-4.714-1.624-8.695-4.865-11.944    C2227.951,1372.678,2223.971,1371.054,2219.256,1371.054z"></path>
              <path fill="#06b6d4" d="M2574.24,1502.875c-14.306-14.156-31.483-21.234-51.533-21.234H2410.35    c-10.617,0-19.762-3.829-27.426-11.501c-7.672-7.664-11.501-16.954-11.501-27.868c0-10.907,3.829-20.196,11.501-27.868    c7.664-7.664,16.809-11.501,27.426-11.501h112.357c4.714,0,8.695-1.617,11.944-4.866c3.241-3.241,4.865-7.222,4.865-11.943    c0-4.714-1.624-8.695-4.865-11.944c-3.249-3.241-7.23-4.865-11.944-4.865H2410.35c-20.058,0-37.158,7.154-51.313,21.454    c-14.156,14.308-21.232,31.483-21.232,51.534c0,20.058,7.077,37.234,21.232,51.534c14.156,14.308,31.255,21.454,51.313,21.454    h112.357c7.078,0,13.637,1.77,19.684,5.308c6.042,3.539,10.838,8.336,14.377,14.377c3.538,6.047,5.307,12.607,5.307,19.685    c0,10.616-3.835,19.76-11.501,27.425c-7.672,7.673-16.961,11.502-27.868,11.502h-168.094c-4.721,0-8.703,1.7-11.944,5.087    c-3.249,3.393-4.865,7.374-4.865,11.943c0,4.576,1.616,8.481,4.865,11.723c3.241,3.249,7.223,4.866,11.944,4.866h168.094    c20.051,0,37.227-7.078,51.533-21.234c14.302-14.155,21.454-31.331,21.454-51.534    C2595.695,1534.213,2588.542,1517.03,2574.24,1502.875z"></path>
              <path fill="#06b6d4" d="M854.024,1585.195l20.001-16.028c16.616-13.507,33.04-27.265,50.086-40.251    c1.13-0.861,2.9-1.686,2.003-3.516c-0.843-1.716-2.481-2.302-4.484-2.123c-8.514,0.765-17.016-0.538-25.537-0.353    c-1.124,0.024-2.768,0.221-3.163-1.25c-0.371-1.369,1.088-2.063,1.919-2.894c6.26-6.242,12.574-12.43,18.816-18.691    c9.303-9.327,18.565-18.714,27.851-28.066c1.848-1.859,3.701-3.713,5.549-5.572c2.655-2.661,5.309-5.315,7.958-7.982    c0.574-0.579,1.259-1.141,1.246-1.94c-0.004-0.257-0.078-0.538-0.254-0.853c-0.556-0.981-1.441-1.1-2.469-0.957    c-0.658,0.096-1.315,0.185-1.973,0.275c-3.844,0.538-7.689,1.076-11.533,1.608c-3.641,0.505-7.281,1.02-10.922,1.529    c-4.162,0.582-8.324,1.158-12.486,1.748c-1.142,0.161-2.409,1.662-3.354,0.508c-0.419-0.508-0.431-1.028-0.251-1.531    c0.269-0.741,0.957-1.441,1.387-2.021c3.414-4.58,6.882-9.124,10.356-13.662c1.74-2.272,3.48-4.544,5.214-6.822    c4.682-6.141,9.369-12.281,14.051-18.422c0.09-0.119,0.181-0.237,0.271-0.355c6.848-8.98,13.7-17.958,20.553-26.936    c0.488-0.64,0.977-1.28,1.465-1.92c2.159-2.828,4.315-5.658,6.476-8.486c4.197-5.501,8.454-10.954,12.67-16.442    c0.263-0.347,0.538-0.718,0.717-1.106c0.269-0.586,0.299-1.196-0.335-1.776c-0.825-0.753-1.8-0.15-2.595,0.419    c-0.67,0.472-1.333,0.957-1.955,1.489c-2.206,1.889-4.401,3.797-6.595,5.698c-3.958,3.438-7.922,6.876-11.976,10.194    c-2.443,2.003-4.865,4.028-7.301,6.038c-18.689-10.581-39.53-15.906-62.549-15.906c-35.54,0-65.911,12.607-91.125,37.82    c-25.214,25.215-37.821,55.592-37.821,91.126c0,35.54,12.607,65.91,37.821,91.125c4.146,4.146,8.445,7.916,12.87,11.381    c-9.015,11.14-18.036,22.277-27.034,33.429c-1.208,1.489-3.755,3.151-2.745,4.891c0.078,0.144,0.173,0.281,0.305,0.425    c1.321,1.429,3.492-1.303,4.933-2.457c6.673-5.333,13.333-10.685,19.982-16.042c3.707-2.984,7.417-5.965,11.124-8.952    c1.474-1.188,2.951-2.373,4.425-3.561c6.41-5.164,12.816-10.333,19.238-15.481L854.024,1585.195z M797.552,1498.009    c0-26.243,9.29-48.728,27.868-67.459c18.579-18.723,40.987-28.089,67.238-28.089c12.273,0,23.712,2.075,34.34,6.171    c-3.37,2.905-6.734,5.816-10.069,8.762c-6.075,5.351-12.365,10.469-18.667,15.564c-4.179,3.378-8.371,6.744-12.514,10.164    c-7.54,6.23-15.037,12.52-22.529,18.804c-7.091,5.955-14.182,11.904-21.19,17.949c-1.136,0.974-3.055,1.907-2.135,3.94    c0.831,1.836,2.774,1.417,4.341,1.578l12.145-0.599l14.151-0.698c1.031-0.102,2.192-0.257,2.89,0.632    c0.034,0.044,0.073,0.078,0.106,0.127c1.017,1.561-0.67,2.105-1.387,2.942c-6.308,7.318-12.616,14.637-18.978,21.907    c-8.161,9.339-16.353,18.649-24.544,27.958c-2.146,2.433-4.275,4.879-6.422,7.312c-1.034,1.172-2.129,2.272-1.238,3.922    c0.933,1.728,2.685,1.752,4.323,1.602c4.134-0.367,8.263-0.489,12.396-0.492c0.242,0,0.485-0.005,0.728-0.004    c2.711,0.009,5.422,0.068,8.134,0.145c2.582,0.074,5.166,0.165,7.752,0.249c0.275,1.62-0.879,2.356-1.62,3.259    c-1.333,1.626-2.667,3.247-4,4.867c-4.315,5.252-8.62,10.514-12.928,15.772c-3.562-2.725-7.007-5.733-10.324-9.051    C806.842,1546.667,797.552,1524.26,797.552,1498.009z"></path>
            </svg>
          </div>
          <h2 class="mt-6 text-xl font-medium text-white">Welcome Back</h2>
          <p class="mt-2 text-sm text-zinc-400">Sign in to your account to continue</p>
        </div>

        <!-- Form Container -->
        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div class="bg-zinc-900 shadow-sm ring-1 ring-white/10 rounded-xl px-6 py-8 sm:px-10">
            <!-- Alerts -->
            ${data.error ? `<div class="mb-6">${chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error })}</div>` : ""}
            ${data.message ? `<div class="mb-6">${chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.message })}</div>` : ""}

            <!-- Form Response (HTMX target) -->
            <div id="form-response" class="mb-6"></div>

            <!-- Form -->
            <form
              id="login-form"
              hx-post="/auth/login/form"
              hx-target="#form-response"
              hx-swap="innerHTML"
              class="space-y-6"
            >
              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                  placeholder="Enter your email"
                >
              </div>

              <!-- Password -->
              <div>
                <label for="password" class="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                  class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                  placeholder="Enter your password"
                >
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
              >
                Sign In
              </button>
            </form>

            <!-- Links -->
            <div class="mt-6 text-center">
              <p class="text-sm text-zinc-400">
                Don't have an account?
                <a href="/auth/register" class="font-semibold text-white hover:text-zinc-300 transition-colors">Create one here</a>
              </p>
            </div>
          </div>

          <!-- Version -->
          <div class="mt-6 text-center">
            <span class="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-400 ring-1 ring-inset ring-cyan-500/20">
              v${data.version || "0.1.0"}
            </span>
          </div>
        </div>
      </div>

      ${demoLoginActive ? `
      <script>
        // Demo Login Prefill Script
        (function() {
          'use strict';

          function prefillLoginForm() {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (emailInput && passwordInput) {
              emailInput.value = 'admin@sonicjs.com';
              passwordInput.value = 'admin123';

              // Add visual indication that form is prefilled (only if not already present)
              const form = emailInput.closest('form');
              if (form && !form.querySelector('.demo-mode-notice')) {
                const notice = document.createElement('div');
                notice.className = 'demo-mode-notice mb-6 rounded-lg bg-blue-500/10 p-4 ring-1 ring-blue-500/20';
                notice.innerHTML = '<div class="flex items-start gap-x-3"><svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><div><h3 class="text-sm font-semibold text-blue-300">Demo Mode</h3><p class="mt-1 text-sm text-blue-400">Login form prefilled with demo credentials</p></div></div>';
                form.insertBefore(notice, form.firstChild);
              }
            }
          }

          // Prefill on page load
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', prefillLoginForm);
          } else {
            prefillLoginForm();
          }

          // Also handle HTMX page changes (for SPA-like navigation)
          document.addEventListener('htmx:afterSwap', function(event) {
            if (event.detail.target.id === 'main-content' ||
                document.getElementById('email')) {
              setTimeout(prefillLoginForm, 100);
            }
          });
        })();
      </script>
      ` : ""}
    </body>
    </html>
  `;
}

// src/templates/pages/auth-register.template.ts
function renderRegisterPage(data) {
  return `
    <!DOCTYPE html>
    <html lang="en" class="h-full dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Register - SonicJS AI</title>
      <link rel="icon" type="image/x-icon" href="https://demo.sonicjs.com/images/favicon.ico">
      <script src="https://unpkg.com/htmx.org@2.0.3"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = {
          darkMode: 'class',
          theme: {
            extend: {}
          }
        }
      </script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
      </style>
    </head>
    <body class="h-full bg-zinc-950">
      <div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <!-- Logo Section -->
        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-white">
            <svg class="h-7 w-7 text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 class="mt-6 text-3xl font-semibold tracking-tight text-white">SonicJS AI</h1>
          <p class="mt-2 text-sm text-zinc-400">Create your account and get started</p>
        </div>

        <!-- Form Container -->
        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div class="bg-zinc-900 shadow-sm ring-1 ring-white/10 rounded-xl px-6 py-8 sm:px-10">
            <!-- Alerts -->
            ${data.error ? `<div class="mb-6">${chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error })}</div>` : ""}

            <!-- Form -->
            <form
              id="register-form"
              hx-post="/auth/register/form"
              hx-target="#form-response"
              hx-swap="innerHTML"
              class="space-y-6"
            >
              <!-- First and Last Name -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="firstName" class="block text-sm font-medium text-white mb-2">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                    placeholder="First name"
                  >
                </div>
                <div>
                  <label for="lastName" class="block text-sm font-medium text-white mb-2">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                    placeholder="Last name"
                  >
                </div>
              </div>

              <!-- Username -->
              <div>
                <label for="username" class="block text-sm font-medium text-white mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                  placeholder="Choose a username"
                >
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                  placeholder="Enter your email"
                >
              </div>

              <!-- Password -->
              <div>
                <label for="password" class="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white shadow-sm ring-1 ring-inset ring-white/10 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white transition-shadow"
                  placeholder="Create a password (min. 8 characters)"
                >
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                class="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-900 transition-colors"
              >
                Create Account
              </button>
            </form>

            <!-- Links -->
            <div class="mt-6 text-center">
              <p class="text-sm text-zinc-400">
                Already have an account?
                <a href="/auth/login" class="font-semibold text-white hover:text-zinc-300 transition-colors">Sign in here</a>
              </p>
            </div>

            <div id="form-response"></div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
var authValidationService = {
  /**
   * Build registration schema dynamically based on auth settings
   * For now, returns a static schema with standard fields
   */
  async buildRegistrationSchema(_db) {
    return zod.z.object({
      email: zod.z.string().email("Valid email is required"),
      password: zod.z.string().min(8, "Password must be at least 8 characters"),
      username: zod.z.string().min(3, "Username must be at least 3 characters").optional(),
      firstName: zod.z.string().min(1, "First name is required").optional(),
      lastName: zod.z.string().min(1, "Last name is required").optional()
    });
  },
  /**
   * Generate default values for optional fields
   */
  generateDefaultValue(field, data) {
    switch (field) {
      case "username":
        return data.email ? data.email.split("@")[0] : `user${Date.now()}`;
      case "firstName":
        return "User";
      case "lastName":
        return data.email ? data.email.split("@")[0] : "Account";
      default:
        return "";
    }
  }
};

// src/routes/auth.ts
var authRoutes = new hono.Hono();
authRoutes.get("/login", async (c) => {
  const error = c.req.query("error");
  const message = c.req.query("message");
  const pageData = {
    error: error || void 0,
    message: message || void 0,
    version: c.get("appVersion")
  };
  const db = c.env.DB;
  let demoLoginActive = false;
  try {
    const plugin = await db.prepare("SELECT * FROM plugins WHERE id = ? AND status = ?").bind("demo-login-prefill", "active").first();
    demoLoginActive = !!plugin;
  } catch (error2) {
  }
  return c.html(renderLoginPage(pageData, demoLoginActive));
});
authRoutes.get("/register", (c) => {
  const error = c.req.query("error");
  const pageData = {
    error: error || void 0
  };
  return c.html(renderRegisterPage(pageData));
});
var loginSchema = zod.z.object({
  email: zod.z.string().email("Valid email is required"),
  password: zod.z.string().min(1, "Password is required")
});
authRoutes.post(
  "/register",
  async (c) => {
    try {
      const db = c.env.DB;
      const requestData = await c.req.json();
      const validationSchema = await authValidationService.buildRegistrationSchema(db);
      const validationResult = await validationSchema.safeParseAsync(requestData);
      if (!validationResult.success) {
        return c.json({
          error: "Validation failed",
          details: validationResult.error.errors.map((e) => e.message)
        }, 400);
      }
      const validatedData = validationResult.data;
      const email = validatedData.email;
      const password = validatedData.password;
      const username = validatedData.username || authValidationService.generateDefaultValue("username", validatedData);
      const firstName = validatedData.firstName || authValidationService.generateDefaultValue("firstName", validatedData);
      const lastName = validatedData.lastName || authValidationService.generateDefaultValue("lastName", validatedData);
      const normalizedEmail = email.toLowerCase();
      const existingUser = await db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").bind(normalizedEmail, username).first();
      if (existingUser) {
        return c.json({ error: "User with this email or username already exists" }, 400);
      }
      const passwordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(password);
      const userId = crypto.randomUUID();
      const now = /* @__PURE__ */ new Date();
      await db.prepare(`
        INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        normalizedEmail,
        username,
        firstName,
        lastName,
        passwordHash,
        "viewer",
        // Default role
        1,
        // is_active
        now.getTime(),
        now.getTime()
      ).run();
      const token = await chunk4BJGEGX5_cjs.AuthManager.generateToken(userId, normalizedEmail, "viewer");
      cookie.setCookie(c, "auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 24
        // 24 hours
      });
      return c.json({
        user: {
          id: userId,
          email: normalizedEmail,
          username,
          firstName,
          lastName,
          role: "viewer"
        },
        token
      }, 201);
    } catch (error) {
      console.error("Registration error:", error);
      return c.json({ error: "Registration failed" }, 500);
    }
  }
);
authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: "Validation failed", details: validation.error.errors }, 400);
    }
    const { email, password } = validation.data;
    const db = c.env.DB;
    const normalizedEmail = email.toLowerCase();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.user);
    let user = await cache.get(cache.generateKey("user", `email:${normalizedEmail}`));
    if (!user) {
      user = await db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").bind(normalizedEmail).first();
      if (user) {
        await cache.set(cache.generateKey("user", `email:${normalizedEmail}`), user);
        await cache.set(cache.generateKey("user", user.id), user);
      }
    }
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const isValidPassword = await chunk4BJGEGX5_cjs.AuthManager.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: "Invalid email or password" }, 401);
    }
    const token = await chunk4BJGEGX5_cjs.AuthManager.generateToken(user.id, user.email, user.role);
    cookie.setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 24
      // 24 hours
    });
    await db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).getTime(), user.id).run();
    await cache.delete(cache.generateKey("user", user.id));
    await cache.delete(cache.generateKey("user", `email:${normalizedEmail}`));
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Login failed" }, 500);
  }
});
authRoutes.post("/logout", (c) => {
  cookie.setCookie(c, "auth_token", "", {
    httpOnly: true,
    secure: false,
    // Set to true in production with HTTPS
    sameSite: "Strict",
    maxAge: 0
    // Expire immediately
  });
  return c.json({ message: "Logged out successfully" });
});
authRoutes.get("/logout", (c) => {
  cookie.setCookie(c, "auth_token", "", {
    httpOnly: true,
    secure: false,
    // Set to true in production with HTTPS
    sameSite: "Strict",
    maxAge: 0
    // Expire immediately
  });
  return c.redirect("/auth/login?message=You have been logged out successfully");
});
authRoutes.get("/me", chunk4BJGEGX5_cjs.requireAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    const db = c.env.DB;
    const userData = await db.prepare("SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = ?").bind(user.userId).first();
    if (!userData) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({ user: userData });
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});
authRoutes.post("/refresh", chunk4BJGEGX5_cjs.requireAuth(), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Not authenticated" }, 401);
    }
    const token = await chunk4BJGEGX5_cjs.AuthManager.generateToken(user.userId, user.email, user.role);
    cookie.setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 24
      // 24 hours
    });
    return c.json({ token });
  } catch (error) {
    console.error("Token refresh error:", error);
    return c.json({ error: "Token refresh failed" }, 500);
  }
});
authRoutes.post("/register/form", async (c) => {
  try {
    const db = c.env.DB;
    const formData = await c.req.formData();
    const requestData = {
      email: formData.get("email"),
      password: formData.get("password"),
      username: formData.get("username"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName")
    };
    const normalizedEmail = requestData.email?.toLowerCase();
    requestData.email = normalizedEmail;
    const validationSchema = await authValidationService.buildRegistrationSchema(db);
    const validation = await validationSchema.safeParseAsync(requestData);
    if (!validation.success) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ${validation.error.errors.map((err) => err.message).join(", ")}
        </div>
      `);
    }
    const validatedData = validation.data;
    const email = validatedData.email;
    const password = validatedData.password;
    const username = validatedData.username || authValidationService.generateDefaultValue("username", validatedData);
    const firstName = validatedData.firstName || authValidationService.generateDefaultValue("firstName", validatedData);
    const lastName = validatedData.lastName || authValidationService.generateDefaultValue("lastName", validatedData);
    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").bind(normalizedEmail, username).first();
    if (existingUser) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          User with this email or username already exists
        </div>
      `);
    }
    const passwordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(password);
    const userId = crypto.randomUUID();
    const now = /* @__PURE__ */ new Date();
    await db.prepare(`
      INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      normalizedEmail,
      username,
      firstName,
      lastName,
      passwordHash,
      "admin",
      // First user gets admin role
      1,
      // is_active
      now.getTime(),
      now.getTime()
    ).run();
    const token = await chunk4BJGEGX5_cjs.AuthManager.generateToken(userId, normalizedEmail, "admin");
    cookie.setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: false,
      // Set to true in production with HTTPS
      sameSite: "Strict",
      maxAge: 60 * 60 * 24
      // 24 hours
    });
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        Account created successfully! Redirecting to admin dashboard...
        <script>
          setTimeout(() => {
            window.location.href = '/admin/dashboard';
          }, 2000);
        </script>
      </div>
    `);
  } catch (error) {
    console.error("Registration error:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Registration failed. Please try again.
      </div>
    `);
  }
});
authRoutes.post("/login/form", async (c) => {
  try {
    const formData = await c.req.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const normalizedEmail = email.toLowerCase();
    const validation = loginSchema.safeParse({ email: normalizedEmail, password });
    if (!validation.success) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ${validation.error.errors.map((err) => err.message).join(", ")}
        </div>
      `);
    }
    const db = c.env.DB;
    const user = await db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").bind(normalizedEmail).first();
    if (!user) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Invalid email or password
        </div>
      `);
    }
    const isValidPassword = await chunk4BJGEGX5_cjs.AuthManager.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Invalid email or password
        </div>
      `);
    }
    const token = await chunk4BJGEGX5_cjs.AuthManager.generateToken(user.id, user.email, user.role);
    cookie.setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: false,
      // Set to true in production with HTTPS
      sameSite: "Strict",
      maxAge: 60 * 60 * 24
      // 24 hours
    });
    await db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind((/* @__PURE__ */ new Date()).getTime(), user.id).run();
    return c.html(html.html`
      <div id="form-response">
        <div class="rounded-lg bg-green-100 dark:bg-lime-500/10 p-4 ring-1 ring-green-400 dark:ring-lime-500/20">
          <div class="flex items-start gap-x-3">
            <svg class="h-5 w-5 text-green-600 dark:text-lime-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="flex-1">
              <p class="text-sm font-medium text-green-700 dark:text-lime-300">Login successful! Redirecting to admin dashboard...</p>
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.location.href = '/admin/dashboard';
            }, 2000);
          </script>
        </div>
      </div>
    `);
  } catch (error) {
    console.error("Login error:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Login failed. Please try again.
      </div>
    `);
  }
});
authRoutes.post("/seed-admin", async (c) => {
  try {
    const db = c.env.DB;
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        avatar TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run();
    const existingAdmin = await db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").bind("admin@sonicjs.com", "admin").first();
    if (existingAdmin) {
      return c.json({
        message: "Admin user already exists",
        user: {
          id: existingAdmin.id,
          email: "admin@sonicjs.com",
          username: "admin",
          role: "admin"
        }
      });
    }
    const passwordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword("admin123");
    const userId = "admin-user-id";
    const now = Date.now();
    const adminEmail = "admin@sonicjs.com".toLowerCase();
    await db.prepare(`
      INSERT INTO users (id, email, username, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      adminEmail,
      "admin",
      "Admin",
      "User",
      passwordHash,
      "admin",
      1,
      // is_active
      now,
      now
    ).run();
    return c.json({
      message: "Admin user created successfully",
      user: {
        id: userId,
        email: adminEmail,
        username: "admin",
        role: "admin"
      },
      passwordHash
      // For debugging
    });
  } catch (error) {
    console.error("Seed admin error:", error);
    return c.json({ error: "Failed to create admin user", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});
authRoutes.get("/accept-invitation", async (c) => {
  try {
    const token = c.req.query("token");
    if (!token) {
      return c.html(`
        <html>
          <head><title>Invalid Invitation</title></head>
          <body>
            <h1>Invalid Invitation</h1>
            <p>The invitation link is invalid or has expired.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    const db = c.env.DB;
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, invited_at
      FROM users 
      WHERE invitation_token = ? AND is_active = 0
    `);
    const invitedUser = await userStmt.bind(token).first();
    if (!invitedUser) {
      return c.html(`
        <html>
          <head><title>Invalid Invitation</title></head>
          <body>
            <h1>Invalid Invitation</h1>
            <p>The invitation link is invalid or has expired.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    const invitationAge = Date.now() - invitedUser.invited_at;
    const maxAge = 7 * 24 * 60 * 60 * 1e3;
    if (invitationAge > maxAge) {
      return c.html(`
        <html>
          <head><title>Invitation Expired</title></head>
          <body>
            <h1>Invitation Expired</h1>
            <p>This invitation has expired. Please contact your administrator for a new invitation.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accept Invitation - SonicJS AI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            min-height: 100vh;
          }
        </style>
      </head>
      <body class="bg-gray-900 text-white">
        <div class="min-h-screen flex items-center justify-center px-4">
          <div class="max-w-md w-full space-y-8">
            <div class="text-center">
              <div class="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
              </div>
              <h2 class="text-3xl font-bold">Accept Invitation</h2>
              <p class="mt-2 text-gray-400">Complete your account setup</p>
              <p class="mt-4 text-sm">
                You've been invited as <strong>${invitedUser.first_name} ${invitedUser.last_name}</strong><br>
                <span class="text-gray-400">${invitedUser.email}</span><br>
                <span class="text-blue-400 capitalize">${invitedUser.role}</span>
              </p>
            </div>

            <form method="POST" action="/auth/accept-invitation" class="mt-8 space-y-6">
              <input type="hidden" name="token" value="${token}" />
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input 
                  type="text" 
                  name="username" 
                  required
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter your username"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input 
                  type="password" 
                  name="password" 
                  required
                  minlength="8"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter your password"
                >
                <p class="text-xs text-gray-400 mt-1">Password must be at least 8 characters long</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                <input 
                  type="password" 
                  name="confirm_password" 
                  required
                  minlength="8"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Confirm your password"
                >
              </div>

              <button 
                type="submit"
                class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
              >
                Accept Invitation & Create Account
              </button>
            </form>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Accept invitation page error:", error);
    return c.html(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error</h1>
          <p>An error occurred while processing your invitation.</p>
          <a href="/auth/login">Go to Login</a>
        </body>
      </html>
    `);
  }
});
authRoutes.post("/accept-invitation", async (c) => {
  try {
    const formData = await c.req.formData();
    const token = formData.get("token")?.toString();
    const username = formData.get("username")?.toString()?.trim();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirm_password")?.toString();
    if (!token || !username || !password || !confirmPassword) {
      return c.json({ error: "All fields are required" }, 400);
    }
    if (password !== confirmPassword) {
      return c.json({ error: "Passwords do not match" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long" }, 400);
    }
    const db = c.env.DB;
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, invited_at
      FROM users 
      WHERE invitation_token = ? AND is_active = 0
    `);
    const invitedUser = await userStmt.bind(token).first();
    if (!invitedUser) {
      return c.json({ error: "Invalid or expired invitation" }, 400);
    }
    const invitationAge = Date.now() - invitedUser.invited_at;
    const maxAge = 7 * 24 * 60 * 60 * 1e3;
    if (invitationAge > maxAge) {
      return c.json({ error: "Invitation has expired" }, 400);
    }
    const existingUsernameStmt = db.prepare(`
      SELECT id FROM users WHERE username = ? AND id != ?
    `);
    const existingUsername = await existingUsernameStmt.bind(username, invitedUser.id).first();
    if (existingUsername) {
      return c.json({ error: "Username is already taken" }, 400);
    }
    const passwordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(password);
    const updateStmt = db.prepare(`
      UPDATE users SET 
        username = ?,
        password_hash = ?,
        is_active = 1,
        email_verified = 1,
        invitation_token = NULL,
        accepted_invitation_at = ?,
        updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      username,
      passwordHash,
      Date.now(),
      Date.now(),
      invitedUser.id
    ).run();
    const authToken = await chunk4BJGEGX5_cjs.AuthManager.generateToken(invitedUser.id, invitedUser.email, invitedUser.role);
    cookie.setCookie(c, "auth_token", authToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 24
      // 24 hours
    });
    return c.redirect("/admin/dashboard?welcome=true");
  } catch (error) {
    console.error("Accept invitation error:", error);
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});
authRoutes.post("/request-password-reset", async (c) => {
  try {
    const formData = await c.req.formData();
    const email = formData.get("email")?.toString()?.trim()?.toLowerCase();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Please enter a valid email address" }, 400);
    }
    const db = c.env.DB;
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name FROM users 
      WHERE email = ? AND is_active = 1
    `);
    const user = await userStmt.bind(email).first();
    if (!user) {
      return c.json({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent."
      });
    }
    const resetToken = crypto.randomUUID();
    const resetExpires = Date.now() + 60 * 60 * 1e3;
    const updateStmt = db.prepare(`
      UPDATE users SET 
        password_reset_token = ?,
        password_reset_expires = ?,
        updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      resetToken,
      resetExpires,
      Date.now(),
      user.id
    ).run();
    const resetLink = `${c.req.header("origin") || "http://localhost:8787"}/auth/reset-password?token=${resetToken}`;
    return c.json({
      success: true,
      message: "If an account with this email exists, a password reset link has been sent.",
      reset_link: resetLink
      // In production, this would be sent via email
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return c.json({ error: "Failed to process password reset request" }, 500);
  }
});
authRoutes.get("/reset-password", async (c) => {
  try {
    const token = c.req.query("token");
    if (!token) {
      return c.html(`
        <html>
          <head><title>Invalid Reset Link</title></head>
          <body>
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has expired.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    const db = c.env.DB;
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, password_reset_expires
      FROM users 
      WHERE password_reset_token = ? AND is_active = 1
    `);
    const user = await userStmt.bind(token).first();
    if (!user) {
      return c.html(`
        <html>
          <head><title>Invalid Reset Link</title></head>
          <body>
            <h1>Invalid Reset Link</h1>
            <p>The password reset link is invalid or has already been used.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    if (Date.now() > user.password_reset_expires) {
      return c.html(`
        <html>
          <head><title>Reset Link Expired</title></head>
          <body>
            <h1>Reset Link Expired</h1>
            <p>The password reset link has expired. Please request a new one.</p>
            <a href="/auth/login">Go to Login</a>
          </body>
        </html>
      `);
    }
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - SonicJS AI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            min-height: 100vh;
          }
        </style>
      </head>
      <body class="bg-gray-900 text-white">
        <div class="min-h-screen flex items-center justify-center px-4">
          <div class="max-w-md w-full space-y-8">
            <div class="text-center">
              <div class="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z"/>
                </svg>
              </div>
              <h2 class="text-3xl font-bold">Reset Password</h2>
              <p class="mt-2 text-gray-400">Choose a new password for your account</p>
              <p class="mt-4 text-sm">
                Reset password for <strong>${user.first_name} ${user.last_name}</strong><br>
                <span class="text-gray-400">${user.email}</span>
              </p>
            </div>

            <form method="POST" action="/auth/reset-password" class="mt-8 space-y-6">
              <input type="hidden" name="token" value="${token}" />
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <input 
                  type="password" 
                  name="password" 
                  required
                  minlength="8"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Enter your new password"
                >
                <p class="text-xs text-gray-400 mt-1">Password must be at least 8 characters long</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirm_password" 
                  required
                  minlength="8"
                  class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Confirm your new password"
                >
              </div>

              <button 
                type="submit"
                class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
              >
                Reset Password
              </button>
            </form>

            <div class="text-center">
              <a href="/auth/login" class="text-sm text-blue-400 hover:text-blue-300">
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Password reset page error:", error);
    return c.html(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error</h1>
          <p>An error occurred while processing your password reset.</p>
          <a href="/auth/login">Go to Login</a>
        </body>
      </html>
    `);
  }
});
authRoutes.post("/reset-password", async (c) => {
  try {
    const formData = await c.req.formData();
    const token = formData.get("token")?.toString();
    const password = formData.get("password")?.toString();
    const confirmPassword = formData.get("confirm_password")?.toString();
    if (!token || !password || !confirmPassword) {
      return c.json({ error: "All fields are required" }, 400);
    }
    if (password !== confirmPassword) {
      return c.json({ error: "Passwords do not match" }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long" }, 400);
    }
    const db = c.env.DB;
    const userStmt = db.prepare(`
      SELECT id, email, password_hash, password_reset_expires
      FROM users
      WHERE password_reset_token = ? AND is_active = 1
    `);
    const user = await userStmt.bind(token).first();
    if (!user) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }
    if (Date.now() > user.password_reset_expires) {
      return c.json({ error: "Reset token has expired" }, 400);
    }
    const newPasswordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(password);
    try {
      const historyStmt = db.prepare(`
        INSERT INTO password_history (id, user_id, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `);
      await historyStmt.bind(
        crypto.randomUUID(),
        user.id,
        user.password_hash,
        Date.now()
      ).run();
    } catch (historyError) {
      console.warn("Could not store password history:", historyError);
    }
    const updateStmt = db.prepare(`
      UPDATE users SET
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL,
        updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      newPasswordHash,
      Date.now(),
      user.id
    ).run();
    return c.redirect("/auth/login?message=Password reset successfully. Please log in with your new password.");
  } catch (error) {
    console.error("Password reset error:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});
var auth_default = authRoutes;

// src/templates/pages/admin-content-form.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();

// src/templates/components/dynamic-field.template.ts
function renderDynamicField(field, options = {}) {
  const { value = "", errors = [], disabled = false, className = "" } = options;
  const opts = field.field_options || {};
  const required = field.is_required ? "required" : "";
  const baseClasses = `w-full rounded-lg px-3 py-2 text-sm text-zinc-950 dark:text-white bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow ${className}`;
  const errorClasses = errors.length > 0 ? "ring-pink-600 dark:ring-pink-500 focus:ring-pink-600 dark:focus:ring-pink-500" : "";
  const fieldId = `field-${field.field_name}`;
  const fieldName = field.field_name;
  let fieldHTML = "";
  switch (field.field_type) {
    case "text":
      let patternHelp = "";
      let autoSlugScript = "";
      if (opts.pattern) {
        if (opts.pattern === "^[a-z0-9-]+$" || opts.pattern === "^[a-zA-Z0-9_-]+$") {
          patternHelp = '<p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Use letters, numbers, underscores, and hyphens only</p>';
          if (fieldName === "slug") {
            patternHelp += `<button type="button" class="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300" onclick="generateSlugFromTitle('\${fieldId}')">Generate from title</button>`;
            autoSlugScript = `
              <script>
                function generateSlugFromTitle(slugFieldId) {
                  const titleField = document.querySelector('input[name="title"]');
                  const slugField = document.getElementById(slugFieldId);
                  if (titleField && slugField) {
                    const slug = titleField.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\\s_-]/g, '')
                      .replace(/\\s+/g, '-')
                      .replace(/[-_]+/g, '-')
                      .replace(/^[-_]|[-_]$/g, '');
                    slugField.value = slug;
                  }
                }
                
                // Auto-generate slug when title changes
                document.addEventListener('DOMContentLoaded', function() {
                  const titleField = document.querySelector('input[name="title"]');
                  const slugField = document.getElementById('${fieldId}');
                  if (titleField && slugField && !slugField.value) {
                    titleField.addEventListener('input', function() {
                      if (!slugField.value) {
                        generateSlugFromTitle('${fieldId}');
                      }
                    });
                  }
                });
              </script>
            `;
          }
        } else {
          patternHelp = '<p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Must match required format</p>';
        }
      }
      fieldHTML = `
        <input 
          type="text" 
          id="${fieldId}"
          name="${fieldName}"
          value="${escapeHtml2(value)}"
          placeholder="${opts.placeholder || ""}"
          maxlength="${opts.maxLength || ""}"
          ${opts.pattern ? `data-pattern="${opts.pattern}"` : ""}
          class="${baseClasses} ${errorClasses}"
          ${required}
          ${disabled ? "disabled" : ""}
        >
        ${patternHelp}
        ${autoSlugScript}
        ${opts.pattern ? `
        <script>
          (function() {
            const field = document.getElementById('${fieldId}');
            const pattern = new RegExp('${opts.pattern}');
            
            field.addEventListener('input', function() {
              if (this.value && !pattern.test(this.value)) {
                if ('${opts.pattern}' === '^[a-zA-Z0-9_-]+$' || '${opts.pattern}' === '^[a-z0-9-]+$') {
                  this.setCustomValidity('Please use only letters, numbers, underscores, and hyphens.');
                } else {
                  this.setCustomValidity('Please enter a valid format.');
                }
              } else {
                this.setCustomValidity('');
              }
            });
            
            field.addEventListener('blur', function() {
              this.reportValidity();
            });
          })();
        </script>
        ` : ""}
      `;
      break;
    case "richtext":
      fieldHTML = `
        <div class="richtext-container">
          <textarea 
            id="${fieldId}"
            name="${fieldName}"
            class="${baseClasses} ${errorClasses} min-h-[${opts.height || 300}px]"
            ${required}
            ${disabled ? "disabled" : ""}
          >${escapeHtml2(value)}</textarea>
          <script>
            // Initialize TinyMCE for this field
            if (typeof tinymce !== 'undefined') {
              tinymce.init({
                selector: '#${fieldId}',
                skin: 'oxide-dark',
                content_css: 'dark',
                height: ${opts.height || 300},
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar: '${opts.toolbar === "simple" ? "bold italic underline | bullist numlist | link" : "undo redo | blocks | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help"}',
                content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, San Francisco, Segoe UI, Roboto, Helvetica Neue, sans-serif; font-size: 14px; color: #fff; background-color: #1f2937; }',
                setup: function(editor) {
                  editor.on('change', function() {
                    editor.save();
                  });
                }
              });
            }
          </script>
        </div>
      `;
      break;
    case "number":
      fieldHTML = `
        <input 
          type="number" 
          id="${fieldId}"
          name="${fieldName}"
          value="${value}"
          min="${opts.min || ""}"
          max="${opts.max || ""}"
          step="${opts.step || ""}"
          placeholder="${opts.placeholder || ""}"
          class="${baseClasses} ${errorClasses}"
          ${required}
          ${disabled ? "disabled" : ""}
        >
      `;
      break;
    case "boolean":
      const checked = value === true || value === "true" || value === "1" ? "checked" : "";
      fieldHTML = `
        <div class="flex items-center space-x-3">
          <input 
            type="checkbox" 
            id="${fieldId}"
            name="${fieldName}"
            value="true"
            class="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
            ${checked}
            ${disabled ? "disabled" : ""}
          >
          <label for="${fieldId}" class="text-sm text-gray-300">
            ${opts.checkboxLabel || field.field_label}
          </label>
        </div>
        <input type="hidden" name="${fieldName}_submitted" value="1">
      `;
      break;
    case "date":
      fieldHTML = `
        <input 
          type="date" 
          id="${fieldId}"
          name="${fieldName}"
          value="${value}"
          min="${opts.min || ""}"
          max="${opts.max || ""}"
          class="${baseClasses} ${errorClasses}"
          ${required}
          ${disabled ? "disabled" : ""}
        >
      `;
      break;
    case "select":
      const options2 = opts.options || [];
      const multiple = opts.multiple ? "multiple" : "";
      const selectedValues = Array.isArray(value) ? value : [value];
      fieldHTML = `
        <select 
          id="${fieldId}"
          name="${fieldName}${opts.multiple ? "[]" : ""}"
          class="${baseClasses} ${errorClasses}"
          ${multiple}
          ${required}
          ${disabled ? "disabled" : ""}
        >
          ${!required && !opts.multiple ? '<option value="">Choose an option...</option>' : ""}
          ${options2.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const selected = selectedValues.includes(optionValue) ? "selected" : "";
        return `<option value="${escapeHtml2(optionValue)}" ${selected}>${escapeHtml2(optionLabel)}</option>`;
      }).join("")}
        </select>
        ${opts.allowCustom ? `
          <div class="mt-2">
            <input 
              type="text" 
              placeholder="Add custom option..."
              class="${baseClasses.replace("border-white/10", "border-white/5")} text-sm"
              onkeypress="if(event.key==='Enter'){addCustomOption(this, '${fieldId}');event.preventDefault();}"
            >
          </div>
        ` : ""}
      `;
      break;
    case "media":
      fieldHTML = `
        <div class="media-field-container">
          <input type="hidden" id="${fieldId}" name="${fieldName}" value="${value}">
          <div class="media-preview ${value ? "" : "hidden"}" id="${fieldId}-preview">
            ${value ? `<img src="${value}" alt="Selected media" class="w-32 h-32 object-cover rounded-lg border border-white/20">` : ""}
          </div>
          <div class="media-actions mt-2 space-x-2">
            <button
              type="button"
              onclick="openMediaSelector('${fieldId}')"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              ${disabled ? "disabled" : ""}
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Select Media
            </button>
            ${value ? `
              <button
                type="button"
                onclick="clearMediaField('${fieldId}')"
                class="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                ${disabled ? "disabled" : ""}
              >
                Remove
              </button>
            ` : ""}
          </div>
        </div>
      `;
      break;
    case "guid":
      fieldHTML = `
        <div class="guid-field-container">
          <input
            type="text"
            id="${fieldId}"
            name="${fieldName}"
            value="${escapeHtml2(value)}"
            class="${baseClasses} bg-zinc-100 dark:bg-zinc-800/50 cursor-not-allowed"
            readonly
            disabled
          >
          <div class="mt-2 flex items-start gap-x-2">
            <svg class="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/>
            </svg>
            <div class="text-xs text-zinc-600 dark:text-zinc-400">
              ${value ? "This unique identifier was automatically generated and cannot be changed." : "A unique identifier (UUID) will be automatically generated when you save this content."}
            </div>
          </div>
        </div>
      `;
      break;
    default:
      fieldHTML = `
        <input 
          type="text" 
          id="${fieldId}"
          name="${fieldName}"
          value="${escapeHtml2(value)}"
          class="${baseClasses} ${errorClasses}"
          ${required}
          ${disabled ? "disabled" : ""}
        >
      `;
  }
  return `
    <div class="form-group">
      <label for="${fieldId}" class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">
        ${escapeHtml2(field.field_label)}
        ${field.is_required ? '<span class="text-pink-600 dark:text-pink-400 ml-1">*</span>' : ""}
      </label>
      ${fieldHTML}
      ${errors.length > 0 ? `
        <div class="mt-2 text-sm text-pink-600 dark:text-pink-400">
          ${errors.map((error) => `<div>${escapeHtml2(error)}</div>`).join("")}
        </div>
      ` : ""}
      ${opts.helpText ? `
        <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          ${escapeHtml2(opts.helpText)}
        </div>
      ` : ""}
    </div>
  `;
}
function renderFieldGroup(title, fields, collapsible = false) {
  const groupId = title.toLowerCase().replace(/\s+/g, "-");
  return `
    <div class="field-group rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 mb-6">
      <div class="field-group-header border-b border-zinc-950/5 dark:border-white/10 px-6 py-4 ${collapsible ? "cursor-pointer" : ""}" ${collapsible ? `onclick="toggleFieldGroup('${groupId}')"` : ""}>
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white flex items-center">
          ${escapeHtml2(title)}
          ${collapsible ? `
            <svg id="${groupId}-icon" class="w-5 h-5 ml-2 transform transition-transform text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          ` : ""}
        </h3>
      </div>
      <div id="${groupId}-content" class="field-group-content px-6 py-6 space-y-6 ${collapsible ? "collapsible" : ""}">
        ${fields.join("")}
      </div>
    </div>
  `;
}
function escapeHtml2(text) {
  if (typeof text !== "string") return String(text || "");
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char] || char);
}

// src/templates/pages/admin-content-form.template.ts
function renderContentFormPage(data) {
  const isEdit = data.isEdit || !!data.id;
  const title = isEdit ? `Edit: ${data.title || "Content"}` : `New ${data.collection.display_name}`;
  const backUrl = data.referrerParams ? `/admin/content?${data.referrerParams}` : `/admin/content?collection=${data.collection.id}`;
  const coreFields = data.fields.filter((f) => ["title", "slug", "content"].includes(f.field_name));
  const contentFields = data.fields.filter((f) => !["title", "slug", "content"].includes(f.field_name) && !f.field_name.startsWith("meta_"));
  const metaFields = data.fields.filter((f) => f.field_name.startsWith("meta_"));
  const getFieldValue = (fieldName) => {
    if (fieldName === "title") return data.title || data.data?.[fieldName] || "";
    if (fieldName === "slug") return data.slug || data.data?.[fieldName] || "";
    return data.data?.[fieldName] || "";
  };
  const coreFieldsHTML = coreFields.sort((a, b) => a.field_order - b.field_order).map((field) => renderDynamicField(field, {
    value: getFieldValue(field.field_name),
    errors: data.validationErrors?.[field.field_name] || []
  }));
  const contentFieldsHTML = contentFields.sort((a, b) => a.field_order - b.field_order).map((field) => renderDynamicField(field, {
    value: getFieldValue(field.field_name),
    errors: data.validationErrors?.[field.field_name] || []
  }));
  const metaFieldsHTML = metaFields.sort((a, b) => a.field_order - b.field_order).map((field) => renderDynamicField(field, {
    value: getFieldValue(field.field_name),
    errors: data.validationErrors?.[field.field_name] || []
  }));
  const pageContent = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">${isEdit ? "Edit Content" : "New Content"}</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
            ${data.collection.description || `Manage ${data.collection.display_name.toLowerCase()} content`}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="${backUrl}" class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Content
          </a>
        </div>
      </div>

      <!-- Form Container -->
      <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
        <!-- Form Header -->
        <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
          <div class="flex items-center gap-x-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 ring-1 ring-zinc-950/10 dark:ring-white/10">
              <svg class="h-6 w-6 text-zinc-950 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base/7 font-semibold text-zinc-950 dark:text-white">${data.collection.display_name}</h2>
              <p class="text-sm/6 text-zinc-500 dark:text-zinc-400">${isEdit ? "Update your content" : "Create new content"}</p>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div class="px-6 py-6">
          <div id="form-messages">
            ${data.error ? chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error, dismissible: true }) : ""}
            ${data.success ? chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.success, dismissible: true }) : ""}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content Form -->
        <div class="lg:col-span-2">
          <form
            id="content-form"
            ${isEdit ? `hx-put="/admin/content/${data.id}"` : `hx-post="/admin/content"`}
            hx-target="#form-messages"
            hx-encoding="multipart/form-data"
            class="space-y-6"
          >
            <input type="hidden" name="collection_id" value="${data.collection.id}">
            ${isEdit ? `<input type="hidden" name="id" value="${data.id}">` : ""}
            ${data.referrerParams ? `<input type="hidden" name="referrer_params" value="${data.referrerParams}">` : ""}
            
            <!-- Core Fields -->
            ${renderFieldGroup("Basic Information", coreFieldsHTML)}
            
            <!-- Content Fields -->
            ${contentFields.length > 0 ? renderFieldGroup("Content Details", contentFieldsHTML) : ""}
            
            <!-- SEO & Meta Fields -->
            ${metaFields.length > 0 ? renderFieldGroup("SEO & Metadata", metaFieldsHTML, true) : ""}
            
            <div id="form-messages"></div>
          </form>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Publishing Options -->
          <div class="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
            <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-4">Publishing</h3>

            ${data.workflowEnabled ? `
              <!-- Workflow Status (when workflow plugin is enabled) -->
              <div class="mb-4">
                <label for="status" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Status</label>
                <div class="mt-2 grid grid-cols-1">
                  <select
                    id="status"
                    name="status"
                    form="content-form"
                    class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6"
                  >
                    <option value="draft" ${data.status === "draft" ? "selected" : ""}>Draft</option>
                    <option value="review" ${data.status === "review" ? "selected" : ""}>Under Review</option>
                    <option value="published" ${data.status === "published" ? "selected" : ""}>Published</option>
                    <option value="archived" ${data.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                  <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                  </svg>
                </div>
              </div>

              <!-- Scheduled Publishing -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Schedule Publish</label>
                <input
                  type="datetime-local"
                  name="scheduled_publish_at"
                  form="content-form"
                  value="${data.scheduled_publish_at ? new Date(data.scheduled_publish_at).toISOString().slice(0, 16) : ""}"
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                >
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Leave empty to publish immediately</p>
              </div>

              <!-- Scheduled Unpublishing -->
              <div class="mb-6">
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Schedule Unpublish</label>
                <input
                  type="datetime-local"
                  name="scheduled_unpublish_at"
                  form="content-form"
                  value="${data.scheduled_unpublish_at ? new Date(data.scheduled_unpublish_at).toISOString().slice(0, 16) : ""}"
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                >
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Automatically unpublish at this time</p>
              </div>
            ` : `
              <!-- Simple Status (when workflow plugin is disabled) -->
              <div class="mb-6">
                <label for="status" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Status</label>
                <div class="mt-2 grid grid-cols-1">
                  <select
                    id="status"
                    name="status"
                    form="content-form"
                    class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6"
                  >
                    <option value="draft" ${data.status === "draft" ? "selected" : ""}>Draft</option>
                    <option value="published" ${data.status === "published" ? "selected" : ""}>Published</option>
                  </select>
                  <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                  </svg>
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enable Workflow plugin for advanced status management</p>
              </div>
            `}
          </div>

          <!-- Content Info -->
          ${isEdit ? `
            <div class="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
              <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-4">Content Info</h3>

              <dl class="space-y-3 text-sm">
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Created</dt>
                  <dd class="mt-1 text-zinc-950 dark:text-white">${data.data?.created_at ? new Date(data.data.created_at).toLocaleDateString() : "Unknown"}</dd>
                </div>
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Last Modified</dt>
                  <dd class="mt-1 text-zinc-950 dark:text-white">${data.data?.updated_at ? new Date(data.data.updated_at).toLocaleDateString() : "Unknown"}</dd>
                </div>
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Author</dt>
                  <dd class="mt-1 text-zinc-950 dark:text-white">${data.data?.author || "Unknown"}</dd>
                </div>
                ${data.data?.published_at ? `
                  <div>
                    <dt class="text-zinc-500 dark:text-zinc-400">Published</dt>
                    <dd class="mt-1 text-zinc-950 dark:text-white">${new Date(data.data.published_at).toLocaleDateString()}</dd>
                  </div>
                ` : ""}
              </dl>

              <div class="mt-4 pt-4 border-t border-zinc-950/5 dark:border-white/10">
                <button
                  type="button"
                  onclick="showVersionHistory('${data.id}')"
                  class="inline-flex items-center gap-x-1.5 text-sm font-medium text-zinc-950 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  View Version History
                </button>
              </div>
            </div>
          ` : ""}

          <!-- Quick Actions -->
          <div class="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
            <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-4">Quick Actions</h3>

            <div class="space-y-2">
              <button
                type="button"
                onclick="previewContent()"
                class="w-full inline-flex items-center gap-x-2 px-3 py-2 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                Preview Content
              </button>

              <button
                type="button"
                onclick="duplicateContent()"
                class="w-full inline-flex items-center gap-x-2 px-3 py-2 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Duplicate Content
              </button>

              ${isEdit ? `
                <button
                  type="button"
                  onclick="deleteContent('${data.id}')"
                  class="w-full inline-flex items-center gap-x-2 px-3 py-2 text-sm font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                  Delete Content
                </button>
              ` : ""}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex items-center justify-between">
          <a href="${backUrl}" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Cancel
          </a>

          <div class="flex items-center gap-x-3">
            <button
              type="submit"
              form="content-form"
              name="action"
              value="save"
              class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              ${isEdit ? "Update" : "Save"}
            </button>

            ${data.user?.role !== "viewer" ? `
              <button
                type="submit"
                form="content-form"
                name="action"
                value="save_and_publish"
                class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-lime-600 dark:bg-lime-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-lime-700 dark:hover:bg-lime-600 transition-colors shadow-sm"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                ${isEdit ? "Update" : "Save"} & Publish
              </button>
            ` : ""}
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Confirmation Dialogs -->
    ${chunk3SPQ3J4N_cjs.renderConfirmationDialog({
    id: "duplicate-content-confirm",
    title: "Duplicate Content",
    message: "Create a copy of this content?",
    confirmText: "Duplicate",
    cancelText: "Cancel",
    iconColor: "blue",
    confirmClass: "bg-blue-500 hover:bg-blue-400",
    onConfirm: "performDuplicateContent()"
  })}

    ${chunk3SPQ3J4N_cjs.renderConfirmationDialog({
    id: "delete-content-confirm",
    title: "Delete Content",
    message: "Are you sure you want to delete this content? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
    iconColor: "red",
    confirmClass: "bg-red-500 hover:bg-red-400",
    onConfirm: `performDeleteContent('${data.id}')`
  })}

    ${chunk3SPQ3J4N_cjs.getConfirmationDialogScript()}

    <!-- TinyMCE CDN -->
    <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>

    <!-- Dynamic Field Scripts -->
    <script>
      // Field group toggle
      function toggleFieldGroup(groupId) {
        const content = document.getElementById(groupId + '-content');
        const icon = document.getElementById(groupId + '-icon');
        
        if (content.classList.contains('hidden')) {
          content.classList.remove('hidden');
          icon.classList.remove('rotate-[-90deg]');
        } else {
          content.classList.add('hidden');
          icon.classList.add('rotate-[-90deg]');
        }
      }

      // Media field functions
      let currentMediaFieldId = null;

      function openMediaSelector(fieldId) {
        currentMediaFieldId = fieldId;
        // Store the original value in case user cancels
        const originalValue = document.getElementById(fieldId)?.value || '';

        // Open media library modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
        modal.id = 'media-selector-modal';
        modal.innerHTML = \`
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold text-zinc-950 dark:text-white mb-4">Select Media</h3>
            <div id="media-grid-container" hx-get="/admin/media/selector" hx-trigger="load"></div>
            <div class="mt-4 flex justify-end space-x-2">
              <button
                onclick="cancelMediaSelection('\${fieldId}', '\${originalValue}')"
                class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button
                onclick="closeMediaSelector()"
                class="rounded-lg bg-zinc-950 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
                OK
              </button>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);
        // Trigger HTMX for the modal content
        if (window.htmx) {
          htmx.process(modal);
        }
      }

      function closeMediaSelector() {
        const modal = document.getElementById('media-selector-modal');
        if (modal) {
          modal.remove();
        }
        currentMediaFieldId = null;
      }

      function cancelMediaSelection(fieldId, originalValue) {
        // Restore original value
        const hiddenInput = document.getElementById(fieldId);
        if (hiddenInput) {
          hiddenInput.value = originalValue;
        }

        // If original value was empty, hide the preview and show select button
        if (!originalValue) {
          const preview = document.getElementById(fieldId + '-preview');
          if (preview) {
            preview.classList.add('hidden');
          }
        }

        // Close modal
        closeMediaSelector();
      }

      function clearMediaField(fieldId) {
        document.getElementById(fieldId).value = '';
        document.getElementById(fieldId + '-preview').classList.add('hidden');
      }

      // Global function called by media selector buttons
      window.selectMediaFile = function(mediaId, mediaUrl, filename) {
        if (!currentMediaFieldId) {
          console.error('No field ID set for media selection');
          return;
        }

        const fieldId = currentMediaFieldId;

        // Set the hidden input value to the media URL (not ID)
        const hiddenInput = document.getElementById(fieldId);
        if (hiddenInput) {
          hiddenInput.value = mediaUrl;
        }

        // Update the preview
        const preview = document.getElementById(fieldId + '-preview');
        if (preview) {
          preview.innerHTML = \`<img src="\${mediaUrl}" alt="\${filename}" class="w-32 h-32 object-cover rounded-lg border border-white/20">\`;
          preview.classList.remove('hidden');
        }

        // Show the remove button by finding the media actions container and updating it
        const mediaField = hiddenInput?.closest('.media-field-container');
        if (mediaField) {
          const actionsDiv = mediaField.querySelector('.media-actions');
          if (actionsDiv && !actionsDiv.querySelector('button:has-text("Remove")')) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.onclick = () => clearMediaField(fieldId);
            removeBtn.className = 'inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all';
            removeBtn.textContent = 'Remove';
            actionsDiv.appendChild(removeBtn);
          }
        }

        // DON'T close the modal - let user click OK button
        // Visual feedback: highlight the selected item
        document.querySelectorAll('#media-selector-grid [data-media-id]').forEach(el => {
          el.classList.remove('ring-2', 'ring-lime-500', 'dark:ring-lime-400');
        });
        const selectedItem = document.querySelector(\`#media-selector-grid [data-media-id="\${mediaId}"]\`);
        if (selectedItem) {
          selectedItem.classList.add('ring-2', 'ring-lime-500', 'dark:ring-lime-400');
        }
      };

      function setMediaField(fieldId, mediaUrl) {
        document.getElementById(fieldId).value = mediaUrl;
        const preview = document.getElementById(fieldId + '-preview');
        preview.innerHTML = \`<img src="\${mediaUrl}" alt="Selected media" class="w-32 h-32 object-cover rounded-lg ring-1 ring-zinc-950/10 dark:ring-white/10">\`;
        preview.classList.remove('hidden');

        // Close modal
        document.querySelector('.fixed.inset-0')?.remove();
      }

      // Custom select options
      function addCustomOption(input, selectId) {
        const value = input.value.trim();
        if (value) {
          const select = document.getElementById(selectId);
          const option = document.createElement('option');
          option.value = value;
          option.text = value;
          option.selected = true;
          select.appendChild(option);
          input.value = '';
        }
      }

      // Quick actions
      function previewContent() {
        const form = document.getElementById('content-form');
        const formData = new FormData(form);
        
        // Open preview in new window
        const preview = window.open('', '_blank');
        preview.document.write('<p>Loading preview...</p>');
        
        fetch('/admin/content/preview', {
          method: 'POST',
          body: formData
        })
        .then(response => response.text())
        .then(html => {
          preview.document.open();
          preview.document.write(html);
          preview.document.close();
        })
        .catch(error => {
          preview.document.write('<p>Error loading preview</p>');
        });
      }

      function duplicateContent() {
        showConfirmDialog('duplicate-content-confirm');
      }

      function performDuplicateContent() {
        const form = document.getElementById('content-form');
        const formData = new FormData(form);
        formData.append('action', 'duplicate');

        fetch('/admin/content/duplicate', {
          method: 'POST',
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            window.location.href = \`/admin/content/\${data.id}/edit\`;
          } else {
            alert('Error duplicating content');
          }
        });
      }

      function deleteContent(contentId) {
        showConfirmDialog('delete-content-confirm');
      }

      function performDeleteContent(contentId) {
        fetch(\`/admin/content/\${contentId}\`, {
          method: 'DELETE'
        })
        .then(response => {
          if (response.ok) {
            window.location.href = '/admin/content';
          } else {
            alert('Error deleting content');
          }
        });
      }

      function showVersionHistory(contentId) {
        // Create and show version history modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = \`
          <div id="version-history-content">
            <div class="flex items-center justify-center h-32">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          </div>
        \`;
        document.body.appendChild(modal);

        // Load version history
        fetch(\`/admin/content/\${contentId}/versions\`)
        .then(response => response.text())
        .then(html => {
          document.getElementById('version-history-content').innerHTML = html;
        })
        .catch(error => {
          console.error('Error loading version history:', error);
          document.getElementById('version-history-content').innerHTML = '<p class="text-zinc-950 dark:text-white">Error loading version history</p>';
        });
      }

      // Auto-save functionality
      let autoSaveTimeout;
      function scheduleAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
          const form = document.getElementById('content-form');
          const formData = new FormData(form);
          formData.append('action', 'autosave');
          
          fetch(form.action, {
            method: 'POST',
            body: formData
          })
          .then(response => {
            if (response.ok) {
              console.log('Auto-saved');
            }
          })
          .catch(error => console.error('Auto-save failed:', error));
        }, 30000); // Auto-save every 30 seconds
      }

      // Bind auto-save to form changes
      document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('content-form');
        form.addEventListener('input', scheduleAutoSave);
        form.addEventListener('change', scheduleAutoSave);
      });
    </script>
  `;
  const layoutData = {
    title,
    pageTitle: "Content Management",
    currentPath: "/admin/content",
    user: data.user,
    content: pageContent,
    version: data.version
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/pages/admin-content-list.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderContentListPage(data) {
  const urlParams = new URLSearchParams();
  if (data.modelName && data.modelName !== "all") urlParams.set("model", data.modelName);
  if (data.status && data.status !== "all") urlParams.set("status", data.status);
  if (data.search) urlParams.set("search", data.search);
  if (data.page && data.page !== 1) urlParams.set("page", data.page.toString());
  const currentParams = urlParams.toString();
  const hasActiveFilters = data.modelName !== "all" || data.status !== "all" || !!data.search;
  const filterBarData = {
    filters: [
      {
        name: "model",
        label: "Model",
        options: [
          { value: "all", label: "All Models", selected: data.modelName === "all" },
          ...data.models.map((model) => ({
            value: model.name,
            label: model.displayName,
            selected: data.modelName === model.name
          }))
        ]
      },
      {
        name: "status",
        label: "Status",
        options: [
          { value: "all", label: "All Status", selected: data.status === "all" },
          { value: "draft", label: "Draft", selected: data.status === "draft" },
          { value: "review", label: "Under Review", selected: data.status === "review" },
          { value: "scheduled", label: "Scheduled", selected: data.status === "scheduled" },
          { value: "published", label: "Published", selected: data.status === "published" },
          { value: "archived", label: "Archived", selected: data.status === "archived" },
          { value: "deleted", label: "Deleted", selected: data.status === "deleted" }
        ]
      }
    ],
    actions: [
      {
        label: "Refresh",
        className: "btn-secondary",
        onclick: "location.reload()"
      }
    ],
    bulkActions: [
      { label: "Publish", value: "publish", icon: "check-circle" },
      { label: "Unpublish", value: "unpublish", icon: "x-circle" },
      { label: "Delete", value: "delete", icon: "trash", className: "text-pink-600" }
    ]
  };
  const tableColumns = [
    {
      key: "title",
      label: "Title",
      sortable: true,
      sortType: "string",
      render: (value, row) => `
        <div class="flex items-center">
          <div>
            <div class="text-sm font-medium text-zinc-950 dark:text-white">
              <a href="/content/${row.id}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">${row.title}</a>
            </div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400">${row.slug}</div>
          </div>
        </div>
      `
    },
    {
      key: "modelName",
      label: "Model",
      sortable: true,
      sortType: "string",
      className: "text-sm text-zinc-500 dark:text-zinc-400"
    },
    {
      key: "statusBadge",
      label: "Status",
      sortable: true,
      sortType: "string",
      render: (value) => value
    },
    {
      key: "authorName",
      label: "Author",
      sortable: true,
      sortType: "string",
      className: "text-sm text-zinc-500 dark:text-zinc-400"
    },
    {
      key: "formattedDate",
      label: "Updated",
      sortable: true,
      sortType: "date",
      className: "text-sm text-zinc-500 dark:text-zinc-400"
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      className: "text-sm font-medium",
      render: (value, row) => `
        <div class="flex space-x-2">
          <button
            class="inline-flex items-center justify-center p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-600/20 dark:ring-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors"
            onclick="window.location.href='/admin/content/${row.id}/edit${currentParams ? `?ref=${encodeURIComponent(currentParams)}` : ""}'"
            title="Edit"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
          </button>
          <button
            class="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
            hx-delete="/admin/content/${row.id}"
            hx-confirm="Are you sure you want to delete this content item?"
            hx-target="#content-list"
            hx-swap="outerHTML"
            title="Delete"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      `
    }
  ];
  const tableData = {
    tableId: "content-table",
    columns: tableColumns,
    rows: data.contentItems,
    selectable: true,
    rowClickable: true,
    rowClickUrl: (row) => `/admin/content/${row.id}/edit${currentParams ? `?ref=${encodeURIComponent(currentParams)}` : ""}`,
    emptyMessage: "No content found. Create your first content item to get started."
  };
  const totalPages = Math.ceil(data.totalItems / data.itemsPerPage);
  const startItem = (data.page - 1) * data.itemsPerPage + 1;
  const endItem = Math.min(data.page * data.itemsPerPage, data.totalItems);
  const paginationData = {
    currentPage: data.page,
    totalPages,
    totalItems: data.totalItems,
    itemsPerPage: data.itemsPerPage,
    startItem,
    endItem,
    baseUrl: "/admin/content",
    queryParams: {
      model: data.modelName,
      status: data.status,
      ...data.search ? { search: data.search } : {}
    },
    showPageSizeSelector: true,
    pageSizeOptions: [10, 20, 50, 100]
  };
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Content Management</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage and organize your content items</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/content/new" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Content
          </a>
        </div>
      </div>
      <!-- Filters -->
      <div class="relative rounded-xl mb-6">
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20 rounded-xl"></div>

        <div class="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 rounded-xl">
          <div class="px-6 py-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <!-- Search Input -->
                <div>
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Search</label>
                  <form onsubmit="performContentSearch(event)" class="flex items-center space-x-2">
                    <div class="relative group">
                      <input
                        type="text"
                        name="search"
                        id="content-search-input"
                        value="${data.search || ""}"
                        oninput="toggleContentClearButton()"
                        placeholder="Search content..."
                        class="rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 pl-11 pr-10 text-sm w-72 text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-zinc-800 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                      >
                      <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                        <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                      </div>
                      <button
                        type="button"
                        id="clear-content-search"
                        onclick="clearContentSearch()"
                        class="${data.search ? "" : "hidden"} absolute right-3 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-400/20 dark:bg-zinc-500/20 hover:bg-zinc-400/30 dark:hover:bg-zinc-500/30 transition-colors"
                      >
                        <svg class="h-3 w-3 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <button
                      type="submit"
                      class="inline-flex items-center gap-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 text-white text-sm font-medium rounded-full hover:from-cyan-600 hover:to-blue-600 dark:hover:from-cyan-500 dark:hover:to-blue-500 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                      Search
                    </button>
                  </form>
                  <script>
                    function performContentSearch(event) {
                      event.preventDefault();
                      const searchInput = document.getElementById('content-search-input');
                      const value = searchInput.value.trim();
                      const params = new URLSearchParams(window.location.search);
                      if (value) {
                        params.set('search', value);
                      } else {
                        params.delete('search');
                      }
                      params.set('page', '1');
                      window.location.href = window.location.pathname + '?' + params.toString();
                    }

                    function clearContentSearch() {
                      const params = new URLSearchParams(window.location.search);
                      params.delete('search');
                      params.set('page', '1');
                      window.location.href = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                    }

                    function toggleContentClearButton() {
                      const searchInput = document.getElementById('content-search-input');
                      const clearButton = document.getElementById('clear-content-search');
                      if (searchInput.value.trim()) {
                        clearButton.classList.remove('hidden');
                      } else {
                        clearButton.classList.add('hidden');
                      }
                    }

                    function updateContentFilters(filterName, filterValue) {
                      const params = new URLSearchParams(window.location.search);
                      params.set(filterName, filterValue);
                      params.set('page', '1');
                      window.location.href = window.location.pathname + '?' + params.toString();
                    }

                    function clearAllFilters() {
                      window.location.href = window.location.pathname;
                    }
                  </script>
                </div>

                ${filterBarData.filters.map((filter) => {
    const selectedOption = filter.options.find((opt) => opt.selected);
    const selectedColor = selectedOption?.color || "cyan";
    const colorMap = {
      "cyan": "bg-cyan-400 dark:bg-cyan-400",
      "lime": "bg-lime-400 dark:bg-lime-400",
      "pink": "bg-pink-400 dark:bg-pink-400",
      "purple": "bg-purple-400 dark:bg-purple-400",
      "amber": "bg-amber-400 dark:bg-amber-400",
      "zinc": "bg-zinc-400 dark:bg-zinc-400"
    };
    return `
                  <div>
                    <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">${filter.label}</label>
                    <div class="mt-2 grid grid-cols-1">
                      <div class="col-start-1 row-start-1 flex items-center gap-3 pl-3 pr-8 pointer-events-none">
                        ${filter.name === "status" ? `<span class="inline-block size-2 shrink-0 rounded-full border border-transparent ${colorMap[selectedColor]}"></span>` : ""}
                      </div>
                      <select
                        name="${filter.name}"
                        onchange="updateContentFilters('${filter.name}', this.value)"
                        class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 ${filter.name === "status" ? "pl-8" : "pl-3"} pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-cyan-500/30 dark:outline-cyan-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-500 dark:focus-visible:outline-cyan-400 sm:text-sm/6 min-w-48"
                      >
                        ${filter.options.map((opt) => `
                          <option value="${opt.value}" ${opt.selected ? "selected" : ""}>${opt.label}</option>
                        `).join("")}
                      </select>
                      <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-cyan-600 dark:text-cyan-400 sm:size-4">
                        <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                `;
  }).join("")}

                <!-- Clear Filters Button -->
                ${hasActiveFilters ? `
                  <div>
                    <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">&nbsp;</label>
                    <button
                      onclick="clearAllFilters()"
                      class="inline-flex items-center gap-x-1.5 px-3 py-2 bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300 text-sm font-medium rounded-md ring-1 ring-inset ring-pink-600/20 dark:ring-pink-500/20 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Clear Filters
                    </button>
                  </div>
                ` : ""}
              </div>
              <div class="flex items-center gap-x-3">
                <span class="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm">${data.totalItems} ${data.totalItems === 1 ? "item" : "items"}</span>
                ${filterBarData.actions?.map((action) => `
                  <button
                    ${action.onclick ? `onclick="${action.onclick}"` : ""}
                    ${action.hxGet ? `hx-get="${action.hxGet}"` : ""}
                    ${action.hxTarget ? `hx-target="${action.hxTarget}"` : ""}
                    class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200"
                  >
                    ${action.label === "Refresh" ? `
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                      </svg>
                    ` : ""}
                    ${action.label}
                  </button>
                `).join("") || ""}
                ${filterBarData.bulkActions && filterBarData.bulkActions.length > 0 ? `
                  <div class="relative inline-block" id="bulk-actions-dropdown">
                    <button
                      id="bulk-actions-btn"
                      onclick="toggleBulkActionsDropdown()"
                      class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/60 backdrop-blur-sm text-zinc-400 dark:text-zinc-600 text-sm font-medium rounded-full ring-1 ring-inset ring-zinc-200/50 dark:ring-zinc-700/50 cursor-not-allowed"
                      disabled
                    >
                      Bulk Actions
                      <svg viewBox="0 0 20 20" fill="currentColor" class="size-4">
                        <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </button>

                    <div
                      id="bulk-actions-menu"
                      class="hidden absolute right-0 mt-2 w-56 origin-top-right divide-y divide-zinc-200 dark:divide-white/10 rounded-lg bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 z-50 transition-all duration-100 scale-95 opacity-0"
                      style="transition-behavior: allow-discrete;"
                    >
                      <div class="py-1">
                        <button
                          onclick="performBulkAction('publish')"
                          class="group/item flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" class="mr-3 size-5 text-zinc-400 dark:text-zinc-500 group-hover/item:text-zinc-950 dark:group-hover/item:text-white">
                            <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
                          </svg>
                          Publish Selected
                        </button>
                        <button
                          onclick="performBulkAction('draft')"
                          class="group/item flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white transition-colors"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" class="mr-3 size-5 text-zinc-400 dark:text-zinc-500 group-hover/item:text-zinc-950 dark:group-hover/item:text-white">
                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                          </svg>
                          Move to Draft
                        </button>
                      </div>
                      <div class="py-1">
                        <button
                          onclick="performBulkAction('delete')"
                          class="group/item flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" class="mr-3 size-5 text-zinc-400 dark:text-zinc-500 group-hover/item:text-red-600 dark:group-hover/item:text-red-400">
                            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" fill-rule="evenodd" />
                          </svg>
                          Delete Selected
                        </button>
                      </div>
                    </div>
                  </div>
                ` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Content List -->
      <div id="content-list">
        ${chunk3SPQ3J4N_cjs.renderTable(tableData)}
        ${chunk3SPQ3J4N_cjs.renderPagination(paginationData)}
      </div>
      
    </div>
    
    <!-- Modals -->
    <div id="bulk-actions-modal"></div>
    <div id="versions-modal"></div>
    
    <script>
      // Update bulk actions button state
      function updateBulkActionsButton() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"].row-checkbox');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const btn = document.getElementById('bulk-actions-btn');
        const menu = document.getElementById('bulk-actions-menu');

        if (!btn) return;

        if (checkedCount > 0) {
          btn.disabled = false;
          btn.className = 'inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200';
        } else {
          btn.disabled = true;
          btn.className = 'inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/60 backdrop-blur-sm text-zinc-400 dark:text-zinc-600 text-sm font-medium rounded-full ring-1 ring-inset ring-zinc-200/50 dark:ring-zinc-700/50 cursor-not-allowed';
          // Hide menu when no items selected
          if (menu) {
            menu.classList.remove('scale-100', 'opacity-100');
            menu.classList.add('scale-95', 'opacity-0', 'hidden');
          }
        }
      }

      // Select all functionality
      document.addEventListener('change', function(e) {
        if (e.target.id === 'select-all') {
          const checkboxes = document.querySelectorAll('.row-checkbox');
          checkboxes.forEach(cb => cb.checked = e.target.checked);
          updateBulkActionsButton();
        } else if (e.target.classList.contains('row-checkbox')) {
          updateBulkActionsButton();
        }
      });

      // Initialize button state on page load
      document.addEventListener('DOMContentLoaded', function() {
        updateBulkActionsButton();
      });

      // Toggle bulk actions dropdown
      function toggleBulkActionsDropdown() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"].row-checkbox');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

        if (checkedCount === 0) return;

        const menu = document.getElementById('bulk-actions-menu');
        const isHidden = menu.classList.contains('hidden');

        if (isHidden) {
          menu.classList.remove('hidden');
          setTimeout(() => {
            menu.classList.remove('scale-95', 'opacity-0');
            menu.classList.add('scale-100', 'opacity-100');
          }, 10);
        } else {
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            menu.classList.add('hidden');
          }, 100);
        }
      }

      // Close dropdown when clicking outside
      document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('bulk-actions-dropdown');
        const menu = document.getElementById('bulk-actions-menu');
        if (dropdown && menu && !dropdown.contains(e.target)) {
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            menu.classList.add('hidden');
          }, 100);
        }
      });

      // Store current bulk action context
      let currentBulkAction = null;
      let currentSelectedIds = [];

      // Perform bulk action
      function performBulkAction(action) {
        const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"].row-checkbox:checked'))
          .map(cb => cb.value)
          .filter(id => id);

        if (selectedIds.length === 0) {
          alert('Please select at least one item');
          return;
        }

        // Store context for confirmation
        currentBulkAction = action;
        currentSelectedIds = selectedIds;

        // Update dialog content based on action
        updateDialogContent(action, selectedIds.length);

        // Show confirmation dialog
        showConfirmDialog('bulk-action-confirm');
      }

      // Update dialog content dynamically
      function updateDialogContent(action, count) {
        const dialog = document.getElementById('bulk-action-confirm');
        const titleEl = dialog.querySelector('h3');
        const messageEl = dialog.querySelector('p');
        const confirmBtn = dialog.querySelector('.confirm-button');

        let title, message, btnText, btnClass;

        switch(action) {
          case 'delete':
            title = 'Confirm Bulk Delete';
            message = 'Are you sure you want to delete ' + count + ' selected item' + (count > 1 ? 's' : '') + '? This action cannot be undone.';
            btnText = 'Delete';
            btnClass = 'bg-red-500 hover:bg-red-400';
            break;
          case 'publish':
            title = 'Confirm Bulk Publish';
            message = 'Are you sure you want to publish ' + count + ' selected item' + (count > 1 ? 's' : '') + '? They will become publicly visible.';
            btnText = 'Publish';
            btnClass = 'bg-green-500 hover:bg-green-400';
            break;
          case 'draft':
            title = 'Confirm Bulk Draft';
            message = 'Are you sure you want to move ' + count + ' selected item' + (count > 1 ? 's' : '') + ' to draft status? They will be unpublished.';
            btnText = 'Move to Draft';
            btnClass = 'bg-blue-500 hover:bg-blue-400';
            break;
          default:
            title = 'Confirm Bulk Action';
            message = 'Are you sure you want to perform this action on ' + count + ' selected item' + (count > 1 ? 's' : '') + '?';
            btnText = 'Confirm';
            btnClass = 'bg-blue-500 hover:bg-blue-400';
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = btnText;
        confirmBtn.className = confirmBtn.className.replace(/bg-w+-d+s+hover:bg-w+-d+/, btnClass);
      }

      // Execute the bulk action after confirmation
      function executeBulkAction() {
        if (!currentBulkAction || currentSelectedIds.length === 0) return;

        // Close dropdown
        const menu = document.getElementById('bulk-actions-menu');
        menu.classList.add('hidden');

        fetch('/admin/content/bulk-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: currentBulkAction,
            ids: currentSelectedIds
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert('Error: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(err => {
          console.error('Bulk action error:', err);
          alert('Failed to perform bulk action');
        })
        .finally(() => {
          // Clear context
          currentBulkAction = null;
          currentSelectedIds = [];
        });
      }

      // Helper to get action text for display
      function getActionText(action) {
        const actionCount = currentSelectedIds.length;
        switch(action) {
          case 'publish':
            return \`publish \${actionCount} item\${actionCount > 1 ? 's' : ''}\`;
          case 'draft':
            return \`move \${actionCount} item\${actionCount > 1 ? 's' : ''} to draft\`;
          case 'delete':
            return \`delete \${actionCount} item\${actionCount > 1 ? 's' : ''}\`;
          default:
            return \`perform action on \${actionCount} item\${actionCount > 1 ? 's' : ''}\`;
        }
      }

    </script>

    <!-- Confirmation Dialog for Bulk Actions -->
    ${chunk3SPQ3J4N_cjs.renderConfirmationDialog({
    id: "bulk-action-confirm",
    title: "Confirm Bulk Action",
    message: "Are you sure you want to perform this action? This operation will affect multiple items.",
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmClass: "bg-blue-500 hover:bg-blue-400",
    iconColor: "blue",
    onConfirm: "executeBulkAction()"
  })}

    <!-- Confirmation Dialog Script -->
    ${chunk3SPQ3J4N_cjs.getConfirmationDialogScript()}
  `;
  const layoutData = {
    title: "Content Management",
    pageTitle: "Content Management",
    currentPath: "/admin/content",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/components/version-history.template.ts
function renderVersionHistory(data) {
  return `
    <div class="version-history-modal">
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <!-- Header -->
        <div class="relative px-6 py-4 border-b border-white/10">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
          <div class="relative flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">Version History</h3>
            <button onclick="closeVersionHistory()" class="text-gray-300 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Versions List -->
        <div class="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div class="p-6 space-y-4">
            ${data.versions.map((version, index) => `
              <div class="version-item backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 ${version.is_current ? "ring-2 ring-blue-500/50" : ""}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center space-x-3">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${version.is_current ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-gray-300"}">
                      Version ${version.version}${version.is_current ? " (Current)" : ""}
                    </span>
                    <span class="text-sm text-gray-300">
                      ${new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div class="flex items-center space-x-2">
                    ${!version.is_current ? `
                      <button 
                        onclick="restoreVersion('${data.contentId}', ${version.version})"
                        class="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 transition-all"
                      >
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                        </svg>
                        Restore
                      </button>
                    ` : ""}
                    <button 
                      onclick="previewVersion('${data.contentId}', ${version.version})"
                      class="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-all"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Preview
                    </button>
                  </div>
                </div>
                
                <!-- Version Summary -->
                <div class="version-summary text-sm">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span class="text-gray-400">Title:</span>
                      <span class="text-white ml-2">${escapeHtml3(version.data?.title || "Untitled")}</span>
                    </div>
                    <div>
                      <span class="text-gray-400">Author:</span>
                      <span class="text-white ml-2">${escapeHtml3(version.author_name || "Unknown")}</span>
                    </div>
                    ${version.data?.excerpt ? `
                      <div class="md:col-span-2">
                        <span class="text-gray-400">Excerpt:</span>
                        <p class="text-white mt-1 text-xs">${escapeHtml3(version.data.excerpt.substring(0, 200))}${version.data.excerpt.length > 200 ? "..." : ""}</p>
                      </div>
                    ` : ""}
                  </div>
                </div>
                
                <!-- Changes Summary (if not current) -->
                ${!version.is_current && index < data.versions.length - 1 ? `
                  <div class="mt-3 pt-3 border-t border-white/10">
                    <button 
                      onclick="toggleChanges('changes-${version.version}')"
                      class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
                      </svg>
                      View Changes
                    </button>
                    <div id="changes-${version.version}" class="hidden mt-2 text-xs text-gray-300">
                      <em>Change detection coming soon...</em>
                    </div>
                  </div>
                ` : ""}
              </div>
            `).join("")}
          </div>
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-4 border-t border-white/10 bg-white/5">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-400">
              ${data.versions.length} version${data.versions.length !== 1 ? "s" : ""} total
            </span>
            <button 
              onclick="closeVersionHistory()"
              class="px-4 py-2 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      function closeVersionHistory() {
        document.querySelector('.version-history-modal').closest('.fixed').remove();
      }
      
      function restoreVersion(contentId, version) {
        if (confirm(\`Are you sure you want to restore to version \${version}? This will create a new version with the restored content.\`)) {
          fetch(\`/admin/content/\${contentId}/restore/\${version}\`, {
            method: 'POST'
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              showNotification('Version restored successfully! Refreshing page...', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 1500);
            } else {
              showNotification('Failed to restore version', 'error');
            }
          })
          .catch(error => {
            console.error('Error restoring version:', error);
            showNotification('Error restoring version', 'error');
          });
        }
      }
      
      function previewVersion(contentId, version) {
        const preview = window.open('', '_blank');
        preview.document.write('<p>Loading version preview...</p>');
        
        fetch(\`/admin/content/\${contentId}/version/\${version}/preview\`)
        .then(response => response.text())
        .then(html => {
          preview.document.open();
          preview.document.write(html);
          preview.document.close();
        })
        .catch(error => {
          preview.document.write('<p>Error loading preview</p>');
        });
      }
      
      function toggleChanges(elementId) {
        const element = document.getElementById(elementId);
        element.classList.toggle('hidden');
      }
    </script>
  `;
}
function escapeHtml3(text) {
  if (typeof text !== "string") return String(text || "");
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char] || char);
}

// src/middleware/plugin-middleware.ts
var isPluginActive2 = () => false;

// src/routes/admin-content.ts
var adminContentRoutes = new hono.Hono();
adminContentRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
async function getCollectionFields(db, collectionId) {
  const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.collection);
  return cache.getOrSet(
    cache.generateKey("fields", collectionId),
    async () => {
      const stmt = db.prepare(`
        SELECT * FROM content_fields
        WHERE collection_id = ?
        ORDER BY field_order ASC
      `);
      const { results } = await stmt.bind(collectionId).all();
      return (results || []).map((row) => ({
        id: row.id,
        field_name: row.field_name,
        field_type: row.field_type,
        field_label: row.field_label,
        field_options: row.field_options ? JSON.parse(row.field_options) : {},
        field_order: row.field_order,
        is_required: row.is_required === 1,
        is_searchable: row.is_searchable === 1
      }));
    }
  );
}
async function getCollection(db, collectionId) {
  const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.collection);
  return cache.getOrSet(
    cache.generateKey("collection", collectionId),
    async () => {
      const stmt = db.prepare("SELECT * FROM collections WHERE id = ? AND is_active = 1");
      const collection = await stmt.bind(collectionId).first();
      if (!collection) return null;
      return {
        id: collection.id,
        name: collection.name,
        display_name: collection.display_name,
        description: collection.description,
        schema: collection.schema ? JSON.parse(collection.schema) : {}
      };
    }
  );
}
adminContentRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const url = new URL(c.req.url);
    const db = c.env.DB;
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const modelName = url.searchParams.get("model") || "all";
    const status = url.searchParams.get("status") || "all";
    const search = url.searchParams.get("search") || "";
    const offset = (page - 1) * limit;
    const collectionsStmt = db.prepare("SELECT id, name, display_name FROM collections WHERE is_active = 1 ORDER BY display_name");
    const { results: collectionsResults } = await collectionsStmt.all();
    const models = (collectionsResults || []).map((row) => ({
      name: row.name,
      displayName: row.display_name
    }));
    const conditions = [];
    const params = [];
    if (status !== "deleted") {
      conditions.push("c.status != 'deleted'");
    }
    if (search) {
      conditions.push("(c.title LIKE ? OR c.slug LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (modelName !== "all") {
      conditions.push("col.name = ?");
      params.push(modelName);
    }
    if (status !== "all" && status !== "deleted") {
      conditions.push("c.status = ?");
      params.push(status);
    } else if (status === "deleted") {
      conditions.push("c.status = 'deleted'");
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM content c
      JOIN collections col ON c.collection_id = col.id
      ${whereClause}
    `);
    const countResult = await countStmt.bind(...params).first();
    const totalItems = countResult?.count || 0;
    const contentStmt = db.prepare(`
      SELECT c.id, c.title, c.slug, c.status, c.created_at, c.updated_at,
             col.name as collection_name, col.display_name as collection_display_name,
             u.first_name, u.last_name, u.email as author_email
      FROM content c
      JOIN collections col ON c.collection_id = col.id
      LEFT JOIN users u ON c.author_id = u.id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const { results } = await contentStmt.bind(...params, limit, offset).all();
    const contentItems = (results || []).map((row) => {
      const statusConfig = {
        draft: {
          class: "bg-zinc-50 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 ring-1 ring-inset ring-zinc-600/20 dark:ring-zinc-500/20",
          text: "Draft"
        },
        review: {
          class: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-500/20",
          text: "Under Review"
        },
        scheduled: {
          class: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/20",
          text: "Scheduled"
        },
        published: {
          class: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20",
          text: "Published"
        },
        archived: {
          class: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20 dark:ring-purple-500/20",
          text: "Archived"
        },
        deleted: {
          class: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20",
          text: "Deleted"
        }
      };
      const config = statusConfig[row.status] || statusConfig.draft;
      const statusBadge = `
        <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${config?.class || ""}">
          ${config?.text || row.status}
        </span>
      `;
      const authorName = row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.author_email || "Unknown";
      const formattedDate = new Date(row.updated_at).toLocaleDateString();
      const availableActions = [];
      switch (row.status) {
        case "draft":
          availableActions.push("submit_for_review", "publish");
          break;
        case "review":
          availableActions.push("approve", "request_changes");
          break;
        case "published":
          availableActions.push("unpublish", "archive");
          break;
        case "scheduled":
          availableActions.push("unschedule");
          break;
      }
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        modelName: row.collection_display_name,
        statusBadge,
        authorName,
        formattedDate,
        availableActions
      };
    });
    const pageData = {
      modelName,
      status,
      page,
      search,
      models,
      contentItems,
      totalItems,
      itemsPerPage: limit,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      version: c.get("appVersion")
    };
    return c.html(renderContentListPage(pageData));
  } catch (error) {
    console.error("Error fetching content list:", error);
    return c.html(`<p>Error loading content: ${error}</p>`);
  }
});
adminContentRoutes.get("/new", async (c) => {
  try {
    const user = c.get("user");
    const url = new URL(c.req.url);
    const collectionId = url.searchParams.get("collection");
    if (!collectionId) {
      const db2 = c.env.DB;
      const collectionsStmt = db2.prepare("SELECT id, name, display_name, description FROM collections WHERE is_active = 1 ORDER BY display_name");
      const { results } = await collectionsStmt.all();
      const collections = (results || []).map((row) => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description
      }));
      const selectionHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Select Collection - SonicJS AI Admin</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-900 text-white">
          <div class="min-h-screen flex items-center justify-center">
            <div class="max-w-2xl w-full mx-auto p-8">
              <h1 class="text-3xl font-bold mb-8 text-center">Create New Content</h1>
              <p class="text-gray-300 text-center mb-8">Select a collection to create content in:</p>
              
              <div class="grid gap-4">
                ${collections.map((collection2) => `
                  <a href="/admin/content/new?collection=${collection2.id}" 
                     class="block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700">
                    <h3 class="text-xl font-semibold mb-2">${collection2.display_name}</h3>
                    <p class="text-gray-400">${collection2.description || "No description"}</p>
                  </a>
                `).join("")}
              </div>
              
              <div class="mt-8 text-center">
                <a href="/admin/content" class="text-blue-400 hover:text-blue-300">\u2190 Back to Content List</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      return c.html(selectionHTML);
    }
    const db = c.env.DB;
    const collection = await getCollection(db, collectionId);
    if (!collection) {
      const formData2 = {
        collection: { id: "", name: "", display_name: "Unknown", schema: {} },
        fields: [],
        error: "Collection not found.",
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0
      };
      return c.html(renderContentFormPage(formData2));
    }
    const fields = await getCollectionFields(db, collectionId);
    const workflowEnabled = await isPluginActive2(db, "workflow");
    const formData = {
      collection,
      fields,
      isEdit: false,
      workflowEnabled,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    };
    return c.html(renderContentFormPage(formData));
  } catch (error) {
    console.error("Error loading new content form:", error);
    const formData = {
      collection: { id: "", name: "", display_name: "Unknown", schema: {} },
      fields: [],
      error: "Failed to load content form.",
      user: c.get("user") ? {
        name: c.get("user").email,
        email: c.get("user").email,
        role: c.get("user").role
      } : void 0
    };
    return c.html(renderContentFormPage(formData));
  }
});
adminContentRoutes.get("/:id/edit", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const db = c.env.DB;
    const url = new URL(c.req.url);
    const referrerParams = url.searchParams.get("ref") || "";
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.content);
    const content = await cache.getOrSet(
      cache.generateKey("content", id),
      async () => {
        const contentStmt = db.prepare(`
          SELECT c.*, col.id as collection_id, col.name as collection_name,
                 col.display_name as collection_display_name, col.description as collection_description,
                 col.schema as collection_schema
          FROM content c
          JOIN collections col ON c.collection_id = col.id
          WHERE c.id = ?
        `);
        return await contentStmt.bind(id).first();
      }
    );
    if (!content) {
      const formData2 = {
        collection: { id: "", name: "", display_name: "Unknown", schema: {} },
        fields: [],
        error: "Content not found.",
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0
      };
      return c.html(renderContentFormPage(formData2));
    }
    const collection = {
      id: content.collection_id,
      name: content.collection_name,
      display_name: content.collection_display_name,
      description: content.collection_description,
      schema: content.collection_schema ? JSON.parse(content.collection_schema) : {}
    };
    const fields = await getCollectionFields(db, content.collection_id);
    const contentData = content.data ? JSON.parse(content.data) : {};
    const workflowEnabled = await isPluginActive2(db, "workflow");
    const formData = {
      id: content.id,
      title: content.title,
      slug: content.slug,
      data: contentData,
      status: content.status,
      scheduled_publish_at: content.scheduled_publish_at,
      scheduled_unpublish_at: content.scheduled_unpublish_at,
      review_status: content.review_status,
      meta_title: content.meta_title,
      meta_description: content.meta_description,
      collection,
      fields,
      isEdit: true,
      workflowEnabled,
      referrerParams,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      version: c.get("appVersion")
    };
    return c.html(renderContentFormPage(formData));
  } catch (error) {
    console.error("Error loading edit content form:", error);
    const formData = {
      collection: { id: "", name: "", display_name: "Unknown", schema: {} },
      fields: [],
      error: "Failed to load content for editing.",
      user: c.get("user") ? {
        name: c.get("user").email,
        email: c.get("user").email,
        role: c.get("user").role
      } : void 0
    };
    return c.html(renderContentFormPage(formData));
  }
});
adminContentRoutes.post("/", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const collectionId = formData.get("collection_id");
    const action = formData.get("action");
    if (!collectionId) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection ID is required.
        </div>
      `);
    }
    const db = c.env.DB;
    const collection = await getCollection(db, collectionId);
    if (!collection) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection not found.
        </div>
      `);
    }
    const fields = await getCollectionFields(db, collectionId);
    const data = {};
    const errors = {};
    for (const field of fields) {
      const value = formData.get(field.field_name);
      if (field.field_type === "guid") {
        const options = field.field_options || {};
        if (options.autoGenerate) {
          data[field.field_name] = crypto.randomUUID();
          continue;
        }
      }
      if (field.is_required && (!value || value.toString().trim() === "")) {
        errors[field.field_name] = [`${field.field_label} is required`];
        continue;
      }
      switch (field.field_type) {
        case "number":
          if (value && isNaN(Number(value))) {
            errors[field.field_name] = [`${field.field_label} must be a valid number`];
          } else {
            data[field.field_name] = value ? Number(value) : null;
          }
          break;
        case "boolean":
          data[field.field_name] = formData.get(`${field.field_name}_submitted`) ? value === "true" : false;
          break;
        case "select":
          if (field.field_options?.multiple) {
            data[field.field_name] = formData.getAll(`${field.field_name}[]`);
          } else {
            data[field.field_name] = value;
          }
          break;
        case "guid":
          data[field.field_name] = value || null;
          break;
        default:
          data[field.field_name] = value;
      }
    }
    if (Object.keys(errors).length > 0) {
      const formDataWithErrors = {
        collection,
        fields,
        data,
        validationErrors: errors,
        error: "Please fix the validation errors below.",
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0
      };
      return c.html(renderContentFormPage(formDataWithErrors));
    }
    let slug = data.slug || data.title;
    if (slug) {
      slug = slug.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim("-");
    }
    let status = formData.get("status") || "draft";
    if (action === "save_and_publish") {
      status = "published";
    }
    const scheduledPublishAt = formData.get("scheduled_publish_at");
    const scheduledUnpublishAt = formData.get("scheduled_unpublish_at");
    const contentId = crypto.randomUUID();
    const now = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO content (
        id, collection_id, slug, title, data, status, 
        scheduled_publish_at, scheduled_unpublish_at,
        meta_title, meta_description, author_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertStmt.bind(
      contentId,
      collectionId,
      slug,
      data.title || "Untitled",
      JSON.stringify(data),
      status,
      scheduledPublishAt ? new Date(scheduledPublishAt).getTime() : null,
      scheduledUnpublishAt ? new Date(scheduledUnpublishAt).getTime() : null,
      data.meta_title || null,
      data.meta_description || null,
      user?.userId || "unknown",
      now,
      now
    ).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.content);
    await cache.invalidate(`content:list:${collectionId}:*`);
    const versionStmt = db.prepare(`
      INSERT INTO content_versions (id, content_id, version, data, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await versionStmt.bind(
      crypto.randomUUID(),
      contentId,
      1,
      JSON.stringify(data),
      user?.userId || "unknown",
      now
    ).run();
    const workflowStmt = db.prepare(`
      INSERT INTO workflow_history (id, content_id, action, from_status, to_status, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    await workflowStmt.bind(
      crypto.randomUUID(),
      contentId,
      "created",
      "none",
      status,
      user?.userId || "unknown",
      now
    ).run();
    const referrerParams = formData.get("referrer_params");
    const redirectUrl = action === "save_and_continue" ? `/admin/content/${contentId}/edit?success=Content saved successfully!${referrerParams ? `&ref=${encodeURIComponent(referrerParams)}` : ""}` : referrerParams ? `/admin/content?${referrerParams}&success=Content created successfully!` : `/admin/content?collection=${collectionId}&success=Content created successfully!`;
    const isHTMX = c.req.header("HX-Request") === "true";
    if (isHTMX) {
      return c.text("", 200, {
        "HX-Redirect": redirectUrl
      });
    } else {
      return c.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("Error creating content:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to create content. Please try again.
      </div>
    `);
  }
});
adminContentRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const formData = await c.req.formData();
    const action = formData.get("action");
    const db = c.env.DB;
    const contentStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const existingContent = await contentStmt.bind(id).first();
    if (!existingContent) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Content not found.
        </div>
      `);
    }
    const collection = await getCollection(db, existingContent.collection_id);
    if (!collection) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Collection not found.
        </div>
      `);
    }
    const fields = await getCollectionFields(db, existingContent.collection_id);
    const data = {};
    const errors = {};
    for (const field of fields) {
      const value = formData.get(field.field_name);
      if (field.is_required && (!value || value.toString().trim() === "")) {
        errors[field.field_name] = [`${field.field_label} is required`];
        continue;
      }
      switch (field.field_type) {
        case "number":
          if (value && isNaN(Number(value))) {
            errors[field.field_name] = [`${field.field_label} must be a valid number`];
          } else {
            data[field.field_name] = value ? Number(value) : null;
          }
          break;
        case "boolean":
          data[field.field_name] = formData.get(`${field.field_name}_submitted`) ? value === "true" : false;
          break;
        case "select":
          if (field.field_options?.multiple) {
            data[field.field_name] = formData.getAll(`${field.field_name}[]`);
          } else {
            data[field.field_name] = value;
          }
          break;
        default:
          data[field.field_name] = value;
      }
    }
    if (Object.keys(errors).length > 0) {
      const formDataWithErrors = {
        id,
        collection,
        fields,
        data,
        validationErrors: errors,
        error: "Please fix the validation errors below.",
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0
      };
      return c.html(renderContentFormPage(formDataWithErrors));
    }
    let slug = data.slug || data.title;
    if (slug) {
      slug = slug.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim("-");
    }
    let status = formData.get("status") || existingContent.status;
    if (action === "save_and_publish") {
      status = "published";
    }
    const scheduledPublishAt = formData.get("scheduled_publish_at");
    const scheduledUnpublishAt = formData.get("scheduled_unpublish_at");
    const now = Date.now();
    const updateStmt = db.prepare(`
      UPDATE content SET
        slug = ?, title = ?, data = ?, status = ?,
        scheduled_publish_at = ?, scheduled_unpublish_at = ?,
        meta_title = ?, meta_description = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      slug,
      data.title || "Untitled",
      JSON.stringify(data),
      status,
      scheduledPublishAt ? new Date(scheduledPublishAt).getTime() : null,
      scheduledUnpublishAt ? new Date(scheduledUnpublishAt).getTime() : null,
      data.meta_title || null,
      data.meta_description || null,
      now,
      id
    ).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.content);
    await cache.delete(cache.generateKey("content", id));
    await cache.invalidate(`content:list:${existingContent.collection_id}:*`);
    const existingData = JSON.parse(existingContent.data || "{}");
    if (JSON.stringify(existingData) !== JSON.stringify(data)) {
      const versionCountStmt = db.prepare("SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?");
      const versionResult = await versionCountStmt.bind(id).first();
      const nextVersion = (versionResult?.max_version || 0) + 1;
      const versionStmt = db.prepare(`
        INSERT INTO content_versions (id, content_id, version, data, author_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await versionStmt.bind(
        crypto.randomUUID(),
        id,
        nextVersion,
        JSON.stringify(data),
        user?.userId || "unknown",
        now
      ).run();
    }
    if (status !== existingContent.status) {
      const workflowStmt = db.prepare(`
        INSERT INTO workflow_history (id, content_id, action, from_status, to_status, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      await workflowStmt.bind(
        crypto.randomUUID(),
        id,
        "status_changed",
        existingContent.status,
        status,
        user?.userId || "unknown",
        now
      ).run();
    }
    const referrerParams = formData.get("referrer_params");
    const redirectUrl = action === "save_and_continue" ? `/admin/content/${id}/edit?success=Content updated successfully!${referrerParams ? `&ref=${encodeURIComponent(referrerParams)}` : ""}` : referrerParams ? `/admin/content?${referrerParams}&success=Content updated successfully!` : `/admin/content?collection=${existingContent.collection_id}&success=Content updated successfully!`;
    const isHTMX = c.req.header("HX-Request") === "true";
    if (isHTMX) {
      return c.text("", 200, {
        "HX-Redirect": redirectUrl
      });
    } else {
      return c.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("Error updating content:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to update content. Please try again.
      </div>
    `);
  }
});
adminContentRoutes.post("/preview", async (c) => {
  try {
    const formData = await c.req.formData();
    const collectionId = formData.get("collection_id");
    const db = c.env.DB;
    const collection = await getCollection(db, collectionId);
    if (!collection) {
      return c.html("<p>Collection not found</p>");
    }
    const fields = await getCollectionFields(db, collectionId);
    const data = {};
    for (const field of fields) {
      const value = formData.get(field.field_name);
      switch (field.field_type) {
        case "number":
          data[field.field_name] = value ? Number(value) : null;
          break;
        case "boolean":
          data[field.field_name] = value === "true";
          break;
        case "select":
          if (field.field_options?.multiple) {
            data[field.field_name] = formData.getAll(`${field.field_name}[]`);
          } else {
            data[field.field_name] = value;
          }
          break;
        default:
          data[field.field_name] = value;
      }
    }
    const previewHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview: ${data.title || "Untitled"}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
          .content { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${data.title || "Untitled"}</h1>
        <div class="meta">
          <strong>Collection:</strong> ${collection.display_name}<br>
          <strong>Status:</strong> ${formData.get("status") || "draft"}<br>
          ${data.meta_description ? `<strong>Description:</strong> ${data.meta_description}<br>` : ""}
        </div>
        <div class="content">
          ${data.content || "<p>No content provided.</p>"}
        </div>
        
        <h3>All Fields:</h3>
        <table border="1" style="border-collapse: collapse; width: 100%;">
          <tr><th>Field</th><th>Value</th></tr>
          ${fields.map((field) => `
            <tr>
              <td><strong>${field.field_label}</strong></td>
              <td>${data[field.field_name] || "<em>empty</em>"}</td>
            </tr>
          `).join("")}
        </table>
      </body>
      </html>
    `;
    return c.html(previewHTML);
  } catch (error) {
    console.error("Error generating preview:", error);
    return c.html("<p>Error generating preview</p>");
  }
});
adminContentRoutes.post("/duplicate", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const originalId = formData.get("id");
    if (!originalId) {
      return c.json({ success: false, error: "Content ID required" });
    }
    const db = c.env.DB;
    const contentStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const original = await contentStmt.bind(originalId).first();
    if (!original) {
      return c.json({ success: false, error: "Content not found" });
    }
    const newId = crypto.randomUUID();
    const now = Date.now();
    const originalData = JSON.parse(original.data || "{}");
    originalData.title = `${originalData.title || "Untitled"} (Copy)`;
    const insertStmt = db.prepare(`
      INSERT INTO content (
        id, collection_id, slug, title, data, status, 
        author_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertStmt.bind(
      newId,
      original.collection_id,
      `${original.slug}-copy-${Date.now()}`,
      originalData.title,
      JSON.stringify(originalData),
      "draft",
      // Always start as draft
      user?.userId || "unknown",
      now,
      now
    ).run();
    return c.json({ success: true, id: newId });
  } catch (error) {
    console.error("Error duplicating content:", error);
    return c.json({ success: false, error: "Failed to duplicate content" });
  }
});
adminContentRoutes.get("/bulk-actions", async (c) => {
  const bulkActionsModal = `
    <div class="fixed inset-0 bg-zinc-950/50 dark:bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="this.remove()">
      <div class="bg-white dark:bg-zinc-900 rounded-xl shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 max-w-md w-full" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Bulk Actions</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Select items from the table below to perform bulk actions.
        </p>
        <div class="space-y-2">
          <button
            onclick="performBulkAction('publish')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-lime-600 dark:bg-lime-500 text-white rounded-lg hover:bg-lime-700 dark:hover:bg-lime-600 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Publish Selected
          </button>
          <button
            onclick="performBulkAction('draft')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-600 dark:bg-zinc-700 text-white rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
            </svg>
            Move to Draft
          </button>
          <button
            onclick="performBulkAction('delete')"
            class="w-full inline-flex items-center justify-center gap-x-2 px-4 py-2.5 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete Selected
          </button>
        </div>
      </div>
    </div>
    <script>
      function performBulkAction(action) {
        const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"].row-checkbox:checked'))
          .map(cb => cb.value)
          .filter(id => id)

        if (selectedIds.length === 0) {
          alert('Please select at least one item')
          return
        }

        const actionText = action === 'publish' ? 'publish' : action === 'draft' ? 'move to draft' : 'delete'
        const confirmed = confirm(\`Are you sure you want to \${actionText} \${selectedIds.length} item(s)?\`)

        if (!confirmed) return

        fetch('/admin/content/bulk-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: action,
            ids: selectedIds
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            document.querySelector('#bulk-actions-modal .fixed').remove()
            location.reload()
          } else {
            alert('Error: ' + (data.error || 'Unknown error'))
          }
        })
        .catch(err => {
          console.error('Bulk action error:', err)
          alert('Failed to perform bulk action')
        })
      }
    </script>
  `;
  return c.html(bulkActionsModal);
});
adminContentRoutes.post("/bulk-action", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { action, ids } = body;
    if (!action || !ids || ids.length === 0) {
      return c.json({ success: false, error: "Action and IDs required" });
    }
    const db = c.env.DB;
    const now = Date.now();
    if (action === "delete") {
      const placeholders = ids.map(() => "?").join(",");
      const stmt = db.prepare(`
        UPDATE content
        SET status = 'deleted', updated_at = ?
        WHERE id IN (${placeholders})
      `);
      await stmt.bind(now, ...ids).run();
    } else if (action === "publish" || action === "draft") {
      const placeholders = ids.map(() => "?").join(",");
      const publishedAt = action === "publish" ? now : null;
      const stmt = db.prepare(`
        UPDATE content
        SET status = ?, published_at = ?, updated_at = ?
        WHERE id IN (${placeholders})
      `);
      await stmt.bind(action, publishedAt, now, ...ids).run();
    } else {
      return c.json({ success: false, error: "Invalid action" });
    }
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.content);
    for (const contentId of ids) {
      await cache.delete(cache.generateKey("content", contentId));
    }
    await cache.invalidate("content:list:*");
    return c.json({ success: true, count: ids.length });
  } catch (error) {
    console.error("Bulk action error:", error);
    return c.json({ success: false, error: "Failed to perform bulk action" });
  }
});
adminContentRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const user = c.get("user");
    const contentStmt = db.prepare("SELECT id, title FROM content WHERE id = ?");
    const content = await contentStmt.bind(id).first();
    if (!content) {
      return c.json({ success: false, error: "Content not found" }, 404);
    }
    const now = Date.now();
    const deleteStmt = db.prepare(`
      UPDATE content
      SET status = 'deleted', updated_at = ?
      WHERE id = ?
    `);
    await deleteStmt.bind(now, id).run();
    const cache = chunk3NVJ6W27_cjs.getCacheService(chunk3NVJ6W27_cjs.CACHE_CONFIGS.content);
    await cache.delete(cache.generateKey("content", id));
    await cache.invalidate("content:list:*");
    return c.html(`
      <div id="content-list" hx-get="/admin/content?model=${c.req.query("model") || "post"}" hx-trigger="load" hx-swap="outerHTML">
        <div class="flex items-center justify-center p-8">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-lime-500 dark:text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Content deleted successfully. Refreshing...</p>
          </div>
        </div>
      </div>
    `);
  } catch (error) {
    console.error("Delete content error:", error);
    return c.json({ success: false, error: "Failed to delete content" }, 500);
  }
});
adminContentRoutes.get("/:id/versions", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const contentStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const content = await contentStmt.bind(id).first();
    if (!content) {
      return c.html("<p>Content not found</p>");
    }
    const versionsStmt = db.prepare(`
      SELECT cv.*, u.first_name, u.last_name, u.email
      FROM content_versions cv
      LEFT JOIN users u ON cv.author_id = u.id
      WHERE cv.content_id = ?
      ORDER BY cv.version DESC
    `);
    const { results } = await versionsStmt.bind(id).all();
    const versions = (results || []).map((row) => ({
      id: row.id,
      version: row.version,
      data: JSON.parse(row.data || "{}"),
      author_id: row.author_id,
      author_name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.email,
      created_at: row.created_at,
      is_current: false
      // Will be set below
    }));
    if (versions.length > 0) {
      versions[0].is_current = true;
    }
    const data = {
      contentId: id,
      versions,
      currentVersion: versions.length > 0 ? versions[0].version : 1
    };
    return c.html(renderVersionHistory(data));
  } catch (error) {
    console.error("Error loading version history:", error);
    return c.html("<p>Error loading version history</p>");
  }
});
adminContentRoutes.post("/:id/restore/:version", async (c) => {
  try {
    const id = c.req.param("id");
    const version = parseInt(c.req.param("version"));
    const user = c.get("user");
    const db = c.env.DB;
    const versionStmt = db.prepare(`
      SELECT * FROM content_versions 
      WHERE content_id = ? AND version = ?
    `);
    const versionData = await versionStmt.bind(id, version).first();
    if (!versionData) {
      return c.json({ success: false, error: "Version not found" });
    }
    const contentStmt = db.prepare("SELECT * FROM content WHERE id = ?");
    const currentContent = await contentStmt.bind(id).first();
    if (!currentContent) {
      return c.json({ success: false, error: "Content not found" });
    }
    const restoredData = JSON.parse(versionData.data);
    const now = Date.now();
    const updateStmt = db.prepare(`
      UPDATE content SET
        title = ?, data = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      restoredData.title || "Untitled",
      versionData.data,
      now,
      id
    ).run();
    const nextVersionStmt = db.prepare("SELECT MAX(version) as max_version FROM content_versions WHERE content_id = ?");
    const nextVersionResult = await nextVersionStmt.bind(id).first();
    const nextVersion = (nextVersionResult?.max_version || 0) + 1;
    const newVersionStmt = db.prepare(`
      INSERT INTO content_versions (id, content_id, version, data, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await newVersionStmt.bind(
      crypto.randomUUID(),
      id,
      nextVersion,
      versionData.data,
      user?.userId || "unknown",
      now
    ).run();
    const workflowStmt = db.prepare(`
      INSERT INTO workflow_history (id, content_id, action, from_status, to_status, user_id, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await workflowStmt.bind(
      crypto.randomUUID(),
      id,
      "version_restored",
      currentContent.status,
      currentContent.status,
      user?.userId || "unknown",
      `Restored to version ${version}`,
      now
    ).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error restoring version:", error);
    return c.json({ success: false, error: "Failed to restore version" });
  }
});
adminContentRoutes.get("/:id/version/:version/preview", async (c) => {
  try {
    const id = c.req.param("id");
    const version = parseInt(c.req.param("version"));
    const db = c.env.DB;
    const versionStmt = db.prepare(`
      SELECT cv.*, c.collection_id, col.display_name as collection_name
      FROM content_versions cv
      JOIN content c ON cv.content_id = c.id
      JOIN collections col ON c.collection_id = col.id
      WHERE cv.content_id = ? AND cv.version = ?
    `);
    const versionData = await versionStmt.bind(id, version).first();
    if (!versionData) {
      return c.html("<p>Version not found</p>");
    }
    const data = JSON.parse(versionData.data || "{}");
    const previewHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Version ${version} Preview: ${data.title || "Untitled"}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .meta { color: #666; font-size: 14px; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
          .content { line-height: 1.6; }
          .version-badge { background: #007cba; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="meta">
          <span class="version-badge">Version ${version}</span>
          <strong>Collection:</strong> ${versionData.collection_name}<br>
          <strong>Created:</strong> ${new Date(versionData.created_at).toLocaleString()}<br>
          <em>This is a historical version preview</em>
        </div>
        
        <h1>${data.title || "Untitled"}</h1>
        
        <div class="content">
          ${data.content || "<p>No content provided.</p>"}
        </div>
        
        ${data.excerpt ? `<h3>Excerpt:</h3><p>${data.excerpt}</p>` : ""}
        
        <h3>All Field Data:</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(data, null, 2)}
        </pre>
      </body>
      </html>
    `;
    return c.html(previewHTML);
  } catch (error) {
    console.error("Error generating version preview:", error);
    return c.html("<p>Error generating preview</p>");
  }
});
var admin_content_default = adminContentRoutes;

// src/templates/pages/admin-profile.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderProfilePage(data) {
  const pageContent = `
    <div class="space-y-8">
      <!-- Header -->
      <div class="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">User Profile</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <!-- Alert Messages -->
      ${data.error ? chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error, dismissible: true }) : ""}
      ${data.success ? chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.success, dismissible: true }) : ""}

      <!-- Profile Form -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Profile Form -->
        <div class="lg:col-span-2">
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
            <!-- Form Header -->
            <div class="px-6 py-5 border-b border-zinc-950/5 dark:border-white/5">
              <div class="flex items-center gap-x-3">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-white">
                  <svg class="h-5 w-5 text-white dark:text-zinc-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-base font-semibold text-zinc-950 dark:text-white">Profile Information</h2>
                  <p class="text-sm text-zinc-500 dark:text-zinc-400">Update your account details</p>
                </div>
              </div>
            </div>

            <!-- Form Content -->
            <form id="profile-form" hx-put="/admin/profile" hx-target="#form-messages" class="p-6 space-y-6">
              <div id="form-messages"></div>

              <!-- Basic Information -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value="${data.profile.first_name}"
                    required
                    class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    placeholder="Enter your first name"
                  >
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value="${data.profile.last_name}"
                    required
                    class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    placeholder="Enter your last name"
                  >
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value="${data.profile.username}"
                  required
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                  placeholder="Enter your username"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value="${data.profile.email}"
                  required
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                  placeholder="Enter your email address"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value="${data.profile.phone || ""}"
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                  placeholder="Enter your phone number"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Bio</label>
                <textarea
                  name="bio"
                  rows="3"
                  class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow resize-none"
                  placeholder="Tell us about yourself..."
                >${data.profile.bio || ""}</textarea>
              </div>

              <!-- Preferences -->
              <div class="pt-6 border-t border-zinc-950/5 dark:border-white/5">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Preferences</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="timezone" class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Timezone</label>
                    <div class="grid grid-cols-1">
                      <select id="timezone" name="timezone" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6">
                        ${data.timezones.map((tz) => `
                          <option value="${tz.value}" ${tz.value === data.profile.timezone ? "selected" : ""}>${tz.label}</option>
                        `).join("")}
                      </select>
                      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                        <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label for="language" class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Language</label>
                    <div class="grid grid-cols-1">
                      <select id="language" name="language" class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6">
                        ${data.languages.map((lang) => `
                          <option value="${lang.value}" ${lang.value === data.profile.language ? "selected" : ""}>${lang.label}</option>
                        `).join("")}
                      </select>
                      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                        <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notifications -->
              <div class="pt-6 border-t border-zinc-950/5 dark:border-white/5">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Notifications</h3>

                <div class="space-y-5">
                  <div class="flex gap-3">
                    <div class="flex h-6 shrink-0 items-center">
                      <div class="group grid size-4 grid-cols-1">
                        <input
                          type="checkbox"
                          id="email_notifications"
                          name="email_notifications"
                          value="1"
                          ${data.profile.email_notifications ? "checked" : ""}
                          class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 forced-colors:appearance-auto"
                        />
                        <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                        </svg>
                      </div>
                    </div>
                    <div class="text-sm/6">
                      <label for="email_notifications" class="font-medium text-zinc-950 dark:text-white">Email notifications</label>
                      <p class="text-zinc-500 dark:text-zinc-400">Receive email updates about new features and product announcements.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <div class="pt-6 border-t border-zinc-950/5 dark:border-white/5">
                <button
                  type="submit"
                  class="inline-flex justify-center items-center gap-x-2 rounded-lg bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:focus-visible:outline-white transition-colors"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Update Profile
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Profile Sidebar -->
        <div class="lg:col-span-1 space-y-6">
          <!-- Avatar -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Profile Picture</h3>

            <div class="text-center">
              <div class="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center ring-4 ring-zinc-950/5 dark:ring-white/10">
                ${data.profile.avatar_url ? `<img src="${data.profile.avatar_url}" alt="Profile picture" class="w-full h-full object-cover">` : `<span class="text-2xl font-bold text-white">${data.profile.first_name.charAt(0)}${data.profile.last_name.charAt(0)}</span>`}
              </div>

              <form id="avatar-form" hx-post="/admin/profile/avatar" hx-target="#avatar-messages" hx-encoding="multipart/form-data">
                <input
                  type="file"
                  name="avatar"
                  accept="image/*"
                  class="hidden"
                  id="avatar-input"
                  onchange="document.getElementById('avatar-form').dispatchEvent(new Event('submit'))"
                >
                <label
                  for="avatar-input"
                  class="inline-flex items-center gap-x-2 rounded-lg bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Change Picture
                </label>
              </form>

              <div id="avatar-messages" class="mt-3"></div>
            </div>
          </div>

          <!-- Account Info -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Account Information</h3>

            <dl class="space-y-3 text-sm">
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">Role</dt>
                <dd class="mt-1">
                  <span class="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-400/20 capitalize">
                    ${data.profile.role}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">Member Since</dt>
                <dd class="mt-1 text-zinc-950 dark:text-white">${new Date(data.profile.created_at).toLocaleDateString()}</dd>
              </div>
              ${data.profile.last_login_at ? `
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Last Login</dt>
                  <dd class="mt-1 text-zinc-950 dark:text-white">${new Date(data.profile.last_login_at).toLocaleDateString()}</dd>
                </div>
              ` : ""}
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">Two-Factor Auth</dt>
                <dd class="mt-1">
                  ${data.profile.two_factor_enabled ? '<span class="inline-flex items-center rounded-md bg-green-50 dark:bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/20">Enabled</span>' : '<span class="inline-flex items-center rounded-md bg-zinc-50 dark:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/10 dark:ring-zinc-400/20">Disabled</span>'}
                </dd>
              </div>
            </dl>
          </div>

          <!-- Security Actions -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Security</h3>

            <div class="space-y-2">
              <button
                type="button"
                onclick="showChangePasswordModal()"
                class="w-full text-left flex items-center gap-x-3 px-3 py-2 text-sm text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <svg class="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3.586l4.293-4.293A6 6 0 0119 9z"/>
                </svg>
                <span class="font-medium">Change Password</span>
              </button>

              <button
                type="button"
                onclick="toggle2FA()"
                class="w-full text-left flex items-center gap-x-3 px-3 py-2 text-sm text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                <svg class="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <span class="font-medium">${data.profile.two_factor_enabled ? "Disable" : "Enable"} 2FA</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div id="password-modal" class="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-2xl ring-1 ring-zinc-950/5 dark:ring-white/10 w-full max-w-md mx-4">
        <div class="px-6 py-5 border-b border-zinc-950/5 dark:border-white/5">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white">Change Password</h3>
            <button onclick="closePasswordModal()" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <form id="password-form" hx-post="/admin/profile/password" hx-target="#password-messages" class="p-6 space-y-4">
          <div id="password-messages"></div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Current Password</label>
            <input
              type="password"
              name="current_password"
              required
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
              placeholder="Enter current password"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">New Password</label>
            <input
              type="password"
              name="new_password"
              required
              minlength="8"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
              placeholder="Enter new password"
            >
            <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Must be at least 8 characters</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Confirm New Password</label>
            <input
              type="password"
              name="confirm_password"
              required
              minlength="8"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
              placeholder="Confirm new password"
            >
          </div>

          <div class="flex justify-end gap-x-3 pt-4 border-t border-zinc-950/5 dark:border-white/5">
            <button
              type="button"
              onclick="closePasswordModal()"
              class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-x-2 rounded-lg bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      function showChangePasswordModal() {
        document.getElementById('password-modal').classList.remove('hidden');
      }

      function closePasswordModal() {
        document.getElementById('password-modal').classList.add('hidden');
        document.getElementById('password-form').reset();
      }

      function toggle2FA() {
        // TODO: Implement 2FA toggle
        alert('Two-factor authentication setup coming soon!');
      }

      // Close modal on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !document.getElementById('password-modal').classList.contains('hidden')) {
          closePasswordModal();
        }
      });

      // Close modal on backdrop click
      document.getElementById('password-modal').addEventListener('click', function(e) {
        if (e.target === this) {
          closePasswordModal();
        }
      });
    </script>
  `;
  const layoutData = {
    title: "User Profile",
    pageTitle: "Profile",
    currentPath: "/admin/profile",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/components/alert.template.ts
function renderAlert2(data) {
  const typeClasses = {
    success: "bg-green-50 dark:bg-green-500/10 border border-green-600/20 dark:border-green-500/20",
    error: "bg-error/10 border border-red-600/20 dark:border-red-500/20",
    warning: "bg-amber-50 dark:bg-amber-500/10 border border-amber-600/20 dark:border-amber-500/20",
    info: "bg-blue-50 dark:bg-blue-500/10 border border-blue-600/20 dark:border-blue-500/20"
  };
  const iconClasses = {
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400"
  };
  const textClasses = {
    success: "text-green-900 dark:text-green-300",
    error: "text-red-900 dark:text-red-300",
    warning: "text-amber-900 dark:text-amber-300",
    info: "text-blue-900 dark:text-blue-300"
  };
  const messageTextClasses = {
    success: "text-green-700 dark:text-green-400",
    error: "text-red-700 dark:text-red-400",
    warning: "text-amber-700 dark:text-amber-400",
    info: "text-blue-700 dark:text-blue-400"
  };
  const icons = {
    success: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />`,
    error: `<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />`,
    warning: `<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />`,
    info: `<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />`
  };
  return `
    <div class="rounded-lg p-4 ${typeClasses[data.type]} ${data.className || ""}" ${data.dismissible ? 'id="dismissible-alert"' : ""}>
      <div class="flex">
        ${data.icon !== false ? `
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 ${iconClasses[data.type]}" viewBox="0 0 20 20" fill="currentColor">
              ${icons[data.type]}
            </svg>
          </div>
        ` : ""}
        <div class="${data.icon !== false ? "ml-3" : ""}">
          ${data.title ? `
            <h3 class="text-sm font-semibold ${textClasses[data.type]}">
              ${data.title}
            </h3>
          ` : ""}
          <div class="${data.title ? "mt-1 text-sm" : "text-sm"} ${messageTextClasses[data.type]}">
            <p>${data.message}</p>
          </div>
        </div>
        ${data.dismissible ? `
          <div class="ml-auto pl-3">
            <div class="-mx-1.5 -my-1.5">
              <button
                type="button"
                class="inline-flex rounded-md p-1.5 ${iconClasses[data.type]} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2"
                onclick="document.getElementById('dismissible-alert').remove()"
              >
                <span class="sr-only">Dismiss</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// src/templates/pages/admin-activity-logs.template.ts
function renderActivityLogsPage(data) {
  const pageContent = `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">Activity Logs</h1>
          <p class="mt-2 text-sm text-gray-300">Monitor user actions and system activity</p>
        </div>
      </div>

      <!-- Breadcrumb -->
      <nav class="flex mb-6" aria-label="Breadcrumb">
        <ol class="flex items-center space-x-3">
          <li>
            <a href="/admin" class="text-gray-300 hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
            </a>
          </li>
          <li class="flex items-center">
            <svg class="h-5 w-5 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm font-medium text-gray-200">Activity Logs</span>
          </li>
        </ol>
      </nav>

      <!-- Filters -->
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl p-6 mb-6">
        <h3 class="text-lg font-semibold text-white mb-4">Filters</h3>
        
        <form method="GET" action="/admin/activity-logs" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Action</label>
            <select name="action" class="w-full px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-white/30">
              <option value="">All Actions</option>
              <option value="user.login" ${data.filters.action === "user.login" ? "selected" : ""}>User Login</option>
              <option value="user.logout" ${data.filters.action === "user.logout" ? "selected" : ""}>User Logout</option>
              <option value="user.invite_sent" ${data.filters.action === "user.invite_sent" ? "selected" : ""}>User Invited</option>
              <option value="user.invitation_accepted" ${data.filters.action === "user.invitation_accepted" ? "selected" : ""}>Invitation Accepted</option>
              <option value="profile.update" ${data.filters.action === "profile.update" ? "selected" : ""}>Profile Update</option>
              <option value="profile.password_change" ${data.filters.action === "profile.password_change" ? "selected" : ""}>Password Change</option>
              <option value="content.create" ${data.filters.action === "content.create" ? "selected" : ""}>Content Created</option>
              <option value="content.update" ${data.filters.action === "content.update" ? "selected" : ""}>Content Updated</option>
              <option value="content.delete" ${data.filters.action === "content.delete" ? "selected" : ""}>Content Deleted</option>
              <option value="collection.create" ${data.filters.action === "collection.create" ? "selected" : ""}>Collection Created</option>
              <option value="collection.update" ${data.filters.action === "collection.update" ? "selected" : ""}>Collection Updated</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Resource Type</label>
            <select name="resource_type" class="w-full px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-white/30">
              <option value="">All Resources</option>
              <option value="users" ${data.filters.resource_type === "users" ? "selected" : ""}>Users</option>
              <option value="content" ${data.filters.resource_type === "content" ? "selected" : ""}>Content</option>
              <option value="collections" ${data.filters.resource_type === "collections" ? "selected" : ""}>Collections</option>
              <option value="media" ${data.filters.resource_type === "media" ? "selected" : ""}>Media</option>
              <option value="settings" ${data.filters.resource_type === "settings" ? "selected" : ""}>Settings</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">From Date</label>
            <input 
              type="date" 
              name="date_from" 
              value="${data.filters.date_from || ""}"
              class="w-full px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-white/30"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">To Date</label>
            <input 
              type="date" 
              name="date_to" 
              value="${data.filters.date_to || ""}"
              class="w-full px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-white/30"
            >
          </div>

          <div class="md:col-span-2 lg:col-span-4 flex gap-3">
            <button 
              type="submit"
              class="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Apply Filters
            </button>
            <a 
              href="/admin/activity-logs"
              class="px-6 py-2 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-all"
            >
              Clear Filters
            </a>
          </div>
        </form>
      </div>

      <!-- Activity Logs Table -->
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl overflow-hidden">
        <div class="relative px-6 py-4 border-b border-white/10">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
          <div class="relative flex items-center justify-between">
            <h2 class="text-xl font-semibold text-white">Recent Activity</h2>
            <div class="text-sm text-gray-300">
              Showing ${data.logs.length} of ${data.pagination.total} logs
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-white/5">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timestamp</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Resource</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/10">
              ${data.logs.map((log) => `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${new Date(log.created_at).toLocaleString()}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">${log.user_name || "Unknown"}</div>
                    <div class="text-xs text-gray-400">${log.user_email || "N/A"}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeClass(log.action)}">
                      ${formatAction(log.action)}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${log.resource_type ? `
                      <div class="text-white">${log.resource_type}</div>
                      ${log.resource_id ? `<div class="text-xs text-gray-400">${log.resource_id}</div>` : ""}
                    ` : "N/A"}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${log.ip_address || "N/A"}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-300">
                    ${log.details ? `
                      <details class="cursor-pointer">
                        <summary class="text-blue-400 hover:text-blue-300">View Details</summary>
                        <pre class="mt-2 text-xs bg-black/20 p-2 rounded overflow-x-auto">${JSON.stringify(log.details, null, 2)}</pre>
                      </details>
                    ` : "N/A"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        ${data.logs.length === 0 ? `
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-300">No activity logs found</h3>
            <p class="mt-1 text-sm text-gray-500">Try adjusting your filters or check back later.</p>
          </div>
        ` : ""}

        <!-- Pagination -->
        ${data.pagination.pages > 1 ? `
          <div class="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <div class="text-sm text-gray-300">
              Page ${data.pagination.page} of ${data.pagination.pages} (${data.pagination.total} total logs)
            </div>
            <div class="flex space-x-2">
              ${data.pagination.page > 1 ? `
                <a href="?page=${data.pagination.page - 1}&${new URLSearchParams(data.filters).toString()}" 
                   class="px-3 py-1 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                  Previous
                </a>
              ` : ""}
              ${data.pagination.page < data.pagination.pages ? `
                <a href="?page=${data.pagination.page + 1}&${new URLSearchParams(data.filters).toString()}" 
                   class="px-3 py-1 bg-white/10 text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all">
                  Next
                </a>
              ` : ""}
            </div>
          </div>
        ` : ""}
      </div>
    </div>
  `;
  const layoutData = {
    title: "Activity Logs",
    pageTitle: "Activity Logs",
    currentPath: "/admin/activity-logs",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function getActionBadgeClass(action) {
  if (action.includes("login") || action.includes("logout")) {
    return "bg-blue-500/20 text-blue-300";
  } else if (action.includes("create") || action.includes("invite")) {
    return "bg-green-500/20 text-green-300";
  } else if (action.includes("update") || action.includes("change")) {
    return "bg-yellow-500/20 text-yellow-300";
  } else if (action.includes("delete") || action.includes("cancel")) {
    return "bg-red-500/20 text-red-300";
  } else {
    return "bg-gray-500/20 text-gray-300";
  }
}
function formatAction(action) {
  return action.split(".").map((part) => part.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())).join(" - ");
}

// src/templates/pages/admin-user-edit.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();

// src/templates/components/confirmation-dialog.template.ts
function renderConfirmationDialog2(options) {
  const {
    id,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmClass = "bg-red-500 hover:bg-red-400",
    iconColor = "red",
    onConfirm = ""
  } = options;
  const iconColorClasses = {
    red: "bg-red-500/10 text-red-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    blue: "bg-blue-500/10 text-blue-400"
  };
  return `
    <el-dialog>
      <dialog
        id="${id}"
        aria-labelledby="${id}-title"
        class="fixed inset-0 m-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent p-0 backdrop:bg-transparent"
      >
        <el-dialog-backdrop class="fixed inset-0 bg-gray-900/50 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"></el-dialog-backdrop>

        <div tabindex="0" class="flex min-h-full items-end justify-center p-4 text-center focus:outline focus:outline-0 sm:items-center sm:p-0">
          <el-dialog-panel class="relative transform overflow-hidden rounded-lg bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl outline outline-1 -outline-offset-1 outline-white/10 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full ${iconColorClasses[iconColor]} sm:mx-0 sm:size-10">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" class="size-6">
                  <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 id="${id}-title" class="text-base font-semibold text-white">${title}</h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-400">${message}</p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onclick="${onConfirm}; document.getElementById('${id}').close()"
                command="close"
                commandfor="${id}"
                class="confirm-button inline-flex w-full justify-center rounded-md ${confirmClass} px-3 py-2 text-sm font-semibold text-white sm:ml-3 sm:w-auto"
              >
                ${confirmText}
              </button>
              <button
                type="button"
                command="close"
                commandfor="${id}"
                class="mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/5 hover:bg-white/20 sm:mt-0 sm:w-auto"
              >
                ${cancelText}
              </button>
            </div>
          </el-dialog-panel>
        </div>
      </dialog>
    </el-dialog>
  `;
}
function getConfirmationDialogScript2() {
  return `
    <script src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1" type="module"></script>
    <script>
      function showConfirmDialog(dialogId) {
        const dialog = document.getElementById(dialogId);
        if (dialog) {
          dialog.showModal();
        }
      }
    </script>
  `;
}

// src/templates/pages/admin-user-edit.template.ts
function renderUserEditPage(data) {
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <a href="/admin/users" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Edit User</h1>
          </div>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Update user account and permissions</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            type="submit"
            form="user-edit-form"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Save Changes
          </button>
          <a
            href="/admin/users"
            class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            Cancel
          </a>
        </div>
      </div>

      <!-- Alert Messages -->
      <div id="form-messages">
        ${data.error ? chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error, dismissible: true }) : ""}
        ${data.success ? chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.success, dismissible: true }) : ""}
      </div>

      <!-- User Edit Form -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Form -->
        <div class="lg:col-span-2">
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-8">
            <form id="user-edit-form" hx-put="/admin/users/${data.userToEdit.id}" hx-target="#form-messages">

              <!-- Basic Information -->
              <div class="mb-8">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Basic Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value="${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.firstName || "")}"
                      required
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value="${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.lastName || "")}"
                      required
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Username</label>
                    <input
                      type="text"
                      name="username"
                      value="${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.username || "")}"
                      required
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value="${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.email || "")}"
                      required
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value="${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.phone || "")}"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label for="role" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Role</label>
                    <div class="mt-2 grid grid-cols-1">
                      <select
                        id="role"
                        name="role"
                        class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6"
                      >
                        ${data.roles.map((role) => `
                          <option value="${chunkOQFE3DSZ_cjs.escapeHtml(role.value)}" ${data.userToEdit.role === role.value ? "selected" : ""}>${chunkOQFE3DSZ_cjs.escapeHtml(role.label)}</option>
                        `).join("")}
                      </select>
                      <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                        <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="mt-6">
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Bio</label>
                  <textarea
                    name="bio"
                    rows="3"
                    class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                  >${chunkOQFE3DSZ_cjs.escapeHtml(data.userToEdit.bio || "")}</textarea>
                </div>
              </div>

              <!-- Account Status -->
              <div class="mb-8">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Account Status</h3>
                <div class="space-y-4">
                  <div class="flex gap-3">
                    <div class="flex h-6 shrink-0 items-center">
                      <div class="group grid size-4 grid-cols-1">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          value="1"
                          ${data.userToEdit.isActive ? "checked" : ""}
                          class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                        />
                        <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                          <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                        </svg>
                      </div>
                    </div>
                    <div class="text-sm/6">
                      <label for="is_active" class="font-medium text-zinc-950 dark:text-white">Account Active</label>
                      <p class="text-zinc-500 dark:text-zinc-400">User can sign in and access the system</p>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <div class="flex h-6 shrink-0 items-center">
                      <div class="group grid size-4 grid-cols-1">
                        <input
                          type="checkbox"
                          id="email_verified"
                          name="email_verified"
                          value="1"
                          ${data.userToEdit.emailVerified ? "checked" : ""}
                          class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                        />
                        <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                          <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                        </svg>
                      </div>
                    </div>
                    <div class="text-sm/6">
                      <label for="email_verified" class="font-medium text-zinc-950 dark:text-white">Email Verified</label>
                      <p class="text-zinc-500 dark:text-zinc-400">User has verified their email address</p>
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <!-- User Stats -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 mb-6">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">User Details</h3>
            <dl class="space-y-4 text-sm">
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">User ID</dt>
                <dd class="mt-1 text-zinc-950 dark:text-white font-mono text-xs">${data.userToEdit.id}</dd>
              </div>
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">Created</dt>
                <dd class="mt-1 text-zinc-950 dark:text-white">${new Date(data.userToEdit.createdAt).toLocaleDateString()}</dd>
              </div>
              ${data.userToEdit.lastLoginAt ? `
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Last Login</dt>
                  <dd class="mt-1 text-zinc-950 dark:text-white">${new Date(data.userToEdit.lastLoginAt).toLocaleDateString()}</dd>
                </div>
              ` : ""}
              <div>
                <dt class="text-zinc-500 dark:text-zinc-400">Status</dt>
                <dd class="mt-1">
                  ${data.userToEdit.isActive ? '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-1 ring-inset ring-lime-700/10 dark:ring-lime-400/20">Active</span>' : '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-700/10 dark:ring-red-500/20">Inactive</span>'}
                </dd>
              </div>
              ${data.userToEdit.twoFactorEnabled ? `
                <div>
                  <dt class="text-zinc-500 dark:text-zinc-400">Security</dt>
                  <dd class="mt-1">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-500/20">2FA Enabled</span>
                  </dd>
                </div>
              ` : ""}
            </dl>
          </div>

          <!-- Danger Zone -->
          <div class="rounded-xl bg-red-50 dark:bg-red-500/10 shadow-sm ring-1 ring-red-600/20 dark:ring-red-500/20 p-6">
            <h3 class="text-base font-semibold text-red-900 dark:text-red-300 mb-2">Danger Zone</h3>
            <p class="text-sm text-red-700 dark:text-red-400 mb-4">Irreversible and destructive actions</p>

            <div class="flex gap-3 mb-4">
              <div class="flex h-6 shrink-0 items-center">
                <div class="group grid size-4 grid-cols-1">
                  <input
                    type="checkbox"
                    id="hard-delete-checkbox"
                    class="col-start-1 row-start-1 appearance-none rounded border border-red-300 dark:border-red-700 bg-white dark:bg-red-950/50 checked:border-red-600 checked:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:border-red-200 dark:disabled:border-red-900 disabled:bg-red-50 dark:disabled:bg-red-950/30 disabled:checked:bg-red-300 dark:disabled:checked:bg-red-900 forced-colors:appearance-auto"
                  />
                  <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-red-950/25 dark:group-has-[:disabled]:stroke-white/25">
                    <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                    <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                  </svg>
                </div>
              </div>
              <div class="text-sm/6">
                <label for="hard-delete-checkbox" class="font-medium text-red-900 dark:text-red-300 cursor-pointer">Hard Delete (Permanent)</label>
                <p class="text-red-700 dark:text-red-400">Permanently remove from database. Unchecked performs soft delete (deactivate only).</p>
              </div>
            </div>

            <button
              onclick="deleteUser('${data.userToEdit.id}')"
              class="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>

    <script>
      let userIdToDelete = null;

      function deleteUser(userId) {
        userIdToDelete = userId;
        showConfirmDialog('delete-user-confirm');
      }

      function performDeleteUser() {
        if (!userIdToDelete) return;

        const checkbox = document.getElementById('hard-delete-checkbox');
        const hardDelete = checkbox ? checkbox.checked : false;

        fetch(\`/admin/users/\${userIdToDelete}\`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hardDelete })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Add a small delay to ensure database transaction completes
            // and add cache busting to force refresh
            setTimeout(() => {
              window.location.href = '/admin/users?_t=' + Date.now()
            }, 300)
          } else {
            alert('Error deleting user: ' + (data.error || 'Unknown error'))
          }
        })
        .catch(error => {
          console.error('Error:', error)
          alert('Error deleting user')
        })
        .finally(() => {
          userIdToDelete = null;
        });
      }
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog2({
    id: "delete-user-confirm",
    title: "Delete User",
    message: 'Are you sure you want to delete this user? Check the "Hard Delete" option to permanently remove all data from the database. This action cannot be undone!',
    confirmText: "Delete",
    cancelText: "Cancel",
    iconColor: "red",
    confirmClass: "bg-red-500 hover:bg-red-400",
    onConfirm: "performDeleteUser()"
  })}

    ${getConfirmationDialogScript2()}
  `;
  const layoutData = {
    title: "Edit User",
    pageTitle: `Edit User - ${data.userToEdit.firstName} ${data.userToEdit.lastName}`,
    currentPath: "/admin/users",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/pages/admin-user-new.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderUserNewPage(data) {
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <a href="/admin/users" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </a>
            <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Create New User</h1>
          </div>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Add a new user account to the system</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            type="submit"
            form="user-new-form"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Create User
          </button>
          <a
            href="/admin/users"
            class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            Cancel
          </a>
        </div>
      </div>

      <!-- Alert Messages -->
      <div id="form-messages">
        ${data.error ? chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error, dismissible: true }) : ""}
        ${data.success ? chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.success, dismissible: true }) : ""}
      </div>

      <!-- User New Form -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Form -->
        <div class="lg:col-span-2">
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-8">
            <form id="user-new-form" hx-post="/admin/users/new" hx-target="#form-messages">

              <!-- Basic Information -->
              <div class="mb-8">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Basic Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      First Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      placeholder="Enter first name"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      Last Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      placeholder="Enter last name"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      Username <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="Enter username"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      Email <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="user@example.com"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 (555) 000-0000"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label for="role" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">
                      Role <span class="text-red-500">*</span>
                    </label>
                    <div class="mt-2 grid grid-cols-1">
                      <select
                        id="role"
                        name="role"
                        required
                        class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-zinc-500/30 dark:outline-zinc-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-500 dark:focus-visible:outline-zinc-400 sm:text-sm/6"
                      >
                        ${data.roles.map((role) => `
                          <option value="${role.value}">${role.label}</option>
                        `).join("")}
                      </select>
                      <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-600 dark:text-zinc-400 sm:size-4">
                        <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div class="mt-6">
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Bio</label>
                  <textarea
                    name="bio"
                    rows="3"
                    placeholder="Enter a short bio (optional)"
                    class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                  ></textarea>
                </div>
              </div>

              <!-- Password -->
              <div class="mb-8">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Password</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      Password <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="Enter password (min 8 characters)"
                      minlength="8"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
                      Confirm Password <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      required
                      placeholder="Confirm password"
                      minlength="8"
                      class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
                    />
                  </div>
                </div>
              </div>

              <!-- Account Status -->
              <div class="mb-8">
                <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Account Status</h3>
                <div class="space-y-5">
                  <div class="flex gap-3">
                    <div class="flex h-6 shrink-0 items-center">
                      <div class="group grid size-4 grid-cols-1">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          value="1"
                          checked
                          class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                        />
                        <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                          <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                        </svg>
                      </div>
                    </div>
                    <div class="text-sm/6">
                      <label for="is_active" class="font-medium text-zinc-950 dark:text-white">Account Active</label>
                      <p class="text-zinc-500 dark:text-zinc-400">User can sign in and access the system</p>
                    </div>
                  </div>

                  <div class="flex gap-3">
                    <div class="flex h-6 shrink-0 items-center">
                      <div class="group grid size-4 grid-cols-1">
                        <input
                          type="checkbox"
                          id="email_verified"
                          name="email_verified"
                          value="1"
                          class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                        />
                        <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                          <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                          <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                        </svg>
                      </div>
                    </div>
                    <div class="text-sm/6">
                      <label for="email_verified" class="font-medium text-zinc-950 dark:text-white">Email Verified</label>
                      <p class="text-zinc-500 dark:text-zinc-400">Mark email as verified</p>
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="lg:col-span-1">
          <!-- Help Text -->
          <div class="rounded-xl bg-blue-50 dark:bg-blue-500/10 shadow-sm ring-1 ring-blue-600/20 dark:ring-blue-500/20 p-6">
            <h3 class="text-base font-semibold text-blue-900 dark:text-blue-300 mb-2">Creating a User</h3>
            <div class="text-sm text-blue-700 dark:text-blue-400 space-y-3">
              <p>Fill in the required fields marked with <span class="text-red-500">*</span> to create a new user account.</p>
              <p>The password must be at least 8 characters long.</p>
              <p>By default, new users are created as active and can sign in immediately.</p>
              <p>You can edit user details and permissions after creation.</p>
            </div>
          </div>

          <!-- Role Descriptions -->
          <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 mt-6">
            <h3 class="text-base font-semibold text-zinc-950 dark:text-white mb-4">Role Descriptions</h3>
            <dl class="space-y-3 text-sm">
              <div>
                <dt class="font-medium text-zinc-950 dark:text-white">Administrator</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">Full system access and permissions</dd>
              </div>
              <div>
                <dt class="font-medium text-zinc-950 dark:text-white">Editor</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">Can create and edit content</dd>
              </div>
              <div>
                <dt class="font-medium text-zinc-950 dark:text-white">Author</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">Can create own content</dd>
              </div>
              <div>
                <dt class="font-medium text-zinc-950 dark:text-white">Viewer</dt>
                <dd class="text-zinc-500 dark:text-zinc-400">Read-only access</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  `;
  const layoutData = {
    title: "Create User",
    pageTitle: "Create New User",
    currentPath: "/admin/users",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/pages/admin-users-list.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderUsersListPage(data) {
  const columns = [
    {
      key: "avatar",
      label: "",
      className: "w-12",
      sortable: false,
      render: (value, row) => {
        const initials = `${row.firstName.charAt(0)}${row.lastName.charAt(0)}`.toUpperCase();
        if (value) {
          return `<img src="${value}" alt="${row.firstName} ${row.lastName}" class="w-8 h-8 rounded-full">`;
        }
        return `
          <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 rounded-full flex items-center justify-center">
            <span class="text-xs font-medium text-white">${initials}</span>
          </div>
        `;
      }
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      sortType: "string",
      render: (value, row) => {
        const escapeHtml7 = (text) => text.replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char] || char);
        const truncatedFirstName = row.firstName.length > 25 ? row.firstName.substring(0, 25) + "..." : row.firstName;
        const truncatedLastName = row.lastName.length > 25 ? row.lastName.substring(0, 25) + "..." : row.lastName;
        const fullName = escapeHtml7(`${truncatedFirstName} ${truncatedLastName}`);
        const truncatedUsername = row.username.length > 100 ? row.username.substring(0, 100) + "..." : row.username;
        const username = escapeHtml7(truncatedUsername);
        const statusBadge = row.isActive ? '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-1 ring-inset ring-lime-700/10 dark:ring-lime-400/20 ml-2">Active</span>' : '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-700/10 dark:ring-red-500/20 ml-2">Inactive</span>';
        return `
          <div>
            <div class="text-sm font-medium text-zinc-950 dark:text-white">${fullName}${statusBadge}</div>
            <div class="text-sm text-zinc-500 dark:text-zinc-400">@${username}</div>
          </div>
        `;
      }
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      sortType: "string",
      render: (value) => {
        const escapeHtml7 = (text) => text.replace(/[&<>"']/g, (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[char] || char);
        const escapedEmail = escapeHtml7(value);
        return `<a href="mailto:${escapedEmail}" class="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">${escapedEmail}</a>`;
      }
    },
    {
      key: "role",
      label: "Role",
      sortable: true,
      sortType: "string",
      render: (value) => {
        const roleColors = {
          admin: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-700/10 dark:ring-red-500/20",
          editor: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-500/20",
          author: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-700/10 dark:ring-cyan-500/20",
          viewer: "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/10 dark:ring-zinc-400/20"
        };
        const colorClass = roleColors[value] || "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 ring-1 ring-inset ring-zinc-500/10 dark:ring-zinc-400/20";
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${colorClass}">${value.charAt(0).toUpperCase() + value.slice(1)}</span>`;
      }
    },
    {
      key: "lastLoginAt",
      label: "Last Login",
      sortable: true,
      sortType: "date",
      render: (value) => {
        if (!value) return '<span class="text-zinc-500 dark:text-zinc-400">Never</span>';
        return `<span class="text-sm text-zinc-500 dark:text-zinc-400">${new Date(value).toLocaleDateString()}</span>`;
      }
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      sortType: "date",
      render: (value) => `<span class="text-sm text-zinc-500 dark:text-zinc-400">${new Date(value).toLocaleDateString()}</span>`
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right",
      sortable: false,
      render: (value, row) => `
        <div class="flex justify-end space-x-2">
          ${row.isActive ? `<button onclick="toggleUserStatus('${row.id}', false)" title="Deactivate user" class="inline-flex items-center justify-center p-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-500 to-pink-500 dark:from-red-400 dark:to-pink-400 text-white hover:from-red-600 hover:to-pink-600 dark:hover:from-red-500 dark:hover:to-pink-500 shadow-sm transition-all duration-200">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </button>` : `<button onclick="toggleUserStatus('${row.id}', true)" title="Activate user" class="inline-flex items-center justify-center p-2 text-sm font-medium rounded-lg bg-gradient-to-r from-lime-500 to-green-500 dark:from-lime-400 dark:to-green-400 text-white hover:from-lime-600 hover:to-green-600 dark:hover:from-lime-500 dark:hover:to-green-500 shadow-sm transition-all duration-200">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>`}
        </div>
      `
    }
  ];
  const tableData = {
    tableId: "users-table",
    columns,
    rows: data.users,
    selectable: false,
    rowClickable: true,
    rowClickUrl: (row) => `/admin/users/${row.id}/edit`,
    emptyMessage: "No users found"
  };
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">User Management</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage user accounts and permissions</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <a href="/admin/users/new" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add User
          </a>
          <button class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm" onclick="exportUsers()">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Export
          </button>
        </div>
      </div>

      <!-- Alert Messages -->
      ${data.error ? chunk3SPQ3J4N_cjs.renderAlert({ type: "error", message: data.error, dismissible: true }) : ""}
      ${data.success ? chunk3SPQ3J4N_cjs.renderAlert({ type: "success", message: data.success, dismissible: true }) : ""}

      <!-- Stats -->
      <div class="mb-6">
        <h3 class="text-base font-semibold text-zinc-950 dark:text-white">User Statistics</h3>
        <dl class="mt-5 grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-zinc-800/75 dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Total Users</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-cyan-400">
                ${data.totalUsers}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-lime-400/10 text-lime-600 dark:text-lime-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Increased by</span>
                5.2%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Active Users</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-lime-400">
                ${data.users.filter((u) => u.isActive).length}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-lime-400/10 text-lime-600 dark:text-lime-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Increased by</span>
                3.1%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Administrators</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-pink-400">
                ${data.users.filter((u) => u.role === "admin").length}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-lime-400/10 text-lime-600 dark:text-lime-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Increased by</span>
                1.8%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Active This Week</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-purple-400">
                ${data.users.filter((u) => u.lastLoginAt && u.lastLoginAt > Date.now() - 7 * 24 * 60 * 60 * 1e3).length}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-pink-400/10 text-pink-600 dark:text-pink-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Decreased by</span>
                2.3%
              </div>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Filters with Gradient Background -->
      <div class="relative rounded-xl overflow-hidden mb-6">
        <!-- Gradient Background Layer -->
        <div class="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 dark:from-purple-400/20 dark:via-pink-400/20 dark:to-blue-400/20"></div>

        <!-- Content Layer with backdrop blur -->
        <div class="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="px-6 py-5">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <!-- Modern Search Input -->
              <div>
                <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Search</label>
                <div class="relative group">
                  <input
                    type="text"
                    name="search"
                    id="user-search-input"
                    value="${data.searchFilter || ""}"
                    placeholder="Search users..."
                    class="rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 pl-11 text-sm w-full text-zinc-950 dark:text-white border-2 border-purple-200/50 dark:border-purple-700/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 focus:bg-white dark:focus:bg-zinc-800 focus:shadow-lg focus:shadow-purple-500/20 dark:focus:shadow-purple-400/20 transition-all duration-300"
                    hx-get="/admin/users"
                    hx-trigger="keyup changed delay:300ms"
                    hx-target="body"
                    hx-include="[name='role'], [name='status']"
                    hx-on::after-request="
                      const input = document.getElementById('user-search-input');
                      if (input && document.activeElement === input) {
                        const len = input.value.length;
                        setTimeout(() => {
                          input.focus();
                          input.setSelectionRange(len, len);
                        }, 10);
                      }
                    "
                  >
                  <!-- Gradient search icon -->
                  <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 dark:from-purple-300 dark:to-pink-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                    <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Role</label>
                <div class="mt-2 grid grid-cols-1">
                  <select
                    name="role"
                    hx-get="/admin/users"
                    hx-trigger="change"
                    hx-target="body"
                    hx-include="[name='search'], [name='status']"
                    class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-purple-500/30 dark:outline-purple-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-500 dark:focus-visible:outline-purple-400 sm:text-sm/6"
                  >
                    <option value="" ${!data.roleFilter ? "selected" : ""}>All Roles</option>
                    <option value="admin" ${data.roleFilter === "admin" ? "selected" : ""}>Admin</option>
                    <option value="editor" ${data.roleFilter === "editor" ? "selected" : ""}>Editor</option>
                    <option value="author" ${data.roleFilter === "author" ? "selected" : ""}>Author</option>
                    <option value="viewer" ${data.roleFilter === "viewer" ? "selected" : ""}>Viewer</option>
                  </select>
                  <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-purple-600 dark:text-purple-400 sm:size-4">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Status</label>
                <div class="mt-2 grid grid-cols-1">
                  <select
                    name="status"
                    hx-get="/admin/users"
                    hx-trigger="change"
                    hx-target="body"
                    hx-include="[name='search'], [name='role']"
                    class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-purple-500/30 dark:outline-purple-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple-500 dark:focus-visible:outline-purple-400 sm:text-sm/6"
                  >
                    <option value="active" ${!data.statusFilter || data.statusFilter === "active" ? "selected" : ""}>Active</option>
                    <option value="inactive" ${data.statusFilter === "inactive" ? "selected" : ""}>Inactive</option>
                    <option value="all" ${data.statusFilter === "all" ? "selected" : ""}>All Users</option>
                  </select>
                  <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-purple-600 dark:text-purple-400 sm:size-4">
                    <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">&nbsp;</label>
                <div class="mt-2">
                  <button
                    class="inline-flex items-center gap-x-1.5 justify-center px-4 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-purple-200/50 dark:ring-purple-700/50 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 hover:ring-purple-300 dark:hover:ring-purple-600 transition-all duration-200 w-full"
                    onclick="clearFilters()"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Users Table -->
      ${chunk3SPQ3J4N_cjs.renderTable(tableData)}

      <!-- Pagination -->
      ${data.pagination ? chunk3SPQ3J4N_cjs.renderPagination(data.pagination) : ""}
    </div>

    <script>
      let userStatusData = null;

      function toggleUserStatus(userId, activate) {
        userStatusData = { userId, activate };
        showConfirmDialog('toggle-user-status-confirm');
      }

      function performToggleUserStatus() {
        if (!userStatusData) return;

        const { userId, activate } = userStatusData;

        fetch(\`/admin/users/\${userId}/toggle\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active: activate })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload()
          } else {
            alert('Error updating user status')
          }
        })
        .catch(error => {
          console.error('Error:', error)
          alert('Error updating user status')
        })
        .finally(() => {
          userStatusData = null;
        });
      }

      function clearFilters() {
        window.location.href = '/admin/users'
      }

      function exportUsers() {
        window.open('/admin/users/export', '_blank')
      }
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog2({
    id: "toggle-user-status-confirm",
    title: "Toggle User Status",
    message: "Are you sure you want to activate/deactivate this user?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    iconColor: "yellow",
    confirmClass: "bg-yellow-500 hover:bg-yellow-400",
    onConfirm: "performToggleUserStatus()"
  })}

    ${getConfirmationDialogScript2()}
  `;
  const layoutData = {
    title: "Users",
    pageTitle: "User Management",
    currentPath: "/admin/users",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/routes/admin-users.ts
var userRoutes = new hono.Hono();
userRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
userRoutes.get("/", (c) => {
  return c.redirect("/admin/dashboard");
});
var TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" }
];
var LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" }
];
var ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Editor" },
  { value: "author", label: "Author" },
  { value: "viewer", label: "Viewer" }
];
userRoutes.get("/profile", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  try {
    const userStmt = db.prepare(`
      SELECT id, email, username, first_name, last_name, phone, bio, avatar_url,
             timezone, language, theme, email_notifications, two_factor_enabled,
             role, created_at, last_login_at
      FROM users 
      WHERE id = ? AND is_active = 1
    `);
    const userProfile = await userStmt.bind(user.userId).first();
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }
    const profile = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username || "",
      first_name: userProfile.first_name || "",
      last_name: userProfile.last_name || "",
      phone: userProfile.phone,
      bio: userProfile.bio,
      avatar_url: userProfile.avatar_url,
      timezone: userProfile.timezone || "UTC",
      language: userProfile.language || "en",
      theme: userProfile.theme || "dark",
      email_notifications: Boolean(userProfile.email_notifications),
      two_factor_enabled: Boolean(userProfile.two_factor_enabled),
      role: userProfile.role,
      created_at: userProfile.created_at,
      last_login_at: userProfile.last_login_at
    };
    const pageData = {
      profile,
      timezones: TIMEZONES,
      languages: LANGUAGES,
      user: {
        name: `${profile.first_name} ${profile.last_name}`.trim() || profile.username || user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderProfilePage(pageData));
  } catch (error) {
    console.error("Profile page error:", error);
    const pageData = {
      profile: {},
      timezones: TIMEZONES,
      languages: LANGUAGES,
      error: "Failed to load profile. Please try again.",
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderProfilePage(pageData));
  }
});
userRoutes.put("/profile", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  try {
    const formData = await c.req.formData();
    const firstName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("first_name")?.toString());
    const lastName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("last_name")?.toString());
    const username = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("username")?.toString());
    const email = formData.get("email")?.toString()?.trim().toLowerCase() || "";
    const phone = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("phone")?.toString()) || null;
    const bio = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("bio")?.toString()) || null;
    const timezone = formData.get("timezone")?.toString() || "UTC";
    const language = formData.get("language")?.toString() || "en";
    const emailNotifications = formData.get("email_notifications") === "1";
    if (!firstName || !lastName || !username || !email) {
      return c.html(renderAlert2({
        type: "error",
        message: "First name, last name, username, and email are required.",
        dismissible: true
      }));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.html(renderAlert2({
        type: "error",
        message: "Please enter a valid email address.",
        dismissible: true
      }));
    }
    const checkStmt = db.prepare(`
      SELECT id FROM users 
      WHERE (username = ? OR email = ?) AND id != ? AND is_active = 1
    `);
    const existingUser = await checkStmt.bind(username, email, user.userId).first();
    if (existingUser) {
      return c.html(renderAlert2({
        type: "error",
        message: "Username or email is already taken by another user!.",
        dismissible: true
      }));
    }
    const updateStmt = db.prepare(`
      UPDATE users SET 
        first_name = ?, last_name = ?, username = ?, email = ?,
        phone = ?, bio = ?, timezone = ?, language = ?,
        email_notifications = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      firstName,
      lastName,
      username,
      email,
      phone,
      bio,
      timezone,
      language,
      emailNotifications ? 1 : 0,
      Date.now(),
      user.userId
    ).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "profile.update",
      "users",
      user.userId,
      { fields: ["first_name", "last_name", "username", "email", "phone", "bio", "timezone", "language", "email_notifications"] },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.html(renderAlert2({
      type: "success",
      message: "Profile updated successfully!",
      dismissible: true
    }));
  } catch (error) {
    console.error("Profile update error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to update profile. Please try again.",
      dismissible: true
    }));
  }
});
userRoutes.post("/profile/avatar", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  try {
    const formData = await c.req.formData();
    const avatarFile = formData.get("avatar");
    if (!avatarFile || !avatarFile.name) {
      return c.html(renderAlert2({
        type: "error",
        message: "Please select an image file.",
        dismissible: true
      }));
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) {
      return c.html(renderAlert2({
        type: "error",
        message: "Please upload a valid image file (JPEG, PNG, GIF, or WebP).",
        dismissible: true
      }));
    }
    const maxSize = 5 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      return c.html(renderAlert2({
        type: "error",
        message: "Image file must be smaller than 5MB.",
        dismissible: true
      }));
    }
    const avatarUrl = `/uploads/avatars/${user.userId}-${Date.now()}.${avatarFile.type.split("/")[1]}`;
    const updateStmt = db.prepare(`
      UPDATE users SET avatar_url = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(avatarUrl, Date.now(), user.userId).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "profile.avatar_update",
      "users",
      user.userId,
      { avatar_url: avatarUrl },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.html(renderAlert2({
      type: "success",
      message: "Profile picture updated successfully!",
      dismissible: true
    }));
  } catch (error) {
    console.error("Avatar upload error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to upload profile picture. Please try again.",
      dismissible: true
    }));
  }
});
userRoutes.post("/profile/password", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  try {
    const formData = await c.req.formData();
    const currentPassword = formData.get("current_password")?.toString() || "";
    const newPassword = formData.get("new_password")?.toString() || "";
    const confirmPassword = formData.get("confirm_password")?.toString() || "";
    if (!currentPassword || !newPassword || !confirmPassword) {
      return c.html(renderAlert2({
        type: "error",
        message: "All password fields are required.",
        dismissible: true
      }));
    }
    if (newPassword !== confirmPassword) {
      return c.html(renderAlert2({
        type: "error",
        message: "New passwords do not match.",
        dismissible: true
      }));
    }
    if (newPassword.length < 8) {
      return c.html(renderAlert2({
        type: "error",
        message: "New password must be at least 8 characters long.",
        dismissible: true
      }));
    }
    const userStmt = db.prepare(`
      SELECT password_hash FROM users WHERE id = ? AND is_active = 1
    `);
    const userData = await userStmt.bind(user.userId).first();
    if (!userData) {
      return c.html(renderAlert2({
        type: "error",
        message: "User not found.",
        dismissible: true
      }));
    }
    const validPassword = await chunk4BJGEGX5_cjs.AuthManager.verifyPassword(currentPassword, userData.password_hash);
    if (!validPassword) {
      return c.html(renderAlert2({
        type: "error",
        message: "Current password is incorrect.",
        dismissible: true
      }));
    }
    const newPasswordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(newPassword);
    const historyStmt = db.prepare(`
      INSERT INTO password_history (id, user_id, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `);
    await historyStmt.bind(
      globalThis.crypto.randomUUID(),
      user.userId,
      userData.password_hash,
      Date.now()
    ).run();
    const updateStmt = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(newPasswordHash, Date.now(), user.userId).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "profile.password_change",
      "users",
      user.userId,
      null,
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.html(renderAlert2({
      type: "success",
      message: "Password updated successfully!",
      dismissible: true
    }));
  } catch (error) {
    console.error("Password change error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to update password. Please try again.",
      dismissible: true
    }));
  }
});
userRoutes.get("/users", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "20");
    const search = c.req.query("search") || "";
    const roleFilter = c.req.query("role") || "";
    const statusFilter = c.req.query("status") || "active";
    const offset = (page - 1) * limit;
    let whereClause = "";
    let params = [];
    if (statusFilter === "active") {
      whereClause = "WHERE u.is_active = 1";
    } else if (statusFilter === "inactive") {
      whereClause = "WHERE u.is_active = 0";
    } else {
      whereClause = "WHERE 1=1";
    }
    if (search) {
      whereClause += " AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (roleFilter) {
      whereClause += " AND u.role = ?";
      params.push(roleFilter);
    }
    const usersStmt = db.prepare(`
      SELECT u.id, u.email, u.username, u.first_name, u.last_name,
             u.role, u.avatar_url, u.created_at, u.last_login_at, u.updated_at,
             u.email_verified, u.two_factor_enabled, u.is_active
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const { results: usersData } = await usersStmt.bind(...params, limit, offset).all();
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM users u ${whereClause}
    `);
    const countResult = await countStmt.bind(...params).first();
    const totalUsers = countResult?.total || 0;
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "users.list_view",
      "users",
      void 0,
      { search, page, limit },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    const acceptHeader = c.req.header("accept") || "";
    const isApiRequest = acceptHeader.includes("application/json");
    if (isApiRequest) {
      return c.json({
        users: usersData || [],
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit)
        }
      });
    }
    const users = (usersData || []).map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username || "",
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      role: u.role,
      avatar: u.avatar_url,
      isActive: Boolean(u.is_active),
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      formattedLastLogin: u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : void 0,
      formattedCreatedAt: new Date(u.created_at).toLocaleDateString()
    }));
    const pageData = {
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      searchFilter: search,
      roleFilter,
      statusFilter,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalItems: totalUsers,
        itemsPerPage: limit,
        startItem: offset + 1,
        endItem: Math.min(offset + limit, totalUsers),
        baseUrl: "/admin/users"
      },
      user: {
        name: user.email.split("@")[0] || user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderUsersListPage(pageData));
  } catch (error) {
    console.error("Users list error:", error);
    const acceptHeader = c.req.header("accept") || "";
    const isApiRequest = acceptHeader.includes("application/json");
    if (isApiRequest) {
      return c.json({ error: "Failed to load users" }, 500);
    }
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to load users. Please try again.",
      dismissible: true
    }), 500);
  }
});
userRoutes.get("/users/new", async (c) => {
  const user = c.get("user");
  try {
    const pageData = {
      roles: ROLES,
      user: {
        name: user.email.split("@")[0] || user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderUserNewPage(pageData));
  } catch (error) {
    console.error("User new page error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to load user creation page. Please try again.",
      dismissible: true
    }), 500);
  }
});
userRoutes.post("/users/new", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const formData = await c.req.formData();
    const firstName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("first_name")?.toString());
    const lastName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("last_name")?.toString());
    const username = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("username")?.toString());
    const email = formData.get("email")?.toString()?.trim().toLowerCase() || "";
    const phone = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("phone")?.toString()) || null;
    const bio = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("bio")?.toString()) || null;
    const role = formData.get("role")?.toString() || "viewer";
    const password = formData.get("password")?.toString() || "";
    const confirmPassword = formData.get("confirm_password")?.toString() || "";
    const isActive = formData.get("is_active") === "1";
    const emailVerified = formData.get("email_verified") === "1";
    if (!firstName || !lastName || !username || !email || !password) {
      return c.html(renderAlert2({
        type: "error",
        message: "First name, last name, username, email, and password are required.",
        dismissible: true
      }));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.html(renderAlert2({
        type: "error",
        message: "Please enter a valid email address.",
        dismissible: true
      }));
    }
    if (password.length < 8) {
      return c.html(renderAlert2({
        type: "error",
        message: "Password must be at least 8 characters long.",
        dismissible: true
      }));
    }
    if (password !== confirmPassword) {
      return c.html(renderAlert2({
        type: "error",
        message: "Passwords do not match.",
        dismissible: true
      }));
    }
    const checkStmt = db.prepare(`
      SELECT id FROM users
      WHERE username = ? OR email = ?
    `);
    const existingUser = await checkStmt.bind(username, email).first();
    if (existingUser) {
      return c.html(renderAlert2({
        type: "error",
        message: "Username or email is already taken.",
        dismissible: true
      }));
    }
    const passwordHash = await chunk4BJGEGX5_cjs.AuthManager.hashPassword(password);
    const userId = globalThis.crypto.randomUUID();
    const createStmt = db.prepare(`
      INSERT INTO users (
        id, email, username, first_name, last_name, phone, bio,
        password_hash, role, is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await createStmt.bind(
      userId,
      email,
      username,
      firstName,
      lastName,
      phone,
      bio,
      passwordHash,
      role,
      isActive ? 1 : 0,
      emailVerified ? 1 : 0,
      Date.now(),
      Date.now()
    ).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.create",
      "users",
      userId,
      { email, username, role },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.redirect(`/admin/users/${userId}/edit?success=User created successfully`);
  } catch (error) {
    console.error("User creation error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to create user!. Please try again.",
      dismissible: true
    }));
  }
});
userRoutes.get("/users/:id", async (c) => {
  if (c.req.path.endsWith("/edit")) {
    return c.notFound();
  }
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const userStmt = db.prepare(`
      SELECT id, email, username, first_name, last_name, phone, bio, avatar_url,
             role, is_active, email_verified, two_factor_enabled, created_at, last_login_at
      FROM users
      WHERE id = ?
    `);
    const userRecord = await userStmt.bind(userId).first();
    if (!userRecord) {
      return c.json({ error: "User not found" }, 404);
    }
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.view",
      "users",
      userId,
      null,
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        username: userRecord.username,
        first_name: userRecord.first_name,
        last_name: userRecord.last_name,
        phone: userRecord.phone,
        bio: userRecord.bio,
        avatar_url: userRecord.avatar_url,
        role: userRecord.role,
        is_active: userRecord.is_active,
        email_verified: userRecord.email_verified,
        two_factor_enabled: userRecord.two_factor_enabled,
        created_at: userRecord.created_at,
        last_login_at: userRecord.last_login_at
      }
    });
  } catch (error) {
    console.error("User fetch error:", error);
    return c.json({ error: "Failed to fetch user" }, 500);
  }
});
userRoutes.get("/users/:id/edit", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const userStmt = db.prepare(`
      SELECT id, email, username, first_name, last_name, phone, bio, avatar_url,
             role, is_active, email_verified, two_factor_enabled, created_at, last_login_at
      FROM users
      WHERE id = ?
    `);
    const userToEdit = await userStmt.bind(userId).first();
    if (!userToEdit) {
      return c.html(renderAlert2({
        type: "error",
        message: "User not found",
        dismissible: true
      }), 404);
    }
    const editData = {
      id: userToEdit.id,
      email: userToEdit.email,
      username: userToEdit.username || "",
      firstName: userToEdit.first_name || "",
      lastName: userToEdit.last_name || "",
      phone: userToEdit.phone,
      bio: userToEdit.bio,
      avatarUrl: userToEdit.avatar_url,
      role: userToEdit.role,
      isActive: Boolean(userToEdit.is_active),
      emailVerified: Boolean(userToEdit.email_verified),
      twoFactorEnabled: Boolean(userToEdit.two_factor_enabled),
      createdAt: userToEdit.created_at,
      lastLoginAt: userToEdit.last_login_at
    };
    const pageData = {
      userToEdit: editData,
      roles: ROLES,
      user: {
        name: user.email.split("@")[0] || user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderUserEditPage(pageData));
  } catch (error) {
    console.error("User edit page error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to load user!. Please try again.",
      dismissible: true
    }), 500);
  }
});
userRoutes.put("/users/:id", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const formData = await c.req.formData();
    const firstName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("first_name")?.toString());
    const lastName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("last_name")?.toString());
    const username = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("username")?.toString());
    const email = formData.get("email")?.toString()?.trim().toLowerCase() || "";
    const phone = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("phone")?.toString()) || null;
    const bio = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("bio")?.toString()) || null;
    const role = formData.get("role")?.toString() || "viewer";
    const isActive = formData.get("is_active") === "1";
    const emailVerified = formData.get("email_verified") === "1";
    if (!firstName || !lastName || !username || !email) {
      return c.html(renderAlert2({
        type: "error",
        message: "First name, last name, username, and email are required.",
        dismissible: true
      }));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.html(renderAlert2({
        type: "error",
        message: "Please enter a valid email address.",
        dismissible: true
      }));
    }
    const checkStmt = db.prepare(`
      SELECT id FROM users
      WHERE (username = ? OR email = ?) AND id != ?
    `);
    const existingUser = await checkStmt.bind(username, email, userId).first();
    if (existingUser) {
      return c.html(renderAlert2({
        type: "error",
        message: "Username or email is already taken by another user!.",
        dismissible: true
      }));
    }
    const updateStmt = db.prepare(`
      UPDATE users SET
        first_name = ?, last_name = ?, username = ?, email = ?,
        phone = ?, bio = ?, role = ?, is_active = ?, email_verified = ?,
        updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      firstName,
      lastName,
      username,
      email,
      phone,
      bio,
      role,
      isActive ? 1 : 0,
      emailVerified ? 1 : 0,
      Date.now(),
      userId
    ).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.update",
      "users",
      userId,
      { fields: ["first_name", "last_name", "username", "email", "phone", "bio", "role", "is_active", "email_verified"] },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.html(renderAlert2({
      type: "success",
      message: "User updated successfully!",
      dismissible: true
    }));
  } catch (error) {
    console.error("User update error:", error);
    return c.html(renderAlert2({
      type: "error",
      message: "Failed to update user!. Please try again.",
      dismissible: true
    }));
  }
});
userRoutes.delete("/users/:id", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const body = await c.req.json().catch(() => ({ hardDelete: false }));
    const hardDelete = body.hardDelete === true;
    if (userId === user.userId) {
      return c.json({ error: "You cannot delete your own account" }, 400);
    }
    const userStmt = db.prepare(`
      SELECT id, email FROM users WHERE id = ?
    `);
    const userToDelete = await userStmt.bind(userId).first();
    if (!userToDelete) {
      return c.json({ error: "User not found" }, 404);
    }
    if (hardDelete) {
      const deleteStmt = db.prepare(`
        DELETE FROM users WHERE id = ?
      `);
      await deleteStmt.bind(userId).run();
      await chunk4BJGEGX5_cjs.logActivity(
        db,
        user.userId,
        "user!.hard_delete",
        "users",
        userId,
        { email: userToDelete.email, permanent: true },
        c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
        c.req.header("user-agent")
      );
      return c.json({
        success: true,
        message: "User permanently deleted"
      });
    } else {
      const deleteStmt = db.prepare(`
        UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?
      `);
      await deleteStmt.bind(Date.now(), userId).run();
      await chunk4BJGEGX5_cjs.logActivity(
        db,
        user.userId,
        "user!.soft_delete",
        "users",
        userId,
        { email: userToDelete.email },
        c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
        c.req.header("user-agent")
      );
      return c.json({
        success: true,
        message: "User deactivated successfully"
      });
    }
  } catch (error) {
    console.error("User deletion error:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});
userRoutes.post("/invite-user", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const formData = await c.req.formData();
    const email = formData.get("email")?.toString()?.trim().toLowerCase() || "";
    const role = formData.get("role")?.toString()?.trim() || "viewer";
    const firstName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("first_name")?.toString());
    const lastName = chunkOQFE3DSZ_cjs.sanitizeInput(formData.get("last_name")?.toString());
    if (!email || !firstName || !lastName) {
      return c.json({ error: "Email, first name, and last name are required" }, 400);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: "Please enter a valid email address" }, 400);
    }
    const existingUserStmt = db.prepare(`
      SELECT id FROM users WHERE email = ?
    `);
    const existingUser = await existingUserStmt.bind(email).first();
    if (existingUser) {
      return c.json({ error: "A user with this email already exists" }, 400);
    }
    const invitationToken = globalThis.crypto.randomUUID();
    const invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1e3;
    const userId = globalThis.crypto.randomUUID();
    const createUserStmt = db.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, role, 
        invitation_token, invited_by, invited_at,
        is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await createUserStmt.bind(
      userId,
      email,
      firstName,
      lastName,
      role,
      invitationToken,
      user.userId,
      Date.now(),
      0,
      0,
      Date.now(),
      Date.now()
    ).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.invite_sent",
      "users",
      userId,
      { email, role, invited_user_id: userId },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    const invitationLink = `${c.req.header("origin") || "http://localhost:8787"}/auth/accept-invitation?token=${invitationToken}`;
    return c.json({
      success: true,
      message: "User invitation sent successfully",
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role
      },
      invitation_link: invitationLink
      // In production, this would be sent via email
    });
  } catch (error) {
    console.error("User invitation error:", error);
    return c.json({ error: "Failed to send user invitation" }, 500);
  }
});
userRoutes.post("/resend-invitation/:id", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, invitation_token
      FROM users 
      WHERE id = ? AND is_active = 0 AND invitation_token IS NOT NULL
    `);
    const invitedUser = await userStmt.bind(userId).first();
    if (!invitedUser) {
      return c.json({ error: "User not found or invitation not valid" }, 404);
    }
    const newInvitationToken = globalThis.crypto.randomUUID();
    const updateStmt = db.prepare(`
      UPDATE users SET 
        invitation_token = ?, 
        invited_at = ?, 
        updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      newInvitationToken,
      Date.now(),
      Date.now(),
      userId
    ).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.invitation_resent",
      "users",
      userId,
      { email: invitedUser.email },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    const invitationLink = `${c.req.header("origin") || "http://localhost:8787"}/auth/accept-invitation?token=${newInvitationToken}`;
    return c.json({
      success: true,
      message: "Invitation resent successfully",
      invitation_link: invitationLink
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    return c.json({ error: "Failed to resend invitation" }, 500);
  }
});
userRoutes.delete("/cancel-invitation/:id", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const userId = c.req.param("id");
  try {
    const userStmt = db.prepare(`
      SELECT id, email FROM users 
      WHERE id = ? AND is_active = 0 AND invitation_token IS NOT NULL
    `);
    const invitedUser = await userStmt.bind(userId).first();
    if (!invitedUser) {
      return c.json({ error: "User not found or invitation not valid" }, 404);
    }
    const deleteStmt = db.prepare(`DELETE FROM users WHERE id = ?`);
    await deleteStmt.bind(userId).run();
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "user!.invitation_cancelled",
      "users",
      userId,
      { email: invitedUser.email },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    return c.json({
      success: true,
      message: "Invitation cancelled successfully"
    });
  } catch (error) {
    console.error("Cancel invitation error:", error);
    return c.json({ error: "Failed to cancel invitation" }, 500);
  }
});
userRoutes.get("/activity-logs", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;
    const filters = {
      action: c.req.query("action") || "",
      resource_type: c.req.query("resource_type") || "",
      date_from: c.req.query("date_from") || "",
      date_to: c.req.query("date_to") || "",
      user_id: c.req.query("user_id") || ""
    };
    let whereConditions = [];
    let params = [];
    if (filters.action) {
      whereConditions.push("al.action = ?");
      params.push(filters.action);
    }
    if (filters.resource_type) {
      whereConditions.push("al.resource_type = ?");
      params.push(filters.resource_type);
    }
    if (filters.user_id) {
      whereConditions.push("al.user_id = ?");
      params.push(filters.user_id);
    }
    if (filters.date_from) {
      const fromTimestamp = new Date(filters.date_from).getTime();
      whereConditions.push("al.created_at >= ?");
      params.push(fromTimestamp);
    }
    if (filters.date_to) {
      const toTimestamp = (/* @__PURE__ */ new Date(filters.date_to + " 23:59:59")).getTime();
      whereConditions.push("al.created_at <= ?");
      params.push(toTimestamp);
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const logsStmt = db.prepare(`
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.email as user_email,
        COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const { results: logs } = await logsStmt.bind(...params, limit, offset).all();
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `);
    const countResult = await countStmt.bind(...params).first();
    const totalLogs = countResult?.total || 0;
    const formattedLogs = (logs || []).map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }));
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "activity.logs_viewed",
      void 0,
      void 0,
      { filters, page, limit },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    const pageData = {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: Math.ceil(totalLogs / limit)
      },
      filters,
      user: {
        name: user.email.split("@")[0] || user.email,
        // Use email username as fallback
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderActivityLogsPage(pageData));
  } catch (error) {
    console.error("Activity logs error:", error);
    const pageData = {
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      filters: {},
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      }
    };
    return c.html(renderActivityLogsPage(pageData));
  }
});
userRoutes.get("/activity-logs/export", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const filters = {
      action: c.req.query("action") || "",
      resource_type: c.req.query("resource_type") || "",
      date_from: c.req.query("date_from") || "",
      date_to: c.req.query("date_to") || "",
      user_id: c.req.query("user_id") || ""
    };
    let whereConditions = [];
    let params = [];
    if (filters.action) {
      whereConditions.push("al.action = ?");
      params.push(filters.action);
    }
    if (filters.resource_type) {
      whereConditions.push("al.resource_type = ?");
      params.push(filters.resource_type);
    }
    if (filters.user_id) {
      whereConditions.push("al.user_id = ?");
      params.push(filters.user_id);
    }
    if (filters.date_from) {
      const fromTimestamp = new Date(filters.date_from).getTime();
      whereConditions.push("al.created_at >= ?");
      params.push(fromTimestamp);
    }
    if (filters.date_to) {
      const toTimestamp = (/* @__PURE__ */ new Date(filters.date_to + " 23:59:59")).getTime();
      whereConditions.push("al.created_at <= ?");
      params.push(toTimestamp);
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    const logsStmt = db.prepare(`
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.email as user_email,
        COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 10000
    `);
    const { results: logs } = await logsStmt.bind(...params).all();
    const csvHeaders = ["Timestamp", "User", "Email", "Action", "Resource Type", "Resource ID", "IP Address", "Details"];
    const csvRows = [csvHeaders.join(",")];
    for (const log of logs || []) {
      const row = [
        `"${new Date(log.created_at).toISOString()}"`,
        `"${log.user_name || "Unknown"}"`,
        `"${log.user_email || "N/A"}"`,
        `"${log.action}"`,
        `"${log.resource_type || "N/A"}"`,
        `"${log.resource_id || "N/A"}"`,
        `"${log.ip_address || "N/A"}"`,
        `"${log.details ? JSON.stringify(JSON.parse(log.details)) : "N/A"}"`
      ];
      csvRows.push(row.join(","));
    }
    const csvContent = csvRows.join("\n");
    await chunk4BJGEGX5_cjs.logActivity(
      db,
      user.userId,
      "activity.logs_exported",
      void 0,
      void 0,
      { filters, count: logs?.length || 0 },
      c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip"),
      c.req.header("user-agent")
    );
    const filename = `activity-logs-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error("Activity logs export error:", error);
    return c.json({ error: "Failed to export activity logs" }, 500);
  }
});

// src/templates/components/media-grid.template.ts
function renderMediaGrid(data) {
  if (data.files.length === 0) {
    return `
      <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-zinc-950 dark:text-white">No media files</h3>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">${data.emptyMessage || "Get started by uploading your first file."}</p>
      </div>
    `;
  }
  const gridClass = data.viewMode === "list" ? "space-y-4" : "media-grid";
  return `
    <div class="${gridClass} ${data.className || ""}">
      ${data.files.map(
    (file) => renderMediaFileCard(file, data.viewMode, data.selectable)
  ).join("")}
    </div>
  `;
}
function renderMediaFileCard(file, viewMode = "grid", selectable = false) {
  if (viewMode === "list") {
    return `
      <div class="media-item rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 hover:shadow-md transition-all" data-file-id="${file.id}">
        <div class="flex items-center p-4">
          ${selectable ? `
            <div class="flex h-6 shrink-0 items-center mr-4">
              <div class="group grid size-4 grid-cols-1">
                <input type="checkbox" value="${file.id}" onchange="toggleFileSelection('${file.id}')" class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto media-checkbox" />
                <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                  <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                  <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                </svg>
              </div>
            </div>
          ` : ""}

          <div class="flex-shrink-0 mr-4">
            ${file.isImage ? `
              <img src="${file.thumbnail_url || file.public_url}" alt="${file.alt || file.original_name}"
                   class="w-16 h-16 object-cover rounded-lg ring-1 ring-zinc-950/10 dark:ring-white/10">
            ` : `
              <div class="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
                ${getFileIcon(file.mime_type)}
              </div>
            `}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-zinc-950 dark:text-white truncate" title="${file.original_name}">
                ${file.original_name}
              </h4>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-zinc-500 dark:text-zinc-400">${file.fileSize}</span>
                <button
                  class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  hx-get="/admin/media/${file.id}/details"
                  hx-target="#file-modal-content"
                  onclick="document.getElementById('file-modal').classList.remove('hidden')"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="mt-1 flex items-center text-sm text-zinc-500 dark:text-zinc-400">
              <span>${file.uploadedAt}</span>
              ${file.tags.length > 0 ? `
                <span class="mx-2">\u2022</span>
                <div class="flex items-center space-x-1">
                  ${file.tags.slice(0, 2).map(
      (tag) => `
                    <span class="inline-block px-2 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white">
                      ${tag}
                    </span>
                  `
    ).join("")}
                  ${file.tags.length > 2 ? `<span class="text-xs text-zinc-500 dark:text-zinc-400">+${file.tags.length - 2}</span>` : ""}
                </div>
              ` : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="media-item relative rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 hover:shadow-md transition-all duration-200 overflow-hidden group" data-file-id="${file.id}">
      ${selectable ? `
        <div class="absolute top-2 left-2 z-10">
          <div class="flex h-6 shrink-0 items-center">
            <div class="group grid size-4 grid-cols-1">
              <input type="checkbox" value="${file.id}" onchange="toggleFileSelection('${file.id}')" class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto media-checkbox" />
              <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
              </svg>
            </div>
          </div>
        </div>
      ` : ""}

      <div class="aspect-square relative">
        ${file.isImage ? `
          <img src="${file.thumbnail_url || file.public_url}" alt="${file.alt || file.original_name}"
               class="w-full h-full object-cover">
        ` : `
          <div class="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            ${getFileIcon(file.mime_type)}
          </div>
        `}

        <!-- Overlay actions -->
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div class="flex space-x-2">
            <button
              hx-get="/admin/media/${file.id}/details"
              hx-target="#file-modal-content"
              onclick="document.getElementById('file-modal').classList.remove('hidden')"
              class="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            <button
              onclick="event.stopPropagation(); copyToClipboard('${file.public_url}')"
              class="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="p-3">
        <h4 class="text-sm font-medium text-zinc-950 dark:text-white truncate" title="${file.original_name}">
          ${file.original_name}
        </h4>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-zinc-500 dark:text-zinc-400">${file.fileSize}</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400">${file.uploadedAt}</span>
        </div>
        ${file.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${file.tags.slice(0, 2).map(
    (tag) => `
              <span class="inline-block px-2 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white">
                ${tag}
              </span>
            `
  ).join("")}
            ${file.tags.length > 2 ? `<span class="text-xs text-zinc-500 dark:text-zinc-400">+${file.tags.length - 2}</span>` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}
function getFileIcon(mimeType) {
  if (mimeType.startsWith("image/")) {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    `;
  } else if (mimeType.startsWith("video/")) {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    `;
  } else if (mimeType === "application/pdf") {
    return `
      <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    `;
  } else {
    return `
      <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    `;
  }
}

// src/templates/pages/admin-media-library.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderMediaLibraryPage(data) {
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="sm:flex sm:items-center sm:justify-between mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Media Library</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage your media files and assets</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 flex gap-x-2">
          <button
            class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            onclick="document.getElementById('upload-modal').classList.remove('hidden')"
          >
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Upload Media
          </button>
        </div>
      </div>
      
      <div class="flex gap-6">
        <!-- Sidebar -->
        <div class="w-64 rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-6">
          <div class="space-y-6">
            <!-- Upload Button -->
            <div>
              <button
                class="w-full rounded-lg bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                onclick="document.getElementById('upload-modal').classList.remove('hidden')"
              >
                Upload Files
              </button>
            </div>

            <!-- Folders -->
            <div>
              <h3 class="text-sm font-medium text-zinc-950 dark:text-white mb-3">Folders</h3>
              <ul class="space-y-1">
                <li>
                  <a href="/admin/media?folder=all"
                     class="block px-3 py-2 text-sm rounded-lg transition-colors ${data.currentFolder === "all" ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}">
                    All Files (${data.totalFiles})
                  </a>
                </li>
                ${data.folders.map(
    (folder) => `
                  <li>
                    <a href="/admin/media?folder=${folder.folder}"
                       class="block px-3 py-2 text-sm rounded-lg transition-colors ${data.currentFolder === folder.folder ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}">
                      ${folder.folder} (${folder.count})
                    </a>
                  </li>
                `
  ).join("")}
              </ul>
            </div>

            <!-- File Types -->
            <div>
              <h3 class="text-sm font-medium text-zinc-950 dark:text-white mb-3">File Types</h3>
              <ul class="space-y-1">
                <li>
                  <a href="/admin/media?type=all"
                     class="block px-3 py-2 text-sm rounded-lg transition-colors ${data.currentType === "all" ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}">
                    All Types
                  </a>
                </li>
                ${data.types.map(
    (type) => `
                  <li>
                    <a href="/admin/media?type=${type.type}"
                       class="block px-3 py-2 text-sm rounded-lg transition-colors ${data.currentType === type.type ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}">
                      ${type.type.charAt(0).toUpperCase() + type.type.slice(1)} (${type.count})
                    </a>
                  </li>
                `
  ).join("")}
              </ul>
            </div>

            <!-- Quick Actions -->
            <div>
              <h3 class="text-sm font-medium text-zinc-950 dark:text-white mb-3">Quick Actions</h3>
              <div class="space-y-2">
                <button
                  onclick="openCreateFolderModal()"
                  class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                  Create Folder
                </button>
                <button
                  class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                  hx-delete="/media/cleanup"
                  hx-confirm="Delete unused files?"
                >
                  Cleanup Unused
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="flex-1">
          <!-- Toolbar -->
          <div class="relative rounded-xl mb-6 z-10">
            <!-- Gradient Background -->
            <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-pink-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-pink-400/20 dark:to-purple-400/20"></div>

            <div class="relative bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
              <div class="px-6 py-5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                      <label class="text-sm/6 font-medium text-zinc-950 dark:text-white">View:</label>
                      <div class="grid grid-cols-1">
                        <select
                          class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-cyan-500/30 dark:outline-cyan-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-500 dark:focus-visible:outline-cyan-400 sm:text-sm/6 min-w-32"
                          onchange="window.location.href = updateUrlParam('view', this.value)"
                        >
                          <option value="grid" ${data.currentView === "grid" ? "selected" : ""}>Grid</option>
                          <option value="list" ${data.currentView === "list" ? "selected" : ""}>List</option>
                        </select>
                        <svg class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-500 dark:text-zinc-400 sm:size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </div>

                    <div class="relative group">
                      <input
                        type="text"
                        id="media-search-input"
                        name="search"
                        placeholder="Search files..."
                        oninput="toggleMediaClearButton()"
                        class="rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 pl-11 pr-10 text-sm w-72 text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-zinc-800 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                        hx-get="/admin/media/search"
                        hx-trigger="keyup changed delay:300ms"
                        hx-target="#media-grid"
                        hx-include="[name='folder'], [name='type']"
                      >
                      <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                        <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                      </div>
                      <button
                        type="button"
                        id="clear-media-search"
                        class="hidden absolute right-3 top-2.5 p-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                        onclick="clearMediaSearch()"
                        title="Clear search"
                      >
                        <svg class="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                      <input type="hidden" name="folder" value="${data.currentFolder}">
                      <input type="hidden" name="type" value="${data.currentType}">
                    </div>
                  </div>

                  <div class="flex items-center gap-x-3">
                    <span class="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm">${data.files.length} files</span>
                    <button
                      id="select-all-btn"
                      class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-pink-50 dark:hover:from-cyan-900/30 dark:hover:to-pink-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200"
                      onclick="toggleSelectAll()"
                    >
                      Select All
                    </button>
                    <div class="relative inline-block z-50" id="bulk-actions-dropdown">
                      <button
                        id="bulk-actions-btn"
                        onclick="toggleBulkActionsDropdown()"
                        class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/60 backdrop-blur-sm text-zinc-400 dark:text-zinc-600 text-sm font-medium rounded-full ring-1 ring-inset ring-zinc-200/50 dark:ring-zinc-700/50 cursor-not-allowed"
                        disabled
                      >
                        Bulk Actions
                        <svg viewBox="0 0 20 20" fill="currentColor" class="size-4">
                          <path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                        </svg>
                      </button>

                      <div
                        id="bulk-actions-menu"
                        class="hidden absolute right-0 mt-2 w-56 origin-top-right divide-y divide-zinc-200 dark:divide-white/10 rounded-lg bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 transition-all duration-100 scale-95 opacity-0 z-50"
                        style="transition-behavior: allow-discrete;"
                      >
                        <div class="py-1">
                          <button
                            onclick="openMoveToFolderModal()"
                            class="group/item flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-950 dark:hover:text-white transition-colors"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" class="mr-3 size-5 text-zinc-400 dark:text-zinc-500 group-hover/item:text-zinc-950 dark:group-hover/item:text-white">
                              <path d="M2 6a2 2 0 0 1 2-2h5.532a2 2 0 0 1 1.536.72l1.9 2.28a1 1 0 0 0 .768.36H17a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" />
                            </svg>
                            Move to Folder
                          </button>
                        </div>
                        <div class="py-1">
                          <button
                            onclick="confirmBulkDelete()"
                            class="group/item flex w-full items-center px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" class="mr-3 size-5 text-zinc-400 dark:text-zinc-500 group-hover/item:text-red-600 dark:group-hover/item:text-red-400">
                              <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" fill-rule="evenodd" />
                            </svg>
                            Delete Selected Files
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Media Grid -->
          <div id="media-grid">
            ${renderMediaGrid({
    files: data.files,
    viewMode: data.currentView,
    selectable: true,
    emptyMessage: "No media files found. Upload your first file to get started."
  })}
          </div>
          
          <!-- Pagination -->
          ${data.hasNextPage ? `
            <div class="mt-6 flex justify-center">
              <div class="flex space-x-2">
                ${data.currentPage > 1 ? `
                  <a href="${buildPageUrl(
    data.currentPage - 1,
    data.currentFolder,
    data.currentType
  )}"
                     class="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                    Previous
                  </a>
                ` : ""}
                <span class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Page ${data.currentPage}</span>
                <a href="${buildPageUrl(
    data.currentPage + 1,
    data.currentFolder,
    data.currentType
  )}"
                   class="rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                  Next
                </a>
              </div>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
    
    <!-- Upload Modal -->
    <div id="upload-modal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 w-full max-w-2xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Upload Files</h3>
          <button onclick="document.getElementById('upload-modal').classList.add('hidden')" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Upload Form -->
        <form 
          id="upload-form"
          hx-post="/admin/media/upload"
          hx-encoding="multipart/form-data"
          hx-target="#upload-results"
          class="space-y-4"
        >
          <!-- Drag and Drop Zone -->
          <div
            id="upload-zone"
            class="upload-zone border-2 border-dashed border-zinc-950/10 dark:border-white/20 rounded-xl p-8 text-center cursor-pointer bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onclick="document.getElementById('file-input').click()"
          >
            <svg class="mx-auto h-12 w-12 text-zinc-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="mt-4">
              <p class="text-lg text-zinc-950 dark:text-white">Drop files here or click to upload</p>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">PNG, JPG, GIF, PDF up to 10MB</p>
            </div>
          </div>
          
          <input 
            type="file" 
            id="file-input" 
            name="files" 
            multiple 
            accept="image/*,application/pdf,text/plain"
            class="hidden"
            onchange="handleFileSelect(this.files)"
          >
          
          <!-- Folder Selection -->
          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Upload to folder:</label>
            <select name="folder" class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow">
              <option value="uploads">uploads</option>
              <option value="images">images</option>
              <option value="documents">documents</option>
            </select>
          </div>

          <!-- File List -->
          <div id="file-list" class="hidden">
            <h4 class="text-sm font-medium text-zinc-950 dark:text-white mb-2">Selected Files:</h4>
            <div id="selected-files" class="space-y-2 max-h-40 overflow-y-auto"></div>
          </div>

          <!-- Upload Button -->
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              onclick="document.getElementById('upload-modal').classList.add('hidden')"
              class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="upload-btn"
              class="rounded-lg bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-sm"
              disabled
            >
              Upload Files
            </button>
          </div>
        </form>
        
        <!-- Upload Results -->
        <div id="upload-results" class="mt-4"></div>
      </div>
    </div>
    
    <!-- File Details Modal -->
    <div id="file-modal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div id="file-modal-content" class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
        <!-- Content loaded via HTMX -->
      </div>
    </div>

    <!-- Move to Folder Modal -->
    <div id="move-to-folder-modal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Move to Folder</h3>
          <button onclick="closeMoveToFolderModal()" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Select a folder to move <span id="move-file-count" class="font-medium text-zinc-950 dark:text-white">0</span> selected file(s) to:
        </p>

        <div class="space-y-2 mb-6">
          ${data.folders.length > 0 ? data.folders.map(
    (folder) => `
            <button
              onclick="performBulkMove('${folder.folder}')"
              class="w-full text-left px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-950 dark:text-white transition-colors ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium">${folder.folder}</span>
                <span class="text-sm text-zinc-500 dark:text-zinc-400">${folder.count} files</span>
              </div>
            </button>
          `
  ).join("") : '<p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">No folders available</p>'}
        </div>

        <div class="flex justify-end space-x-2">
          <button
            onclick="closeMoveToFolderModal()"
            class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Create Folder Modal -->
    <div id="create-folder-modal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 p-6 w-full max-w-md">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">Create New Folder</h3>
          <button onclick="closeCreateFolderModal()" aria-label="Close" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onsubmit="createNewFolder(event)" class="space-y-4">
          <div>
            <label for="folder-name" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">
              Folder Name
            </label>
            <input
              type="text"
              id="folder-name"
              name="folderName"
              placeholder="e.g., images, documents"
              required
              pattern="[a-z0-9-_]+"
              title="Only lowercase letters, numbers, hyphens, and underscores allowed"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 transition-shadow"
            >
            <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Use lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div class="flex justify-end space-x-2">
            <button
              type="button"
              onclick="closeCreateFolderModal()"
              class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-lg bg-zinc-950 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>

    <style>
      .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
      .media-item { position: relative; border-radius: 8px; overflow: hidden; transition: transform 0.2s; }
      .media-item:hover { transform: scale(1.02); }
      .media-item.selected { ring: 2px solid rgba(255, 255, 255, 0.4); }
      .upload-zone { border: 2px dashed rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.1); min-height: 200px; }
      .upload-zone.dragover { border-color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.2); }
      .file-icon { width: 48px; height: 48px; }
      .preview-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); opacity: 0; transition: opacity 0.2s; }
      .media-item:hover .preview-overlay { opacity: 1; }
    </style>
    
    <script>
      let selectedFiles = new Set();
      let dragDropFiles = [];
      
      // File selection handling
      function toggleFileSelection(fileId) {
        if (selectedFiles.has(fileId)) {
          selectedFiles.delete(fileId);
          document.querySelector(\`[data-file-id="\${fileId}"]\`).classList.remove('selected');
        } else {
          selectedFiles.add(fileId);
          document.querySelector(\`[data-file-id="\${fileId}"]\`).classList.add('selected');
        }
        updateBulkActionsButton();
      }
      
      function toggleSelectAll() {
        const allItems = document.querySelectorAll('[data-file-id]');
        if (selectedFiles.size === allItems.length) {
          selectedFiles.clear();
          allItems.forEach(item => item.classList.remove('selected'));
          document.getElementById('select-all-btn').textContent = 'Select All';
        } else {
          allItems.forEach(item => {
            const fileId = item.dataset.fileId;
            selectedFiles.add(fileId);
            item.classList.add('selected');
          });
          document.getElementById('select-all-btn').textContent = 'Deselect All';
        }
        updateBulkActionsButton();
      }
      
      function updateBulkActionsButton() {
        const btn = document.getElementById('bulk-actions-btn');
        const chevronIcon = btn.querySelector('svg');

        if (selectedFiles.size > 0) {
          btn.disabled = false;
          btn.className = 'inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200';
          btn.innerHTML = \`Actions (\${selectedFiles.size}) <svg viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>\`;
          // Re-attach onclick handler after innerHTML update
          btn.onclick = toggleBulkActionsDropdown;
        } else {
          btn.disabled = true;
          btn.className = 'inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-zinc-100/60 dark:bg-zinc-800/60 backdrop-blur-sm text-zinc-400 dark:text-zinc-600 text-sm font-medium rounded-full ring-1 ring-inset ring-zinc-200/50 dark:ring-zinc-700/50 cursor-not-allowed';
          btn.innerHTML = \`Bulk Actions <svg viewBox="0 0 20 20" fill="currentColor" class="size-4"><path d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" /></svg>\`;
          btn.onclick = null; // Remove handler when disabled
          // Hide menu when no files selected
          const menu = document.getElementById('bulk-actions-menu');
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0', 'hidden');
        }
      }

      function toggleBulkActionsDropdown() {
        const menu = document.getElementById('bulk-actions-menu');
        const isHidden = menu.classList.contains('hidden');

        if (isHidden) {
          menu.classList.remove('hidden');
          setTimeout(() => {
            menu.classList.remove('scale-95', 'opacity-0');
            menu.classList.add('scale-100', 'opacity-100');
          }, 10);
        } else {
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            menu.classList.add('hidden');
          }, 100);
        }
      }
      
      function confirmBulkDelete() {
        if (selectedFiles.size === 0) return;
        showConfirmDialog('media-bulk-delete-confirm');
      }

      async function performBulkDelete() {
        if (selectedFiles.size === 0) return;

        try {
          // Show loading state
          const btn = document.getElementById('bulk-actions-btn');
          const originalText = btn.innerHTML;
          btn.innerHTML = 'Deleting...';
          btn.disabled = true;

          // Hide menu
          const menu = document.getElementById('bulk-actions-menu');
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0');
          setTimeout(() => menu.classList.add('hidden'), 100);
          
          const response = await fetch('/api/media/bulk-delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileIds: Array.from(selectedFiles)
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Show success notification
            showNotification(\`Successfully deleted \${result.summary.successful} file\${result.summary.successful > 1 ? 's' : ''}\`, 'success');
            
            // Remove deleted files from DOM
            result.deleted.forEach(item => {
              const element = document.querySelector(\`[data-file-id="\${item.fileId}"]\`);
              if (element) {
                element.remove();
              }
            });
            
            // Show errors if any
            if (result.errors.length > 0) {
              console.warn('Some files failed to delete:', result.errors);
              showNotification(\`\${result.errors.length} file\${result.errors.length > 1 ? 's' : ''} failed to delete\`, 'warning');
            }
            
            // Clear selection
            selectedFiles.clear();
            updateBulkActionsButton();
            document.getElementById('select-all-btn').textContent = 'Select All';
          } else {
            showNotification('Failed to delete files', 'error');
          }
        } catch (error) {
          console.error('Bulk delete error:', error);
          showNotification('An error occurred while deleting files', 'error');
        } finally {
          // Reset button state
          updateBulkActionsButton();
        }
      }
      
      function openMoveToFolderModal() {
        if (selectedFiles.size === 0) return;

        // Update file count in modal
        document.getElementById('move-file-count').textContent = selectedFiles.size.toString();

        // Show modal
        document.getElementById('move-to-folder-modal').classList.remove('hidden');

        // Hide bulk actions menu
        const menu = document.getElementById('bulk-actions-menu');
        menu.classList.remove('scale-100', 'opacity-100');
        menu.classList.add('scale-95', 'opacity-0');
        setTimeout(() => menu.classList.add('hidden'), 100);
      }

      function closeMoveToFolderModal() {
        document.getElementById('move-to-folder-modal').classList.add('hidden');
      }

      function openCreateFolderModal() {
        document.getElementById('create-folder-modal').classList.remove('hidden');
        // Clear and focus the input
        const input = document.getElementById('folder-name');
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }

      function closeCreateFolderModal() {
        document.getElementById('create-folder-modal').classList.add('hidden');
      }

      async function createNewFolder(event) {
        event.preventDefault();

        const folderName = document.getElementById('folder-name').value.trim();

        if (!folderName) {
          showNotification('Please enter a folder name', 'error');
          return;
        }

        // Validate folder name format
        const folderPattern = /^[a-z0-9-_]+$/;
        if (!folderPattern.test(folderName)) {
          showNotification('Folder name can only contain lowercase letters, numbers, hyphens, and underscores', 'error');
          return;
        }

        try {
          const response = await fetch('/api/media/create-folder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ folderName })
          });

          const result = await response.json();

          if (result.success) {
            showNotification(\`Folder "\${folderName}" created successfully\`, 'success');
            closeCreateFolderModal();

            // Reload the page to show the new folder (delay to allow notification to show)
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            showNotification(result.error || 'Failed to create folder', 'error');
          }
        } catch (error) {
          console.error('Create folder error:', error);
          showNotification('An error occurred while creating the folder', 'error');
        }
      }

      async function performBulkMove(targetFolder) {
        if (selectedFiles.size === 0) return;

        try {
          // Show loading state
          closeMoveToFolderModal();
          const btn = document.getElementById('bulk-actions-btn');
          const originalText = btn.innerHTML;
          btn.innerHTML = 'Moving...';
          btn.disabled = true;

          const response = await fetch('/api/media/bulk-move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileIds: Array.from(selectedFiles),
              folder: targetFolder
            })
          });

          const result = await response.json();

          if (result.success) {
            // Show success notification
            const movedCount = result.summary.successful;
            showNotification(\`Successfully moved \${movedCount} file\${movedCount > 1 ? 's' : ''} to \${targetFolder}\`, 'success');

            // Reload the page to show updated file locations
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            showNotification('Failed to move files', 'error');
            updateBulkActionsButton();
          }
        } catch (error) {
          console.error('Bulk move error:', error);
          showNotification('An error occurred while moving files', 'error');
          updateBulkActionsButton();
        }
      }

      function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' :
                       type === 'warning' ? 'bg-yellow-600' :
                       type === 'error' ? 'bg-red-600' : 'bg-blue-600';

        notification.className = \`fixed top-4 right-4 \${bgColor} text-white px-4 py-3 rounded-lg shadow-xl ring-1 ring-white/10 z-50 transition-all transform translate-x-full\`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
          notification.classList.remove('translate-x-full');
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
          notification.classList.add('translate-x-full');
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 300);
        }, 3000);
      }
      
      // URL parameter helpers
      function updateUrlParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        return url.toString();
      }
      
      // Drag and drop handling
      const uploadZone = document.getElementById('upload-zone');
      
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
      });
      
      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'), false);
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'), false);
      });
      
      uploadZone.addEventListener('drop', handleDrop, false);
      
      function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFileSelect(files);
      }
      
      function handleFileSelect(files) {
        dragDropFiles = Array.from(files);
        
        // Update the actual file input with the selected files
        const fileInput = document.getElementById('file-input');
        const dt = new DataTransfer();
        dragDropFiles.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        displaySelectedFiles();
        document.getElementById('upload-btn').disabled = false;
      }
      
      function displaySelectedFiles() {
        const fileList = document.getElementById('file-list');
        const selectedFilesDiv = document.getElementById('selected-files');

        selectedFilesDiv.innerHTML = '';

        dragDropFiles.forEach((file, index) => {
          const fileItem = document.createElement('div');
          fileItem.className = 'flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10';
          fileItem.innerHTML = \`
            <div class="flex items-center space-x-2">
              <span class="text-sm text-zinc-950 dark:text-white">\${file.name}</span>
              <span class="text-xs text-zinc-500 dark:text-zinc-400">(\${formatFileSize(file.size)})</span>
            </div>
            <button onclick="removeFile(\${index})" class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          \`;
          selectedFilesDiv.appendChild(fileItem);
        });

        fileList.classList.toggle('hidden', dragDropFiles.length === 0);
      }
      
      function removeFile(index) {
        dragDropFiles.splice(index, 1);
        displaySelectedFiles();
        
        const fileInput = document.getElementById('file-input');
        const dt = new DataTransfer();
        dragDropFiles.forEach(file => dt.items.add(file));
        fileInput.files = dt.files;
        
        document.getElementById('upload-btn').disabled = dragDropFiles.length === 0;
      }
      
      function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      }
      
      // Copy to clipboard function
      function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-xl ring-1 ring-white/10 z-50';
          notification.textContent = 'URL copied to clipboard!';
          document.body.appendChild(notification);
          setTimeout(() => document.body.removeChild(notification), 2000);
        }).catch(err => {
          console.error('Failed to copy: ', err);
        });
      }

      // Toggle clear button visibility
      function toggleMediaClearButton() {
        const searchInput = document.getElementById('media-search-input');
        const clearButton = document.getElementById('clear-media-search');
        if (searchInput.value.trim()) {
          clearButton.classList.remove('hidden');
        } else {
          clearButton.classList.add('hidden');
        }
      }

      // Clear search input
      function clearMediaSearch() {
        const searchInput = document.getElementById('media-search-input');
        searchInput.value = '';
        toggleMediaClearButton();
        // Trigger htmx to refresh the grid
        htmx.trigger(searchInput, 'keyup');
      }

      // Initialize clear button visibility on page load
      document.addEventListener('DOMContentLoaded', function() {
        toggleMediaClearButton();
      });

      // Close modal when clicking outside
      document.getElementById('file-modal').addEventListener('click', function(e) {
        if (e.target === this) {
          this.classList.add('hidden');
        }
      });
      
      // Close bulk actions dropdown when clicking outside
      document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('bulk-actions-dropdown');
        const menu = document.getElementById('bulk-actions-menu');
        if (dropdown && menu && !dropdown.contains(e.target)) {
          menu.classList.remove('scale-100', 'opacity-100');
          menu.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            menu.classList.add('hidden');
          }, 100);
        }
      });
    </script>

    <!-- Confirmation Dialog for Bulk Delete -->
    ${renderConfirmationDialog2({
    id: "media-bulk-delete-confirm",
    title: "Delete Selected Files",
    message: `Are you sure you want to delete ${data.files.length > 0 ? "the selected files" : "these files"}? This action cannot be undone and the files will be permanently removed.`,
    confirmText: "Delete Files",
    cancelText: "Cancel",
    confirmClass: "bg-red-500 hover:bg-red-400",
    iconColor: "red",
    onConfirm: "performBulkDelete()"
  })}

    <!-- Confirmation Dialog Script -->
    ${getConfirmationDialogScript2()}
  `;
  function buildPageUrl(page, folder, type) {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    if (folder !== "all") params.set("folder", folder);
    if (type !== "all") params.set("type", type);
    return `/admin/media?${params.toString()}`;
  }
  const layoutData = {
    title: "Media Library",
    pageTitle: "Media Library",
    currentPath: "/admin/media",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/components/media-file-details.template.ts
function renderMediaFileDetails(data) {
  const { file } = data;
  return `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">File Details</h3>
      <button onclick="document.getElementById('file-modal').classList.add('hidden')" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Preview -->
      <div class="space-y-4">
        <div class="rounded-xl bg-zinc-50 dark:bg-zinc-800 p-4">
          ${file.isImage ? `
            <img src="${file.public_url}" alt="${file.alt || file.filename}" class="w-full h-auto rounded-lg">
          ` : file.isVideo ? `
            <video src="${file.public_url}" controls class="w-full h-auto rounded-lg"></video>
          ` : `
            <div class="flex items-center justify-center h-32">
              <svg class="w-12 h-12 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          `}
        </div>

        <div class="text-center space-x-2">
          <button
            onclick="copyToClipboard('${file.public_url}')"
            class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Copy URL
          </button>
          <a
            href="${file.public_url}"
            target="_blank"
            class="inline-flex items-center rounded-lg bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Open Original
          </a>
        </div>
      </div>
      
      <!-- Details -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Filename</label>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.original_name}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Size</label>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.fileSize}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Type</label>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.mime_type}</p>
          </div>
        </div>

        ${file.width && file.height ? `
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Width</label>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.width}px</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Height</label>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.height}px</p>
            </div>
          </div>
        ` : ""}

        <div>
          <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Folder</label>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.folder}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Uploaded</label>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">${file.uploadedAt}</p>
        </div>

        <!-- Editable Fields -->
        <form hx-put="/admin/media/${file.id}" hx-target="#file-modal-content" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Alt Text</label>
            <input
              type="text"
              name="alt"
              value="${file.alt || ""}"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="Describe this image..."
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Caption</label>
            <textarea
              name="caption"
              rows="3"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="Optional caption..."
            >${file.caption || ""}</textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-1">Tags</label>
            <input
              type="text"
              name="tags"
              value="${file.tags.join(", ")}"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="tag1, tag2, tag3"
            >
          </div>

          <div class="flex justify-between">
            <button
              type="submit"
              class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              type="button"
              hx-delete="/admin/media/${file.id}"
              hx-confirm="Are you sure you want to delete this file?"
              hx-target="body"
              class="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Delete File
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// src/routes/admin-media.ts
var fileValidationSchema2 = zod.z.object({
  name: zod.z.string().min(1).max(255),
  type: zod.z.string().refine(
    (type) => {
      const allowedTypes = [
        // Images
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        // Documents
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Videos
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
        // Audio
        "audio/mp3",
        "audio/wav",
        "audio/ogg",
        "audio/m4a"
      ];
      return allowedTypes.includes(type);
    },
    { message: "Unsupported file type" }
  ),
  size: zod.z.number().min(1).max(50 * 1024 * 1024)
  // 50MB max
});
var adminMediaRoutes = new hono.Hono();
adminMediaRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
adminMediaRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const { searchParams } = new URL(c.req.url);
    const folder = searchParams.get("folder") || "all";
    const type = searchParams.get("type") || "all";
    const view = searchParams.get("view") || "grid";
    const page = parseInt(searchParams.get("page") || "1");
    const cacheBust = searchParams.get("t");
    const limit = 24;
    const offset = (page - 1) * limit;
    const db = c.env.DB;
    let query = "SELECT * FROM media";
    const params = [];
    const conditions = ["deleted_at IS NULL"];
    if (folder !== "all") {
      conditions.push("folder = ?");
      params.push(folder);
    }
    if (type !== "all") {
      switch (type) {
        case "images":
          conditions.push("mime_type LIKE ?");
          params.push("image/%");
          break;
        case "documents":
          conditions.push("mime_type IN (?, ?, ?)");
          params.push("application/pdf", "text/plain", "application/msword");
          break;
        case "videos":
          conditions.push("mime_type LIKE ?");
          params.push("video/%");
          break;
      }
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` ORDER BY uploaded_at DESC LIMIT ${limit} OFFSET ${offset}`;
    const stmt = db.prepare(query);
    const { results } = await stmt.bind(...params).all();
    const foldersStmt = db.prepare(`
      SELECT folder, COUNT(*) as count, SUM(size) as totalSize
      FROM media 
      GROUP BY folder 
      ORDER BY folder
    `);
    const { results: folders } = await foldersStmt.all();
    const typesStmt = db.prepare(`
      SELECT 
        CASE 
          WHEN mime_type LIKE 'image/%' THEN 'images'
          WHEN mime_type LIKE 'video/%' THEN 'videos'
          WHEN mime_type IN ('application/pdf', 'text/plain') THEN 'documents'
          ELSE 'other'
        END as type,
        COUNT(*) as count
      FROM media 
      GROUP BY type
    `);
    const { results: types } = await typesStmt.all();
    const mediaFiles = results.map((row) => ({
      id: row.id,
      filename: row.filename,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size: row.size,
      public_url: `/files/${row.r2_key}`,
      thumbnail_url: row.mime_type.startsWith("image/") ? `/files/${row.r2_key}` : void 0,
      alt: row.alt,
      caption: row.caption,
      tags: row.tags ? JSON.parse(row.tags) : [],
      uploaded_at: row.uploaded_at,
      fileSize: formatFileSize(row.size),
      uploadedAt: new Date(row.uploaded_at).toLocaleDateString(),
      isImage: row.mime_type.startsWith("image/"),
      isVideo: row.mime_type.startsWith("video/"),
      isDocument: !row.mime_type.startsWith("image/") && !row.mime_type.startsWith("video/")
    }));
    const pageData = {
      files: mediaFiles,
      folders: folders.map((f) => ({
        folder: f.folder,
        count: f.count,
        totalSize: f.totalSize
      })),
      types: types.map((t) => ({
        type: t.type,
        count: t.count
      })),
      currentFolder: folder,
      currentType: type,
      currentView: view,
      currentPage: page,
      totalFiles: results.length,
      hasNextPage: results.length === limit,
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      },
      version: c.get("appVersion")
    };
    return c.html(renderMediaLibraryPage(pageData));
  } catch (error) {
    console.error("Error loading media library:", error);
    return c.html(html.html`<p>Error loading media library</p>`);
  }
});
adminMediaRoutes.get("/selector", async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const search = searchParams.get("search") || "";
    const db = c.env.DB;
    let query = "SELECT * FROM media WHERE deleted_at IS NULL";
    const params = [];
    if (search.trim()) {
      query += " AND (filename LIKE ? OR original_name LIKE ? OR alt LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    query += " ORDER BY uploaded_at DESC LIMIT 24";
    const stmt = db.prepare(query);
    const { results } = await stmt.bind(...params).all();
    const mediaFiles = results.map((row) => ({
      id: row.id,
      filename: row.filename,
      original_name: row.original_name,
      mime_type: row.mime_type,
      size: row.size,
      public_url: `/files/${row.r2_key}`,
      thumbnail_url: row.mime_type.startsWith("image/") ? `/files/${row.r2_key}` : void 0,
      alt: row.alt,
      tags: row.tags ? JSON.parse(row.tags) : [],
      uploaded_at: row.uploaded_at,
      fileSize: formatFileSize(row.size),
      uploadedAt: new Date(row.uploaded_at).toLocaleDateString(),
      isImage: row.mime_type.startsWith("image/"),
      isVideo: row.mime_type.startsWith("video/"),
      isDocument: !row.mime_type.startsWith("image/") && !row.mime_type.startsWith("video/")
    }));
    return c.html(html.html`
      <div class="mb-4">
        <input
          type="search"
          id="media-selector-search"
          placeholder="Search files..."
          class="w-full rounded-lg bg-white dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-950 dark:text-white shadow-sm ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white transition-shadow"
          hx-get="/admin/media/selector"
          hx-trigger="keyup changed delay:300ms"
          hx-target="#media-selector-grid"
          hx-include="[name='search']"
        >
      </div>

      <div id="media-selector-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        ${html.raw(mediaFiles.map((file) => `
          <div
            class="relative group cursor-pointer rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow"
            data-media-id="${file.id}"
          >
            <div class="aspect-square relative">
              ${file.isImage ? `
                <img
                  src="${file.public_url}"
                  alt="${file.alt || file.filename}"
                  class="w-full h-full object-cover"
                  loading="lazy"
                >
              ` : file.isVideo ? `
                <video
                  src="${file.public_url}"
                  class="w-full h-full object-cover"
                  muted
                ></video>
              ` : `
                <div class="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-700">
                  <div class="text-center">
                    <svg class="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">${file.filename.split(".").pop()?.toUpperCase()}</span>
                  </div>
                </div>
              `}

              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onclick="selectMediaFile('${file.id}', '${file.public_url.replace(/'/g, "\\'")}', '${file.filename.replace(/'/g, "\\'")}')"
                  class="px-4 py-2 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Select
                </button>
              </div>
            </div>

            <div class="p-2">
              <p class="text-xs text-zinc-700 dark:text-zinc-300 truncate" title="${file.original_name}">
                ${file.original_name}
              </p>
              <p class="text-xs text-zinc-500 dark:text-zinc-400">
                ${file.fileSize}
              </p>
            </div>
          </div>
        `).join(""))}
      </div>

      ${mediaFiles.length === 0 ? html.html`
        <div class="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p class="mt-2">No media files found</p>
        </div>
      ` : ""}
    `);
  } catch (error) {
    console.error("Error loading media selector:", error);
    return c.html(html.html`<div class="text-red-500 dark:text-red-400">Error loading media files</div>`);
  }
});
adminMediaRoutes.get("/search", async (c) => {
  try {
    const { searchParams } = new URL(c.req.url);
    const search = searchParams.get("search") || "";
    const folder = searchParams.get("folder") || "all";
    const type = searchParams.get("type") || "all";
    const db = c.env.DB;
    let query = "SELECT * FROM media";
    const params = [];
    const conditions = [];
    if (search.trim()) {
      conditions.push("(filename LIKE ? OR original_name LIKE ? OR alt LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (folder !== "all") {
      conditions.push("folder = ?");
      params.push(folder);
    }
    if (type !== "all") {
      switch (type) {
        case "images":
          conditions.push("mime_type LIKE ?");
          params.push("image/%");
          break;
        case "documents":
          conditions.push("mime_type IN (?, ?, ?)");
          params.push("application/pdf", "text/plain", "application/msword");
          break;
        case "videos":
          conditions.push("mime_type LIKE ?");
          params.push("video/%");
          break;
      }
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` ORDER BY uploaded_at DESC LIMIT 24`;
    const stmt = db.prepare(query);
    const { results } = await stmt.bind(...params).all();
    const mediaFiles = results.map((row) => ({
      ...row,
      public_url: `/files/${row.r2_key}`,
      thumbnail_url: row.mime_type.startsWith("image/") ? `/files/${row.r2_key}` : void 0,
      tags: row.tags ? JSON.parse(row.tags) : [],
      uploadedAt: new Date(row.uploaded_at).toLocaleDateString(),
      fileSize: formatFileSize(row.size),
      isImage: row.mime_type.startsWith("image/"),
      isVideo: row.mime_type.startsWith("video/"),
      isDocument: !row.mime_type.startsWith("image/") && !row.mime_type.startsWith("video/")
    }));
    const gridHTML = mediaFiles.map((file) => generateMediaItemHTML(file)).join("");
    return c.html(html.raw(gridHTML));
  } catch (error) {
    console.error("Error searching media:", error);
    return c.html('<div class="text-red-500">Error searching files</div>');
  }
});
adminMediaRoutes.get("/:id/details", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const stmt = db.prepare("SELECT * FROM media WHERE id = ?");
    const result = await stmt.bind(id).first();
    if (!result) {
      return c.html('<div class="text-red-500">File not found</div>');
    }
    const file = {
      id: result.id,
      filename: result.filename,
      original_name: result.original_name,
      mime_type: result.mime_type,
      size: result.size,
      public_url: `/files/${result.r2_key}`,
      thumbnail_url: result.mime_type.startsWith("image/") ? `/files/${result.r2_key}` : void 0,
      alt: result.alt,
      caption: result.caption,
      tags: result.tags ? JSON.parse(result.tags) : [],
      uploaded_at: result.uploaded_at,
      fileSize: formatFileSize(result.size),
      uploadedAt: new Date(result.uploaded_at).toLocaleString(),
      isImage: result.mime_type.startsWith("image/"),
      isVideo: result.mime_type.startsWith("video/"),
      isDocument: !result.mime_type.startsWith("image/") && !result.mime_type.startsWith("video/"),
      width: result.width,
      height: result.height,
      folder: result.folder
    };
    const detailsData = { file };
    return c.html(renderMediaFileDetails(detailsData));
  } catch (error) {
    console.error("Error fetching file details:", error);
    return c.html('<div class="text-red-500">Error loading file details</div>');
  }
});
adminMediaRoutes.post("/upload", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const files = formData.getAll("files");
    if (!files || files.length === 0) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          No files provided
        </div>
      `);
    }
    const uploadResults = [];
    const errors = [];
    if (!c.env.MEDIA_BUCKET) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Media storage (R2) is not configured. Please check your wrangler.toml configuration.
        </div>
      `);
    }
    for (const file of files) {
      try {
        const validation = fileValidationSchema2.safeParse({
          name: file.name,
          type: file.type,
          size: file.size
        });
        if (!validation.success) {
          errors.push({
            filename: file.name,
            error: validation.error.issues[0]?.message || "Validation failed"
          });
          continue;
        }
        const fileId = globalThis.crypto.randomUUID();
        const fileExtension = file.name.split(".").pop() || "";
        const filename = `${fileId}.${fileExtension}`;
        const folder = formData.get("folder") || "uploads";
        const r2Key = `${folder}/${filename}`;
        const arrayBuffer = await file.arrayBuffer();
        const uploadResult = await c.env.MEDIA_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            contentDisposition: `inline; filename="${file.name}"`
          },
          customMetadata: {
            originalName: file.name,
            uploadedBy: user.userId,
            uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
        if (!uploadResult) {
          errors.push({
            filename: file.name,
            error: "Failed to upload to storage"
          });
          continue;
        }
        let width;
        let height;
        if (file.type.startsWith("image/") && !file.type.includes("svg")) {
          try {
            const dimensions = await getImageDimensions2(arrayBuffer);
            width = dimensions.width;
            height = dimensions.height;
          } catch (error) {
            console.warn("Failed to extract image dimensions:", error);
          }
        }
        const publicUrl = `/files/${r2Key}`;
        const thumbnailUrl = file.type.startsWith("image/") ? publicUrl : void 0;
        const stmt = c.env.DB.prepare(`
          INSERT INTO media (
            id, filename, original_name, mime_type, size, width, height, 
            folder, r2_key, public_url, thumbnail_url, uploaded_by, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        await stmt.bind(
          fileId,
          filename,
          file.name,
          file.type,
          file.size,
          width,
          height,
          folder,
          r2Key,
          publicUrl,
          thumbnailUrl,
          user.userId,
          Math.floor(Date.now() / 1e3)
        ).run();
        uploadResults.push({
          id: fileId,
          filename,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          publicUrl
        });
      } catch (error) {
        errors.push({
          filename: file.name,
          error: "Upload failed: " + (error instanceof Error ? error.message : "Unknown error")
        });
      }
    }
    let mediaGridHTML = "";
    if (uploadResults.length > 0) {
      try {
        const folder = formData.get("folder") || "uploads";
        const query = "SELECT * FROM media WHERE deleted_at IS NULL ORDER BY uploaded_at DESC LIMIT 24";
        const stmt = c.env.DB.prepare(query);
        const { results } = await stmt.all();
        const mediaFiles = results.map((row) => ({
          id: row.id,
          filename: row.filename,
          original_name: row.original_name,
          mime_type: row.mime_type,
          size: row.size,
          public_url: `/files/${row.r2_key}`,
          thumbnail_url: row.mime_type.startsWith("image/") ? `/files/${row.r2_key}` : void 0,
          tags: row.tags ? JSON.parse(row.tags) : [],
          uploaded_at: row.uploaded_at,
          fileSize: formatFileSize(row.size),
          uploadedAt: new Date(row.uploaded_at).toLocaleDateString(),
          isImage: row.mime_type.startsWith("image/"),
          isVideo: row.mime_type.startsWith("video/"),
          isDocument: !row.mime_type.startsWith("image/") && !row.mime_type.startsWith("video/")
        }));
        mediaGridHTML = mediaFiles.map((file) => renderMediaFileCard(file, "grid", true)).join("");
      } catch (error) {
        console.error("Error fetching updated media list:", error);
      }
    }
    return c.html(html.html`
      ${uploadResults.length > 0 ? html.html`
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Successfully uploaded ${uploadResults.length} file${uploadResults.length > 1 ? "s" : ""}
        </div>
      ` : ""}

      ${errors.length > 0 ? html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p class="font-medium">Upload errors:</p>
          <ul class="list-disc list-inside mt-2">
            ${errors.map((error) => html.html`
              <li>${error.filename}: ${error.error}</li>
            `)}
          </ul>
        </div>
      ` : ""}

      ${uploadResults.length > 0 ? html.html`
        <script>
          // Close modal and refresh page after successful upload with cache busting
          setTimeout(() => {
            document.getElementById('upload-modal').classList.add('hidden');
            window.location.href = '/admin/media?t=' + Date.now();
          }, 1500);
        </script>
      ` : ""}
    `);
  } catch (error) {
    console.error("Upload error:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Upload failed: ${error instanceof Error ? error.message : "Unknown error"}
      </div>
    `);
  }
});
adminMediaRoutes.get("/file/*", async (c) => {
  try {
    const r2Key = c.req.path.replace("/admin/media/file/", "");
    if (!r2Key) {
      return c.notFound();
    }
    const object = await c.env.MEDIA_BUCKET.get(r2Key);
    if (!object) {
      return c.notFound();
    }
    const headers = new Headers();
    object.httpMetadata?.contentType && headers.set("Content-Type", object.httpMetadata.contentType);
    object.httpMetadata?.contentDisposition && headers.set("Content-Disposition", object.httpMetadata.contentDisposition);
    headers.set("Cache-Control", "public, max-age=31536000");
    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return c.notFound();
  }
});
adminMediaRoutes.put("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");
    const formData = await c.req.formData();
    const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL");
    const fileRecord = await stmt.bind(fileId).first();
    if (!fileRecord) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          File not found
        </div>
      `);
    }
    if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Permission denied
        </div>
      `);
    }
    const alt = formData.get("alt") || null;
    const caption = formData.get("caption") || null;
    const tagsString = formData.get("tags") || "";
    const tags = tagsString ? tagsString.split(",").map((tag) => tag.trim()).filter((tag) => tag) : [];
    const updateStmt = c.env.DB.prepare(`
      UPDATE media 
      SET alt = ?, caption = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(
      alt,
      caption,
      JSON.stringify(tags),
      Math.floor(Date.now() / 1e3),
      fileId
    ).run();
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        File updated successfully
      </div>
      <script>
        // Refresh the file details
        setTimeout(() => {
          htmx.trigger('#file-modal-content', 'htmx:load');
        }, 1000);
      </script>
    `);
  } catch (error) {
    console.error("Update error:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        Update failed: ${error instanceof Error ? error.message : "Unknown error"}
      </div>
    `);
  }
});
adminMediaRoutes.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");
    const stmt = c.env.DB.prepare("SELECT * FROM media WHERE id = ? AND deleted_at IS NULL");
    const fileRecord = await stmt.bind(fileId).first();
    if (!fileRecord) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          File not found
        </div>
      `);
    }
    if (fileRecord.uploaded_by !== user.userId && user.role !== "admin") {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Permission denied
        </div>
      `);
    }
    try {
      await c.env.MEDIA_BUCKET.delete(fileRecord.r2_key);
    } catch (error) {
      console.warn("Failed to delete from R2:", error);
    }
    const deleteStmt = c.env.DB.prepare("UPDATE media SET deleted_at = ? WHERE id = ?");
    await deleteStmt.bind(Math.floor(Date.now() / 1e3), fileId).run();
    return c.html(html.html`
      <script>
        // Close modal if open
        const modal = document.getElementById('file-modal');
        if (modal) {
          modal.classList.add('hidden');
        }
        // Redirect to media library
        window.location.href = '/admin/media';
      </script>
    `);
  } catch (error) {
    console.error("Delete error:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        Delete failed: ${error instanceof Error ? error.message : "Unknown error"}
      </div>
    `);
  }
});
async function getImageDimensions2(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  if (uint8Array[0] === 255 && uint8Array[1] === 216) {
    return getJPEGDimensions2(uint8Array);
  }
  if (uint8Array[0] === 137 && uint8Array[1] === 80 && uint8Array[2] === 78 && uint8Array[3] === 71) {
    return getPNGDimensions2(uint8Array);
  }
  return { width: 0, height: 0 };
}
function getJPEGDimensions2(uint8Array) {
  let i = 2;
  while (i < uint8Array.length - 8) {
    if (uint8Array[i] === 255 && uint8Array[i + 1] === 192) {
      return {
        height: uint8Array[i + 5] << 8 | uint8Array[i + 6],
        width: uint8Array[i + 7] << 8 | uint8Array[i + 8]
      };
    }
    const segmentLength = uint8Array[i + 2] << 8 | uint8Array[i + 3];
    i += 2 + segmentLength;
  }
  return { width: 0, height: 0 };
}
function getPNGDimensions2(uint8Array) {
  if (uint8Array.length < 24) {
    return { width: 0, height: 0 };
  }
  return {
    width: uint8Array[16] << 24 | uint8Array[17] << 16 | uint8Array[18] << 8 | uint8Array[19],
    height: uint8Array[20] << 24 | uint8Array[21] << 16 | uint8Array[22] << 8 | uint8Array[23]
  };
}
function generateMediaItemHTML(file) {
  const isImage = file.isImage;
  const isVideo = file.isVideo;
  return `
    <div 
      class="media-item bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer" 
      data-file-id="${file.id}"
      onclick="toggleFileSelection('${file.id}')"
    >
      <div class="aspect-square relative">
        ${isImage ? `
          <img 
            src="${file.public_url}" 
            alt="${file.alt || file.filename}"
            class="w-full h-full object-cover"
            loading="lazy"
          >
        ` : isVideo ? `
          <video 
            src="${file.public_url}" 
            class="w-full h-full object-cover"
            muted
          ></video>
        ` : `
          <div class="w-full h-full flex items-center justify-center bg-gray-100">
            <div class="text-center">
              <svg class="file-icon mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span class="text-xs text-gray-500 mt-1">${file.filename.split(".").pop()?.toUpperCase()}</span>
            </div>
          </div>
        `}
        
        <div class="preview-overlay flex items-center justify-center">
          <div class="flex space-x-2">
            <button 
              onclick="event.stopPropagation(); showFileDetails('${file.id}')"
              class="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
            </button>
            <button 
              onclick="event.stopPropagation(); copyToClipboard('${file.public_url}')"
              class="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-3">
        <h4 class="text-sm font-medium text-gray-900 truncate" title="${file.original_name}">
          ${file.original_name}
        </h4>
        <div class="flex justify-between items-center mt-1">
          <span class="text-xs text-gray-500">${file.fileSize}</span>
          <span class="text-xs text-gray-500">${file.uploadedAt}</span>
        </div>
        ${file.tags.length > 0 ? `
          <div class="flex flex-wrap gap-1 mt-2">
            ${file.tags.slice(0, 2).map((tag) => `
              <span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                ${tag}
              </span>
            `).join("")}
            ${file.tags.length > 2 ? `<span class="text-xs text-gray-400">+${file.tags.length - 2}</span>` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// src/templates/pages/admin-plugins-list.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderPluginsListPage(data) {
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Plugins</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage and extend functionality with plugins</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <div class="relative inline-block text-left">
            <button onclick="toggleDropdown()" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Install Plugin
              <svg class="-mr-1 ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
            <div id="plugin-dropdown" class="hidden absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 focus:outline-none">
              <div class="py-1">
                <button onclick="installPlugin('faq-plugin')" class="block w-full text-left px-4 py-2 text-sm text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors first:rounded-t-xl">
                  <div class="flex items-center">
                    <span class="text-lg mr-2">\u2753</span>
                    <div>
                      <div class="font-medium">FAQ System</div>
                      <div class="text-xs text-zinc-500 dark:text-zinc-400">Community FAQ management plugin</div>
                    </div>
                  </div>
                </button>
                <div class="border-t border-zinc-950/5 dark:border-white/10 my-1"></div>
                <button onclick="showNotification('Plugin marketplace coming soon!', 'info')" class="block w-full text-left px-4 py-2 text-sm text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors last:rounded-b-xl">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <div>
                      <div class="font-medium">Browse Marketplace</div>
                      <div class="text-xs text-zinc-500 dark:text-zinc-400">Discover more plugins</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="mb-6">
        <h3 class="text-base font-semibold text-zinc-950 dark:text-white">Plugin Statistics</h3>
        <dl class="mt-5 grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-zinc-800/75 dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Total Plugins</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-cyan-400">
                ${data.stats?.total || 0}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-lime-400/10 text-lime-600 dark:text-lime-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Increased by</span>
                8.5%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Active Plugins</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-lime-400">
                ${data.stats?.active || 0}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-lime-400/10 text-lime-600 dark:text-lime-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Increased by</span>
                12.3%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Inactive Plugins</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-purple-400">
                ${data.stats?.inactive || 0}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-pink-400/10 text-pink-600 dark:text-pink-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Decreased by</span>
                3.2%
              </div>
            </dd>
          </div>
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">Plugin Errors</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold text-pink-400">
                ${data.stats?.errors || 0}
              </div>
              <div class="inline-flex items-baseline rounded-full bg-pink-400/10 text-pink-600 dark:text-pink-400 px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  <path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" fill-rule="evenodd" />
                </svg>
                <span class="sr-only">Decreased by</span>
                1.5%
              </div>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Filters -->
      <div class="relative rounded-xl overflow-hidden mb-6">
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20"></div>

        <div class="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="px-6 py-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <div>
                  <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Category</label>
                  <div class="mt-2 grid grid-cols-1">
                    <select class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-cyan-500/30 dark:outline-cyan-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-500 dark:focus-visible:outline-cyan-400 sm:text-sm/6 min-w-48">
                      <option value="">All Categories</option>
                      <option value="content">Content Management</option>
                      <option value="media">Media</option>
                      <option value="seo">SEO & Analytics</option>
                      <option value="security">Security</option>
                      <option value="utilities">Utilities</option>
                    </select>
                    <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-cyan-600 dark:text-cyan-400 sm:size-4">
                      <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Status</label>
                  <div class="mt-2 grid grid-cols-1">
                    <select class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-cyan-500/30 dark:outline-cyan-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-500 dark:focus-visible:outline-cyan-400 sm:text-sm/6 min-w-48">
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="error">Error</option>
                    </select>
                    <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-cyan-600 dark:text-cyan-400 sm:size-4">
                      <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div class="flex-1 max-w-md">
                  <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Search</label>
                  <div class="relative group">
                    <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                      <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search plugins..."
                      class="w-full rounded-full bg-transparent px-11 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-x-3 ml-4">
                <button
                  onclick="location.reload()"
                  class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Plugins Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      ${data.plugins.map((plugin) => renderPluginCard(plugin)).join("")}
    </div>

    <script>
      async function togglePlugin(pluginId, action) {
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = action === 'activate' ? 'Activating...' : 'Deactivating...';
        
        try {
          const response = await fetch(\`/admin/plugins/\${pluginId}/\${action}\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Update UI
            const card = button.closest('.plugin-card');
            const statusBadge = card.querySelector('.status-badge');

            if (action === 'activate') {
              // Update status badge
              statusBadge.className = 'status-badge inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-lime-700/10 dark:ring-lime-400/20';
              statusBadge.innerHTML = '<div class="w-2 h-2 bg-lime-500 dark:bg-lime-400 rounded-full mr-2"></div>Active';
              // Update card border to green
              card.className = 'plugin-card rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-[3px] ring-lime-500 dark:ring-lime-400 p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all';
              // Update button
              button.textContent = 'Deactivate';
              button.onclick = () => togglePlugin(pluginId, 'deactivate');
              button.className = 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';
            } else {
              // Update status badge
              statusBadge.className = 'status-badge inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset bg-zinc-50 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 ring-zinc-700/10 dark:ring-zinc-400/20';
              statusBadge.innerHTML = '<div class="w-2 h-2 bg-zinc-500 dark:bg-zinc-400 rounded-full mr-2"></div>Inactive';
              // Update card border to pink
              card.className = 'plugin-card rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-[3px] ring-pink-500 dark:ring-pink-400 p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all';
              // Update button
              button.textContent = 'Activate';
              button.onclick = () => togglePlugin(pluginId, 'activate');
              button.className = 'bg-lime-600 dark:bg-lime-700 hover:bg-lime-700 dark:hover:bg-lime-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';
            }

            showNotification(\`Plugin \${action}d successfully\`, 'success');
          } else {
            throw new Error(result.error || \`Failed to \${action} plugin\`);
          }
        } catch (error) {
          showNotification(error.message, 'error');
          button.textContent = originalText;
        } finally {
          button.disabled = false;
        }
      }
      
      async function installPlugin(pluginName) {
        const button = event.target;
        button.disabled = true;
        button.textContent = 'Installing...';
        
        try {
          const response = await fetch('/admin/plugins/install', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: pluginName })
          });
          
          const result = await response.json();
          
          if (result.success) {
            showNotification('Plugin installed successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
          } else {
            throw new Error(result.error || 'Failed to install plugin');
          }
        } catch (error) {
          showNotification(error.message, 'error');
          button.disabled = false;
          button.textContent = 'Install';
        }
      }
      
      let pluginToUninstall = null;

      async function uninstallPlugin(pluginId) {
        pluginToUninstall = pluginId;
        showConfirmDialog('uninstall-plugin-confirm');
      }

      async function performUninstallPlugin() {
        if (!pluginToUninstall) return;

        const button = event.target;
        if (button) button.disabled = true;

        try {
          const response = await fetch(\`/admin/plugins/\${pluginToUninstall}/uninstall\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();

          if (result.success) {
            showNotification('Plugin uninstalled successfully!', 'success');
            setTimeout(() => location.reload(), 1500);
          } else {
            throw new Error(result.error || 'Failed to uninstall plugin');
          }
        } catch (error) {
          showNotification(error.message, 'error');
          if (button) button.disabled = false;
        } finally {
          pluginToUninstall = null;
        }
      }
      
      function openPluginSettings(pluginId) {
        window.location.href = \`/admin/plugins/\${pluginId}\`;
      }
      
      function showPluginDetails(pluginId) {
        // TODO: Implement plugin details modal
        showNotification('Plugin details coming soon!', 'info');
      }
      
      function showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        notification.className = \`fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 \${bgColor}\`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
      
      function toggleDropdown() {
        const dropdown = document.getElementById('plugin-dropdown');
        dropdown.classList.toggle('hidden');
      }
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (event) => {
        const dropdown = document.getElementById('plugin-dropdown');
        const button = event.target.closest('button[onclick="toggleDropdown()"]');
        
        if (!button && !dropdown.contains(event.target)) {
          dropdown.classList.add('hidden');
        }
      });
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog2({
    id: "uninstall-plugin-confirm",
    title: "Uninstall Plugin",
    message: "Are you sure you want to uninstall this plugin? This action cannot be undone.",
    confirmText: "Uninstall",
    cancelText: "Cancel",
    iconColor: "red",
    confirmClass: "bg-red-500 hover:bg-red-400",
    onConfirm: "performUninstallPlugin()"
  })}

    ${getConfirmationDialogScript2()}
  `;
  const layoutData = {
    title: "Plugins",
    pageTitle: "Plugin Management",
    currentPath: "/admin/plugins",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}
function renderPluginCard(plugin) {
  const statusColors = {
    active: "bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300 ring-lime-700/10 dark:ring-lime-400/20",
    inactive: "bg-zinc-50 dark:bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 ring-zinc-700/10 dark:ring-zinc-400/20",
    error: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-red-700/10 dark:ring-red-400/20"
  };
  const statusIcons = {
    active: '<div class="w-2 h-2 bg-lime-500 dark:bg-lime-400 rounded-full mr-2"></div>',
    inactive: '<div class="w-2 h-2 bg-zinc-500 dark:bg-zinc-400 rounded-full mr-2"></div>',
    error: '<div class="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full mr-2"></div>'
  };
  const borderColors = {
    active: "ring-[3px] ring-lime-500 dark:ring-lime-400",
    inactive: "ring-[3px] ring-pink-500 dark:ring-pink-400",
    error: "ring-[3px] ring-red-500 dark:ring-red-400"
  };
  const criticalCorePlugins = ["core-auth", "core-media"];
  const canToggle = !criticalCorePlugins.includes(plugin.id);
  const actionButton = plugin.status === "active" ? `<button onclick="togglePlugin('${plugin.id}', 'deactivate')" class="bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Deactivate</button>` : `<button onclick="togglePlugin('${plugin.id}', 'activate')" class="bg-lime-600 dark:bg-lime-700 hover:bg-lime-700 dark:hover:bg-lime-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">Activate</button>`;
  return `
    <div class="plugin-card rounded-xl bg-white dark:bg-zinc-900 shadow-sm ${borderColors[plugin.status]} p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg flex items-center justify-center ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 bg-zinc-50 dark:bg-zinc-800">
            ${plugin.icon || getDefaultPluginIcon(plugin.category)}
          </div>
          <div>
            <h3 class="text-lg font-semibold text-zinc-950 dark:text-white">${plugin.displayName}</h3>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">v${plugin.version} by ${plugin.author}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="status-badge inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${statusColors[plugin.status]}">
            ${statusIcons[plugin.status]}${plugin.status.charAt(0).toUpperCase() + plugin.status.slice(1)}
          </span>
          ${plugin.isCore ? '<span class="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-700/10 dark:ring-cyan-400/20">Core</span>' : ""}
        </div>
      </div>

      <p class="text-zinc-600 dark:text-zinc-300 text-sm mb-4 line-clamp-3">${plugin.description}</p>

      <div class="flex items-center gap-4 mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
          </svg>
          ${plugin.category}
        </span>

        ${plugin.downloadCount ? `
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          ${plugin.downloadCount.toLocaleString()}
        </span>
        ` : ""}

        ${plugin.rating ? `
        <span class="flex items-center gap-1">
          <svg class="w-4 h-4 text-yellow-500 dark:text-yellow-400 fill-current" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          ${plugin.rating}
        </span>
        ` : ""}

        <span>${plugin.lastUpdated}</span>
      </div>

      ${plugin.dependencies && plugin.dependencies.length > 0 ? `
      <div class="mb-4">
        <p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Dependencies:</p>
        <div class="flex flex-wrap gap-1">
          ${plugin.dependencies.map((dep) => `<span class="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs px-2 py-1 rounded">${dep}</span>`).join("")}
        </div>
      </div>
      ` : ""}

      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          ${canToggle ? actionButton : ""}
          <button onclick="openPluginSettings('${plugin.id}')" class="bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            Settings
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="showPluginDetails('${plugin.id}')" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Plugin Details">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </button>

          ${!plugin.isCore ? `
          <button onclick="uninstallPlugin('${plugin.id}')" class="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Uninstall Plugin">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}
function getDefaultPluginIcon(category) {
  const iconColor = "text-zinc-600 dark:text-zinc-400";
  const icons = {
    "content": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    `,
    "media": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    `,
    "seo": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    `,
    "analytics": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    `,
    "ecommerce": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    `,
    "email": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    `,
    "workflow": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    `,
    "security": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    `,
    "social": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    `,
    "utility": `
      <svg class="w-6 h-6 ${iconColor}" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    `
  };
  const iconKey = category.toLowerCase();
  return icons[iconKey] || icons["utility"] || "";
}

// src/templates/components/auth-settings-form.template.ts
function renderAuthSettingsForm(settings) {
  const fields = settings.requiredFields;
  const validation = settings.validation;
  const registration = settings.registration;
  return `
    <div class="space-y-8">
      <!-- Required Fields Section -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Registration Fields</h3>
        <p class="text-sm text-gray-400 mb-6">Configure which fields are required during user registration and their minimum lengths.</p>

        <div class="space-y-6">
          ${Object.entries(fields).map(([fieldName, config]) => `
            <div class="border-b border-white/10 pb-6 last:border-b-0 last:pb-0">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h4 class="text-sm font-medium text-white">${config.label}</h4>
                  <p class="text-xs text-gray-400 mt-1">Field type: ${config.type}</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="requiredFields_${fieldName}_required"
                    ${config.required ? "checked" : ""}
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span class="ml-3 text-sm font-medium text-gray-300">Required</span>
                </label>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-2">Minimum Length</label>
                  <input
                    type="number"
                    name="requiredFields_${fieldName}_minLength"
                    value="${config.minLength}"
                    min="0"
                    max="100"
                    class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
                  >
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-400 mb-2">Field Label</label>
                  <input
                    type="text"
                    name="requiredFields_${fieldName}_label"
                    value="${config.label}"
                    class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
                  >
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Password Requirements Section -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Password Requirements</h3>
        <p class="text-sm text-gray-400 mb-6">Additional password complexity requirements.</p>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Require Uppercase Letter</label>
              <p class="text-xs text-gray-400">Password must contain at least one uppercase letter (A-Z)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_passwordRequirements_requireUppercase"
                ${validation.passwordRequirements.requireUppercase ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Require Lowercase Letter</label>
              <p class="text-xs text-gray-400">Password must contain at least one lowercase letter (a-z)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_passwordRequirements_requireLowercase"
                ${validation.passwordRequirements.requireLowercase ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Require Numbers</label>
              <p class="text-xs text-gray-400">Password must contain at least one number (0-9)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_passwordRequirements_requireNumbers"
                ${validation.passwordRequirements.requireNumbers ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Require Special Characters</label>
              <p class="text-xs text-gray-400">Password must contain at least one special character (!@#$%^&*)</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_passwordRequirements_requireSpecialChars"
                ${validation.passwordRequirements.requireSpecialChars ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Registration Settings Section -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Registration Settings</h3>
        <p class="text-sm text-gray-400 mb-6">General registration behavior.</p>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Allow User Registration</label>
              <p class="text-xs text-gray-400">Enable or disable public user registration</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="registration_enabled"
                ${registration.enabled ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Require Email Verification</label>
              <p class="text-xs text-gray-400">Users must verify their email before accessing the system</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="registration_requireEmailVerification"
                ${registration.requireEmailVerification ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Default User Role</label>
            <select
              name="registration_defaultRole"
              class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:border-blue-400 focus:outline-none transition-colors w-full"
            >
              <option value="viewer" ${registration.defaultRole === "viewer" ? "selected" : ""}>Viewer</option>
              <option value="editor" ${registration.defaultRole === "editor" ? "selected" : ""}>Editor</option>
              <option value="admin" ${registration.defaultRole === "admin" ? "selected" : ""}>Admin</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">Role assigned to new users upon registration</p>
          </div>
        </div>
      </div>

      <!-- Validation Settings Section -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Validation Settings</h3>
        <p class="text-sm text-gray-400 mb-6">Additional validation rules.</p>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Enforce Email Format</label>
              <p class="text-xs text-gray-400">Validate that email addresses are in correct format</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_emailFormat"
                ${validation.emailFormat ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm font-medium text-gray-300">Prevent Duplicate Usernames</label>
              <p class="text-xs text-gray-400">Ensure usernames are unique across all users</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="validation_allowDuplicateUsernames"
                ${!validation.allowDuplicateUsernames ? "checked" : ""}
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;
}

// src/templates/pages/admin-plugin-settings.template.ts
function renderPluginSettingsPage(data) {
  const { plugin, activity = [], user } = data;
  const pageContent = `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-6">
      <!-- Header with breadcrumb -->
      <div class="flex items-center mb-6">
        <nav class="flex" aria-label="Breadcrumb">
          <ol class="flex items-center space-x-2">
            <li>
              <a href="/admin/plugins" class="text-gray-400 hover:text-white transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                </svg>
                Plugins
              </a>
            </li>
            <li>
              <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
              </svg>
            </li>
            <li>
              <span class="text-gray-300">${plugin.displayName}</span>
            </li>
          </ol>
        </nav>
      </div>

      <!-- Plugin Header -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6 mb-6">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              ${plugin.icon || plugin.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 class="text-2xl font-semibold text-white mb-1">${plugin.displayName}</h1>
              <p class="text-gray-300 mb-2">${plugin.description}</p>
              <div class="flex items-center gap-4 text-sm text-gray-400">
                <span>v${plugin.version}</span>
                <span>by ${plugin.author}</span>
                <span>${plugin.category}</span>
                ${plugin.downloadCount ? `<span>${plugin.downloadCount.toLocaleString()} downloads</span>` : ""}
                ${plugin.rating ? `<span>\u2605 ${plugin.rating}</span>` : ""}
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            ${renderStatusBadge(plugin.status)}
            ${renderToggleButton(plugin)}
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-6">
        <nav class="flex space-x-8" aria-label="Tabs">
          <button onclick="showTab('settings')" id="settings-tab" class="tab-button active border-b-2 border-blue-400 py-2 px-1 text-sm font-medium text-blue-400">
            Settings
          </button>
          <button onclick="showTab('activity')" id="activity-tab" class="tab-button border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-400 hover:text-gray-300">
            Activity Log
          </button>
          <button onclick="showTab('info')" id="info-tab" class="tab-button border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-400 hover:text-gray-300">
            Information
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div id="tab-content">
        <!-- Settings Tab -->
        <div id="settings-content" class="tab-content">
          ${renderSettingsTab(plugin)}
        </div>

        <!-- Activity Tab -->
        <div id="activity-content" class="tab-content hidden">
          ${renderActivityTab(activity)}
        </div>

        <!-- Information Tab -->
        <div id="info-content" class="tab-content hidden">
          ${renderInformationTab(plugin)}
        </div>
      </div>
    </div>

    <script>
      function showTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.add('hidden');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(tab => {
          tab.classList.remove('active', 'border-blue-400', 'text-blue-400');
          tab.classList.add('border-transparent', 'text-gray-400');
        });
        
        // Show selected tab content
        document.getElementById(tabName + '-content').classList.remove('hidden');
        
        // Add active class to selected tab
        const activeTab = document.getElementById(tabName + '-tab');
        activeTab.classList.add('active', 'border-blue-400', 'text-blue-400');
        activeTab.classList.remove('border-transparent', 'text-gray-400');
      }

      async function togglePlugin(pluginId, action) {
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = action === 'activate' ? 'Activating...' : 'Deactivating...';
        
        try {
          const response = await fetch(\`/admin/plugins/\${pluginId}/\${action}\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const result = await response.json();
          
          if (result.success) {
            showNotification(\`Plugin \${action}d successfully\`, 'success');
            setTimeout(() => location.reload(), 1000);
          } else {
            throw new Error(result.error || \`Failed to \${action} plugin\`);
          }
        } catch (error) {
          showNotification(error.message, 'error');
          button.textContent = originalText;
          button.disabled = false;
        }
      }

      async function saveSettings() {
        const form = document.getElementById('settings-form');
        const formData = new FormData(form);
        const isAuthPlugin = '${plugin.id}' === 'core-auth';
        let settings = {};

        if (isAuthPlugin) {
          // Handle nested auth settings structure
          settings = {
            requiredFields: {},
            validation: {
              passwordRequirements: {}
            },
            registration: {}
          };

          for (let [key, value] of formData.entries()) {
            const input = form.querySelector(\`[name="\${key}"]\`);
            const fieldValue = input.type === 'checkbox' ? input.checked :
                             input.type === 'number' ? parseInt(value) || 0 : value;

            // Parse nested field names like "requiredFields_email_required"
            if (key.startsWith('requiredFields_')) {
              const parts = key.replace('requiredFields_', '').split('_');
              const fieldName = parts[0];
              const propName = parts[1];

              if (!settings.requiredFields[fieldName]) {
                settings.requiredFields[fieldName] = { type: 'text', label: '' };
              }
              settings.requiredFields[fieldName][propName] = fieldValue;
            } else if (key.startsWith('validation_passwordRequirements_')) {
              const propName = key.replace('validation_passwordRequirements_', '');
              settings.validation.passwordRequirements[propName] = fieldValue;
            } else if (key.startsWith('validation_')) {
              const propName = key.replace('validation_', '');
              // Invert the allowDuplicateUsernames logic
              if (propName === 'allowDuplicateUsernames') {
                settings.validation[propName] = !fieldValue;
              } else {
                settings.validation[propName] = fieldValue;
              }
            } else if (key.startsWith('registration_')) {
              const propName = key.replace('registration_', '');
              settings.registration[propName] = fieldValue;
            }
          }
        } else {
          // Handle regular plugin settings
          for (let [key, value] of formData.entries()) {
            if (key.startsWith('setting_')) {
              const settingKey = key.replace('setting_', '');

              const input = form.querySelector(\`[name="\${key}"]\`);
              if (input.type === 'checkbox') {
                settings[settingKey] = input.checked;
              } else if (input.type === 'number') {
                settings[settingKey] = parseInt(value) || 0;
              } else {
                settings[settingKey] = value;
              }
            }
          }
        }

        const saveButton = document.getElementById('save-button');
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';

        try {
          const response = await fetch(\`/admin/plugins/${plugin.id}/settings\`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
          });

          const result = await response.json();

          if (result.success) {
            showNotification('Settings saved successfully', 'success');
            // Reload page after 1 second to show updated settings
            setTimeout(() => location.reload(), 1000);
          } else {
            throw new Error(result.error || 'Failed to save settings');
          }
        } catch (error) {
          showNotification(error.message, 'error');
        } finally {
          saveButton.disabled = false;
          saveButton.textContent = 'Save Settings';
        }
      }

      function showNotification(message, type) {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
        notification.className = \`fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 \${bgColor}\`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
    </script>
  `;
  const layoutData = {
    title: `${plugin.displayName} Settings`,
    pageTitle: `${plugin.displayName} Settings`,
    currentPath: `/admin/plugins/${plugin.id}`,
    user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function renderStatusBadge(status) {
  const statusColors = {
    active: "bg-green-900/50 text-green-300 border-green-600/30",
    inactive: "bg-gray-800/50 text-gray-400 border-gray-600/30",
    error: "bg-red-900/50 text-red-300 border-red-600/30"
  };
  const statusIcons = {
    active: '<div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>',
    inactive: '<div class="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>',
    error: '<div class="w-2 h-2 bg-red-400 rounded-full mr-2"></div>'
  };
  return `
    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || statusColors.inactive} border">
      ${statusIcons[status] || statusIcons.inactive}${status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  `;
}
function renderToggleButton(plugin) {
  if (plugin.isCore) {
    return '<span class="text-sm text-gray-400">Core Plugin</span>';
  }
  return plugin.status === "active" ? `<button onclick="togglePlugin('${plugin.id}', 'deactivate')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Deactivate</button>` : `<button onclick="togglePlugin('${plugin.id}', 'activate')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Activate</button>`;
}
function renderSettingsTab(plugin) {
  const settings = plugin.settings || {};
  const isSeedDataPlugin = plugin.id === "seed-data" || plugin.name === "seed-data";
  const isAuthPlugin = plugin.id === "core-auth" || plugin.name === "core-auth";
  return `
    ${isSeedDataPlugin ? `
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-white mb-2">Seed Data Generator</h2>
            <p class="text-gray-400">Generate realistic example data for testing and development.</p>
          </div>
          <a
            href="/admin/seed-data"
            target="_blank"
            class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Open Seed Data Tool
          </a>
        </div>
      </div>
    ` : ""}

    <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
      ${isAuthPlugin ? `
        <h2 class="text-xl font-semibold text-white mb-4">Authentication Settings</h2>
        <p class="text-gray-400 mb-6">Configure user registration fields and validation rules.</p>
      ` : `
        <h2 class="text-xl font-semibold text-white mb-4">Plugin Settings</h2>
      `}

      <form id="settings-form" class="space-y-6">
        ${isAuthPlugin && Object.keys(settings).length > 0 ? renderAuthSettingsForm(settings) : Object.keys(settings).length > 0 ? renderSettingsFields(settings) : renderNoSettings(plugin)}

        ${Object.keys(settings).length > 0 ? `
        <div class="flex items-center justify-end pt-6 border-t border-white/10">
          <button
            type="button"
            id="save-button"
            onclick="saveSettings()"
            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Save Settings
          </button>
        </div>
        ` : ""}
      </form>
    </div>
  `;
}
function renderSettingsFields(settings) {
  return Object.entries(settings).map(([key, value]) => {
    const fieldId = `setting_${key}`;
    const displayName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
    if (typeof value === "boolean") {
      return `
        <div class="flex items-center justify-between">
          <div>
            <label for="${fieldId}" class="text-sm font-medium text-gray-300">${displayName}</label>
            <p class="text-xs text-gray-400">Enable or disable this feature</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="${fieldId}" id="${fieldId}" ${value ? "checked" : ""} class="sr-only peer">
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      `;
    } else if (typeof value === "number") {
      return `
        <div>
          <label for="${fieldId}" class="block text-sm font-medium text-gray-300 mb-2">${displayName}</label>
          <input 
            type="number" 
            name="${fieldId}" 
            id="${fieldId}" 
            value="${value}"
            class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
          >
        </div>
      `;
    } else {
      return `
        <div>
          <label for="${fieldId}" class="block text-sm font-medium text-gray-300 mb-2">${displayName}</label>
          <input 
            type="text" 
            name="${fieldId}" 
            id="${fieldId}" 
            value="${value}"
            class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
          >
        </div>
      `;
    }
  }).join("");
}
function renderNoSettings(plugin) {
  if (plugin.id === "seed-data" || plugin.name === "seed-data") {
    return `
      <div class="text-center py-8">
        <svg class="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <h3 class="text-lg font-medium text-gray-300 mb-2">Seed Data Generator</h3>
        <p class="text-gray-400 mb-6">Generate realistic example data for testing and development.</p>
        <a
          href="/admin/seed-data"
          class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Generate Seed Data
        </a>
      </div>
    `;
  }
  return `
    <div class="text-center py-8">
      <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      <h3 class="text-lg font-medium text-gray-300 mb-2">No Settings Available</h3>
      <p class="text-gray-400">This plugin doesn't have any configurable settings.</p>
    </div>
  `;
}
function renderActivityTab(activity) {
  return `
    <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Activity Log</h2>
      
      ${activity.length > 0 ? `
        <div class="space-y-4">
          ${activity.map((item) => `
            <div class="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <div class="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white">${item.action}</span>
                  <span class="text-xs text-gray-400">${formatTimestamp(item.timestamp)}</span>
                </div>
                <p class="text-sm text-gray-300 mt-1">${item.message}</p>
                ${item.user ? `<p class="text-xs text-gray-400 mt-1">by ${item.user}</p>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `
        <div class="text-center py-8">
          <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-300 mb-2">No Activity</h3>
          <p class="text-gray-400">No recent activity for this plugin.</p>
        </div>
      `}
    </div>
  `;
}
function renderInformationTab(plugin) {
  return `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Plugin Details -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Plugin Details</h2>
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-400">Name:</span>
            <span class="text-white">${plugin.displayName}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Version:</span>
            <span class="text-white">${plugin.version}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Author:</span>
            <span class="text-white">${plugin.author}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Category:</span>
            <span class="text-white">${plugin.category}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Status:</span>
            <span class="text-white">${plugin.status}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Last Updated:</span>
            <span class="text-white">${plugin.lastUpdated}</span>
          </div>
        </div>
      </div>

      <!-- Dependencies & Permissions -->
      <div class="backdrop-blur-md bg-black/20 rounded-xl border border-white/10 shadow-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Dependencies & Permissions</h2>
        
        ${plugin.dependencies && plugin.dependencies.length > 0 ? `
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-300 mb-2">Dependencies:</h3>
            <div class="space-y-1">
              ${plugin.dependencies.map((dep) => `
                <div class="inline-block bg-white/10 text-gray-300 text-sm px-2 py-1 rounded mr-2">${dep}</div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${plugin.permissions && plugin.permissions.length > 0 ? `
          <div>
            <h3 class="text-sm font-medium text-gray-300 mb-2">Permissions:</h3>
            <div class="space-y-1">
              ${plugin.permissions.map((perm) => `
                <div class="inline-block bg-white/10 text-gray-300 text-sm px-2 py-1 rounded mr-2">${perm}</div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${(!plugin.dependencies || plugin.dependencies.length === 0) && (!plugin.permissions || plugin.permissions.length === 0) ? `
          <p class="text-gray-400">No dependencies or special permissions required.</p>
        ` : ""}
      </div>
    </div>
  `;
}
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1e3);
  return date.toLocaleString();
}

// src/routes/admin-plugins.ts
var adminPluginRoutes = new hono.Hono();
adminPluginRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
adminPluginRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    if (user?.role !== "admin") {
      return c.text("Access denied", 403);
    }
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    let plugins = [];
    let stats = { total: 0, active: 0, inactive: 0, errors: 0 };
    try {
      plugins = await pluginService.getAllPlugins();
      stats = await pluginService.getPluginStats();
    } catch (error) {
      console.error("Error loading plugins:", error);
    }
    const templatePlugins = plugins.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.display_name,
      description: p.description,
      version: p.version,
      author: p.author,
      status: p.status,
      category: p.category,
      icon: p.icon,
      downloadCount: p.download_count,
      rating: p.rating,
      lastUpdated: formatLastUpdated(p.last_updated),
      dependencies: p.dependencies,
      permissions: p.permissions,
      isCore: p.is_core
    }));
    const pageData = {
      plugins: templatePlugins,
      stats,
      user: {
        name: user?.email || "User",
        email: user?.email || "",
        role: user?.role || "user"
      },
      version: c.get("appVersion")
    };
    return c.html(renderPluginsListPage(pageData));
  } catch (error) {
    console.error("Error loading plugins page:", error);
    return c.text("Internal server error", 500);
  }
});
adminPluginRoutes.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const pluginId = c.req.param("id");
    if (user?.role !== "admin") {
      return c.redirect("/admin/plugins");
    }
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    const plugin = await pluginService.getPlugin(pluginId);
    if (!plugin) {
      return c.text("Plugin not found", 404);
    }
    const activity = await pluginService.getPluginActivity(pluginId, 20);
    const templatePlugin = {
      id: plugin.id,
      name: plugin.name,
      displayName: plugin.display_name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author,
      status: plugin.status,
      category: plugin.category,
      icon: plugin.icon,
      downloadCount: plugin.download_count,
      rating: plugin.rating,
      lastUpdated: formatLastUpdated(plugin.last_updated),
      dependencies: plugin.dependencies,
      permissions: plugin.permissions,
      isCore: plugin.is_core,
      settings: plugin.settings
    };
    const templateActivity = (activity || []).map((item) => ({
      id: item.id,
      action: item.action,
      message: item.message,
      timestamp: item.timestamp,
      user: item.user_email
    }));
    const pageData = {
      plugin: templatePlugin,
      activity: templateActivity,
      user: {
        name: user?.email || "User",
        email: user?.email || "",
        role: user?.role || "user"
      }
    };
    return c.html(renderPluginSettingsPage(pageData));
  } catch (error) {
    console.error("Error getting plugin settings page:", error);
    return c.text("Internal server error", 500);
  }
});
adminPluginRoutes.post("/:id/activate", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const pluginId = c.req.param("id");
    if (user?.role !== "admin") {
      return c.json({ error: "Access denied" }, 403);
    }
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    await pluginService.activatePlugin(pluginId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error activating plugin:", error);
    const message = error instanceof Error ? error.message : "Failed to activate plugin";
    return c.json({ error: message }, 400);
  }
});
adminPluginRoutes.post("/:id/deactivate", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const pluginId = c.req.param("id");
    if (user?.role !== "admin") {
      return c.json({ error: "Access denied" }, 403);
    }
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    await pluginService.deactivatePlugin(pluginId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deactivating plugin:", error);
    const message = error instanceof Error ? error.message : "Failed to deactivate plugin";
    return c.json({ error: message }, 400);
  }
});
adminPluginRoutes.post("/install", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    if (user?.role !== "admin") {
      return c.json({ error: "Access denied" }, 403);
    }
    const body = await c.req.json();
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    if (body.name === "faq-plugin") {
      const faqPlugin = await pluginService.installPlugin({
        id: "third-party-faq",
        name: "faq-plugin",
        display_name: "FAQ System",
        description: "Frequently Asked Questions management system with categories, search, and custom styling",
        version: "2.0.0",
        author: "Community Developer",
        category: "content",
        icon: "\u2753",
        permissions: ["manage:faqs"],
        dependencies: [],
        settings: {
          enableSearch: true,
          enableCategories: true,
          questionsPerPage: 10
        }
      });
      return c.json({ success: true, plugin: faqPlugin });
    }
    if (body.name === "demo-login-plugin") {
      const demoPlugin = await pluginService.installPlugin({
        id: "demo-login-prefill",
        name: "demo-login-plugin",
        display_name: "Demo Login Prefill",
        description: "Prefills login form with demo credentials (admin@sonicjs.com/admin123) for easy site demonstration",
        version: "1.0.0-beta.1",
        author: "SonicJS",
        category: "demo",
        icon: "\u{1F3AF}",
        permissions: [],
        dependencies: [],
        settings: {
          enableNotice: true,
          demoEmail: "admin@sonicjs.com",
          demoPassword: "admin123"
        }
      });
      return c.json({ success: true, plugin: demoPlugin });
    }
    if (body.name === "core-auth") {
      const authPlugin = await pluginService.installPlugin({
        id: "core-auth",
        name: "core-auth",
        display_name: "Authentication System",
        description: "Core authentication and user management system",
        version: "1.0.0-beta.1",
        author: "SonicJS Team",
        category: "security",
        icon: "\u{1F510}",
        permissions: ["manage:users", "manage:roles", "manage:permissions"],
        dependencies: [],
        is_core: true,
        settings: {}
      });
      return c.json({ success: true, plugin: authPlugin });
    }
    if (body.name === "core-media") {
      const mediaPlugin = await pluginService.installPlugin({
        id: "core-media",
        name: "core-media",
        display_name: "Media Manager",
        description: "Core media upload and management system",
        version: "1.0.0-beta.1",
        author: "SonicJS Team",
        category: "media",
        icon: "\u{1F4F8}",
        permissions: ["manage:media", "upload:files"],
        dependencies: [],
        is_core: true,
        settings: {}
      });
      return c.json({ success: true, plugin: mediaPlugin });
    }
    if (body.name === "core-workflow") {
      const workflowPlugin = await pluginService.installPlugin({
        id: "core-workflow",
        name: "core-workflow",
        display_name: "Workflow Engine",
        description: "Content workflow and approval system",
        version: "1.0.0-beta.1",
        author: "SonicJS Team",
        category: "content",
        icon: "\u{1F504}",
        permissions: ["manage:workflows", "approve:content"],
        dependencies: [],
        is_core: true,
        settings: {}
      });
      return c.json({ success: true, plugin: workflowPlugin });
    }
    if (body.name === "database-tools") {
      const databaseToolsPlugin = await pluginService.installPlugin({
        id: "database-tools",
        name: "database-tools",
        display_name: "Database Tools",
        description: "Database management tools including truncate, backup, and validation",
        version: "1.0.0-beta.1",
        author: "SonicJS Team",
        category: "system",
        icon: "\u{1F5C4}\uFE0F",
        permissions: ["manage:database", "admin"],
        dependencies: [],
        is_core: false,
        settings: {
          enableTruncate: true,
          enableBackup: true,
          enableValidation: true,
          requireConfirmation: true
        }
      });
      return c.json({ success: true, plugin: databaseToolsPlugin });
    }
    if (body.name === "seed-data") {
      const seedDataPlugin = await pluginService.installPlugin({
        id: "seed-data",
        name: "seed-data",
        display_name: "Seed Data",
        description: "Generate realistic example users and content for testing and development",
        version: "1.0.0-beta.1",
        author: "SonicJS Team",
        category: "development",
        icon: "\u{1F331}",
        permissions: ["admin"],
        dependencies: [],
        is_core: false,
        settings: {
          userCount: 20,
          contentCount: 200,
          defaultPassword: "password123"
        }
      });
      return c.json({ success: true, plugin: seedDataPlugin });
    }
    return c.json({ error: "Plugin not found in registry" }, 404);
  } catch (error) {
    console.error("Error installing plugin:", error);
    const message = error instanceof Error ? error.message : "Failed to install plugin";
    return c.json({ error: message }, 400);
  }
});
adminPluginRoutes.post("/:id/uninstall", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const pluginId = c.req.param("id");
    if (user?.role !== "admin") {
      return c.json({ error: "Access denied" }, 403);
    }
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    await pluginService.uninstallPlugin(pluginId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error uninstalling plugin:", error);
    const message = error instanceof Error ? error.message : "Failed to uninstall plugin";
    return c.json({ error: message }, 400);
  }
});
adminPluginRoutes.post("/:id/settings", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const pluginId = c.req.param("id");
    if (user?.role !== "admin") {
      return c.json({ error: "Access denied" }, 403);
    }
    const settings = await c.req.json();
    const pluginService = new chunkLEG4KNFP_cjs.PluginService(db);
    await pluginService.updatePluginSettings(pluginId, settings);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating plugin settings:", error);
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return c.json({ error: message }, 400);
  }
});
function formatLastUpdated(timestamp) {
  const now = Date.now() / 1e3;
  const diff = now - timestamp;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2592e3) return `${Math.floor(diff / 604800)} weeks ago`;
  return `${Math.floor(diff / 2592e3)} months ago`;
}

// src/templates/pages/admin-logs-list.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderLogsListPage(data) {
  const { logs, pagination, filters, user } = data;
  const content = `
    <div>
      <div class="sm:flex sm:items-center sm:justify-between mb-6">
        <div class="sm:flex-auto">
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">System Logs</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
            Monitor and analyze system activity, errors, and performance metrics.
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 flex gap-x-2">
          <a
            href="/admin/logs/config"
            class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors shadow-sm"
          >
            Configure
          </a>
          <a
            href="/admin/logs/export?${new URLSearchParams(filters).toString()}"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Export
          </a>
        </div>
      </div>

      <!-- Filters -->
      <div class="relative rounded-xl overflow-hidden mb-6">
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20"></div>

        <div class="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="px-6 py-5">
            <form method="GET" action="/admin/logs" class="space-y-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="relative group">
                  <label for="search" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Search</label>
                  <div class="relative">
                    <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                      <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="search"
                      id="search"
                      value="${filters.search}"
                      placeholder="Search messages..."
                      class="w-full rounded-full bg-transparent pl-11 pr-4 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                    />
                  </div>
                </div>

                <div>
                  <label for="level" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Level</label>
                  <select
                    name="level"
                    id="level"
                    class="w-full rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                  >
                    <option value="">All Levels</option>
                    <option value="debug" ${filters.level === "debug" ? "selected" : ""}>Debug</option>
                    <option value="info" ${filters.level === "info" ? "selected" : ""}>Info</option>
                    <option value="warn" ${filters.level === "warn" ? "selected" : ""}>Warning</option>
                    <option value="error" ${filters.level === "error" ? "selected" : ""}>Error</option>
                    <option value="fatal" ${filters.level === "fatal" ? "selected" : ""}>Fatal</option>
                  </select>
                </div>

                <div>
                  <label for="category" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Category</label>
                  <select
                    name="category"
                    id="category"
                    class="w-full rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                  >
                    <option value="">All Categories</option>
                    <option value="auth" ${filters.category === "auth" ? "selected" : ""}>Authentication</option>
                    <option value="api" ${filters.category === "api" ? "selected" : ""}>API</option>
                    <option value="workflow" ${filters.category === "workflow" ? "selected" : ""}>Workflow</option>
                    <option value="plugin" ${filters.category === "plugin" ? "selected" : ""}>Plugin</option>
                    <option value="media" ${filters.category === "media" ? "selected" : ""}>Media</option>
                    <option value="system" ${filters.category === "system" ? "selected" : ""}>System</option>
                    <option value="security" ${filters.category === "security" ? "selected" : ""}>Security</option>
                    <option value="error" ${filters.category === "error" ? "selected" : ""}>Error</option>
                  </select>
                </div>

                <div>
                  <label for="source" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Source</label>
                  <input
                    type="text"
                    name="source"
                    id="source"
                    value="${filters.source}"
                    placeholder="e.g., http-middleware"
                    class="w-full rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                  />
                </div>

                <div>
                  <label for="start_date" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Start Date</label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    id="start_date"
                    value="${filters.startDate}"
                    class="w-full rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                  />
                </div>

                <div>
                  <label for="end_date" class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">End Date</label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    id="end_date"
                    value="${filters.endDate}"
                    class="w-full rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2 text-sm text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                  />
                </div>

                <div class="sm:col-span-2 flex items-end gap-x-2">
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                  >
                    Apply Filters
                  </button>
                  <a
                    href="/admin/logs"
                    class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors shadow-sm"
                  >
                    Clear
                  </a>
                </div>
              </div>

              <div class="flex items-center justify-end pt-2">
                <span class="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm">${pagination.totalItems} ${pagination.totalItems === 1 ? "entry" : "entries"}</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Logs Table -->
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b border-zinc-950/5 dark:border-white/5">
                <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white sm:pl-6">
                  Level
                </th>
                <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white">
                  Category
                </th>
                <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white">
                  Message
                </th>
                <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white">
                  Source
                </th>
                <th scope="col" class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white">
                  Time
                </th>
                <th scope="col" class="relative px-4 py-3.5 sm:pr-6">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              ${logs.map((log) => `
                <tr class="border-t border-zinc-950/5 dark:border-white/5 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:via-blue-50/30 hover:to-purple-50/50 dark:hover:from-cyan-900/20 dark:hover:via-blue-900/10 dark:hover:to-purple-900/20 hover:shadow-sm hover:shadow-cyan-500/5 dark:hover:shadow-cyan-400/5 transition-all duration-300">
                  <td class="px-4 py-4 whitespace-nowrap sm:pl-6">
                    <span class="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${log.levelClass}">
                      ${log.level}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${log.categoryClass}">
                      ${log.category}
                    </span>
                  </td>
                  <td class="px-4 py-4">
                    <div class="text-sm max-w-md">
                      <div class="truncate text-zinc-950 dark:text-white" title="${log.message}">${log.message}</div>
                      ${log.url ? `<div class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">${log.method} ${log.url}</div>` : ""}
                      ${log.duration ? `<div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">${log.formattedDuration}</div>` : ""}
                    </div>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                    ${log.source || "-"}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                    ${log.formattedDate}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium sm:pr-6">
                    <a href="/admin/logs/${log.id}" class="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                      View Details
                    </a>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        ${logs.length === 0 ? `
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-zinc-950 dark:text-white">No log entries</h3>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">No log entries found matching your criteria.</p>
          </div>
        ` : ""}
      </div>

      <!-- Pagination -->
      ${pagination.totalPages > 1 ? `
        <div class="mt-6 flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            ${pagination.currentPage > 1 ? `
              <a
                href="${pagination.baseUrl}?${new URLSearchParams({ ...filters, page: (pagination.currentPage - 1).toString() }).toString()}"
                class="relative inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
              >
                Previous
              </a>
            ` : `
              <span class="relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
                Previous
              </span>
            `}
            ${pagination.currentPage < pagination.totalPages ? `
              <a
                href="${pagination.baseUrl}?${new URLSearchParams({ ...filters, page: (pagination.currentPage + 1).toString() }).toString()}"
                class="ml-3 relative inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
              >
                Next
              </a>
            ` : `
              <span class="ml-3 relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
                Next
              </span>
            `}
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-zinc-700 dark:text-zinc-300">
                Showing <span class="font-medium">${pagination.startItem}</span> to <span class="font-medium">${pagination.endItem}</span> of{' '}
                <span class="font-medium">${pagination.totalItems}</span> results
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                ${pagination.currentPage > 1 ? `
                  <a
                    href="${pagination.baseUrl}?${new URLSearchParams({ ...filters, page: (pagination.currentPage - 1).toString() }).toString()}"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
                  >
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                ` : ""}

                ${Array.from({ length: Math.min(10, pagination.totalPages) }, (_, i) => {
    const page = Math.max(1, Math.min(pagination.totalPages - 9, pagination.currentPage - 5)) + i;
    if (page > pagination.totalPages) return "";
    return `
                    <a
                      href="${pagination.baseUrl}?${new URLSearchParams({ ...filters, page: page.toString() }).toString()}"
                      class="relative inline-flex items-center px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${page === pagination.currentPage ? "z-10 bg-cyan-50 dark:bg-cyan-900/20 ring-cyan-600 dark:ring-cyan-400 text-cyan-600 dark:text-cyan-400" : "bg-white dark:bg-zinc-800 ring-zinc-950/10 dark:ring-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"}"
                    >
                      ${page}
                    </a>
                  `;
  }).join("")}

                ${pagination.currentPage < pagination.totalPages ? `
                  <a
                    href="${pagination.baseUrl}?${new URLSearchParams({ ...filters, page: (pagination.currentPage + 1).toString() }).toString()}"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-lg bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 transition-colors"
                  >
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                  </a>
                ` : ""}
              </nav>
            </div>
          </div>
        </div>
      ` : ""}
    </div>
  `;
  const layoutData = {
    title: "System Logs",
    pageTitle: "System Logs",
    currentPath: "/admin/logs",
    user,
    content
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}
function renderLogDetailsPage(data) {
  const { log, user } = data;
  const content = html.html`
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <nav class="mb-4">
            <a href="/admin/logs" class="text-indigo-600 hover:text-indigo-900">
              ← Back to Logs
            </a>
          </nav>
          <h1 class="text-2xl font-semibold text-gray-900">Log Details</h1>
          <p class="mt-2 text-sm text-gray-700">
            Detailed information for log entry ${log.id}
          </p>
        </div>
      </div>

      <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-medium text-gray-900">Log Entry Information</h2>
            <div class="flex items-center space-x-2">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.levelClass}">
                ${log.level}
              </span>
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.categoryClass}">
                ${log.category}
              </span>
            </div>
          </div>
        </div>
        
        <div class="px-6 py-4">
          <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-gray-500">ID</dt>
              <dd class="mt-1 text-sm text-gray-900 font-mono">${log.id}</dd>
            </div>
            
            <div>
              <dt class="text-sm font-medium text-gray-500">Timestamp</dt>
              <dd class="mt-1 text-sm text-gray-900">${log.formattedDate}</dd>
            </div>
            
            <div>
              <dt class="text-sm font-medium text-gray-500">Level</dt>
              <dd class="mt-1">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.levelClass}">
                  ${log.level}
                </span>
              </dd>
            </div>
            
            <div>
              <dt class="text-sm font-medium text-gray-500">Category</dt>
              <dd class="mt-1">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.categoryClass}">
                  ${log.category}
                </span>
              </dd>
            </div>
            
            ${log.source ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">Source</dt>
                <dd class="mt-1 text-sm text-gray-900">${log.source}</dd>
              </div>
            ` : ""}
            
            ${log.userId ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">User ID</dt>
                <dd class="mt-1 text-sm text-gray-900 font-mono">${log.userId}</dd>
              </div>
            ` : ""}
            
            ${log.sessionId ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">Session ID</dt>
                <dd class="mt-1 text-sm text-gray-900 font-mono">${log.sessionId}</dd>
              </div>
            ` : ""}
            
            ${log.requestId ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">Request ID</dt>
                <dd class="mt-1 text-sm text-gray-900 font-mono">${log.requestId}</dd>
              </div>
            ` : ""}
            
            ${log.ipAddress ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">IP Address</dt>
                <dd class="mt-1 text-sm text-gray-900">${log.ipAddress}</dd>
              </div>
            ` : ""}
            
            ${log.method && log.url ? html.html`
              <div class="sm:col-span-2">
                <dt class="text-sm font-medium text-gray-500">HTTP Request</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <span class="font-medium">${log.method}</span> ${log.url}
                  ${log.statusCode ? html.html`<span class="ml-2 text-gray-500">(${log.statusCode})</span>` : ""}
                </dd>
              </div>
            ` : ""}
            
            ${log.duration ? html.html`
              <div>
                <dt class="text-sm font-medium text-gray-500">Duration</dt>
                <dd class="mt-1 text-sm text-gray-900">${log.formattedDuration}</dd>
              </div>
            ` : ""}
            
            ${log.userAgent ? html.html`
              <div class="sm:col-span-2">
                <dt class="text-sm font-medium text-gray-500">User Agent</dt>
                <dd class="mt-1 text-sm text-gray-900 break-all">${log.userAgent}</dd>
              </div>
            ` : ""}
          </dl>
        </div>
      </div>

      <!-- Message -->
      <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Message</h3>
        </div>
        <div class="px-6 py-4">
          <div class="text-sm text-gray-900 whitespace-pre-wrap break-words">
            ${log.message}
          </div>
        </div>
      </div>

      <!-- Tags -->
      ${log.tags && log.tags.length > 0 ? html.html`
        <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Tags</h3>
          </div>
          <div class="px-6 py-4">
            <div class="flex flex-wrap gap-2">
              ${log.tags.map((tag) => html.html`
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  ${tag}
                </span>
              `).join("")}
            </div>
          </div>
        </div>
      ` : ""}

      <!-- Additional Data -->
      ${log.data ? html.html`
        <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Additional Data</h3>
          </div>
          <div class="px-6 py-4">
            <pre class="text-sm text-gray-900 bg-gray-50 rounded-md p-4 overflow-x-auto"><code>${JSON.stringify(log.data, null, 2)}</code></pre>
          </div>
        </div>
      ` : ""}

      <!-- Stack Trace -->
      ${log.stackTrace ? html.html`
        <div class="mt-6 bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-medium text-gray-900">Stack Trace</h3>
          </div>
          <div class="px-6 py-4">
            <pre class="text-sm text-gray-900 bg-gray-50 rounded-md p-4 overflow-x-auto whitespace-pre-wrap"><code>${log.stackTrace}</code></pre>
          </div>
        </div>
      ` : ""}

      <!-- Actions -->
      <div class="mt-6 flex justify-between">
        <a
          href="/admin/logs"
          class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          ← Back to Logs
        </a>
        
        <div class="flex space-x-3">
          ${log.level === "error" || log.level === "fatal" ? html.html`
            <button
              type="button"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onclick="alert('Error reporting functionality would be implemented here')"
            >
              Report Issue
            </button>
          ` : ""}
          
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(log)}, null, 2)).then(() => alert('Log details copied to clipboard'))"
          >
            Copy Details
          </button>
        </div>
      </div>
    </div>
  `;
  return chunk3SPQ3J4N_cjs.adminLayoutV2({
    title: `Log Details - ${log.id}`,
    user,
    content
  });
}
function renderLogConfigPage(data) {
  const { configs, user } = data;
  const content = html.html`
    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <nav class="mb-4">
            <a href="/admin/logs" class="text-indigo-600 hover:text-indigo-900">
              ← Back to Logs
            </a>
          </nav>
          <h1 class="text-2xl font-semibold text-gray-900">Log Configuration</h1>
          <p class="mt-2 text-sm text-gray-700">
            Configure logging settings for different categories and manage log retention policies.
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            hx-post="/admin/logs/cleanup"
            hx-confirm="Are you sure you want to run log cleanup? This will permanently delete old logs based on retention policies."
            hx-target="#cleanup-result"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Run Cleanup
          </button>
        </div>
      </div>

      <div id="cleanup-result" class="mt-4"></div>

      <!-- Log Levels Reference -->
      <div class="mt-6 bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Log Levels Reference</h2>
        </div>
        <div class="px-6 py-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div class="text-center">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                debug
              </span>
              <p class="mt-2 text-xs text-gray-500">Detailed diagnostic information</p>
            </div>
            <div class="text-center">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                info
              </span>
              <p class="mt-2 text-xs text-gray-500">General information messages</p>
            </div>
            <div class="text-center">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                warn
              </span>
              <p class="mt-2 text-xs text-gray-500">Warning conditions</p>
            </div>
            <div class="text-center">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                error
              </span>
              <p class="mt-2 text-xs text-gray-500">Error conditions</p>
            </div>
            <div class="text-center">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                fatal
              </span>
              <p class="mt-2 text-xs text-gray-500">Critical system errors</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration Cards -->
      <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        ${configs.map((config) => html.html`
          <div class="bg-white shadow rounded-lg overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900 capitalize">${config.category}</h3>
                <div class="flex items-center">
                  ${config.enabled ? html.html`
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Enabled
                    </span>
                  ` : html.html`
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Disabled
                    </span>
                  `}
                </div>
              </div>
            </div>
            
            <form hx-post="/admin/logs/config/${config.category}" hx-target="#config-result-${config.category}">
              <div class="px-6 py-4 space-y-4">
                <div class="flex gap-3">
                  <div class="flex h-6 shrink-0 items-center">
                    <div class="group grid size-4 grid-cols-1">
                      <input
                        id="enabled-${config.category}"
                        name="enabled"
                        type="checkbox"
                        ${config.enabled ? "checked" : ""}
                        class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                      />
                      <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                        <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                        <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                      </svg>
                    </div>
                  </div>
                  <div class="text-sm/6">
                    <label for="enabled-${config.category}" class="font-medium text-zinc-950 dark:text-white">
                      Enable logging for this category
                    </label>
                  </div>
                </div>
                
                <div>
                  <label for="level-${config.category}" class="block text-sm font-medium text-gray-700">
                    Minimum Log Level
                  </label>
                  <select
                    id="level-${config.category}"
                    name="level"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="debug" ${config.level === "debug" ? "selected" : ""}>Debug</option>
                    <option value="info" ${config.level === "info" ? "selected" : ""}>Info</option>
                    <option value="warn" ${config.level === "warn" ? "selected" : ""}>Warning</option>
                    <option value="error" ${config.level === "error" ? "selected" : ""}>Error</option>
                    <option value="fatal" ${config.level === "fatal" ? "selected" : ""}>Fatal</option>
                  </select>
                  <p class="mt-1 text-sm text-gray-500">Only logs at this level or higher will be stored</p>
                </div>
                
                <div>
                  <label for="retention-${config.category}" class="block text-sm font-medium text-gray-700">
                    Retention Period (days)
                  </label>
                  <input
                    type="number"
                    id="retention-${config.category}"
                    name="retention"
                    value="${config.retention}"
                    min="1"
                    max="365"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p class="mt-1 text-sm text-gray-500">Logs older than this will be deleted</p>
                </div>
                
                <div>
                  <label for="max_size-${config.category}" class="block text-sm font-medium text-gray-700">
                    Maximum Log Count
                  </label>
                  <input
                    type="number"
                    id="max_size-${config.category}"
                    name="max_size"
                    value="${config.maxSize || ""}"
                    min="100"
                    max="100000"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p class="mt-1 text-sm text-gray-500">Maximum number of logs to keep for this category</p>
                </div>
              </div>
              
              <div class="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div id="config-result-${config.category}" class="mb-4"></div>
                <button
                  type="submit"
                  class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Update Configuration
                </button>
              </div>
            </form>
            
            <div class="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <div class="text-xs text-gray-500">
                <div>Created: ${new Date(config.createdAt).toLocaleDateString()}</div>
                <div>Updated: ${new Date(config.updatedAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Global Settings -->
      <div class="mt-8 bg-white shadow rounded-lg">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-medium text-gray-900">Global Log Settings</h2>
        </div>
        <div class="px-6 py-4">
          <div class="space-y-6">
            <div>
              <h3 class="text-base font-medium text-gray-900">Storage Information</h3>
              <div class="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-2xl font-bold text-gray-900">-</div>
                  <div class="text-sm text-gray-500">Total Log Entries</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-2xl font-bold text-gray-900">-</div>
                  <div class="text-sm text-gray-500">Storage Used</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-2xl font-bold text-gray-900">-</div>
                  <div class="text-sm text-gray-500">Oldest Log</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-base font-medium text-gray-900">Log Categories</h3>
              <div class="mt-2 text-sm text-gray-600">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>auth</strong> - Authentication and authorization events</li>
                  <li><strong>api</strong> - API requests and responses</li>
                  <li><strong>workflow</strong> - Content workflow state changes</li>
                  <li><strong>plugin</strong> - Plugin-related activities</li>
                  <li><strong>media</strong> - File upload and media operations</li>
                  <li><strong>system</strong> - General system events</li>
                  <li><strong>security</strong> - Security-related events and alerts</li>
                  <li><strong>error</strong> - General error conditions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script src="https://unpkg.com/htmx.org@1.9.6"></script>
  `;
  return chunk3SPQ3J4N_cjs.adminLayoutV2({
    title: "Log Configuration",
    user,
    content
  });
}

// src/routes/admin-logs.ts
var adminLogsRoutes = new hono.Hono();
adminLogsRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
adminLogsRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    const query = c.req.query();
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "50");
    const level = query.level;
    const category = query.category;
    const search = query.search;
    const startDate = query.start_date;
    const endDate = query.end_date;
    const source = query.source;
    const filter = {
      limit,
      offset: (page - 1) * limit,
      sortBy: "created_at",
      sortOrder: "desc"
    };
    if (level) {
      filter.level = level.split(",");
    }
    if (category) {
      filter.category = category.split(",");
    }
    if (search) {
      filter.search = search;
    }
    if (startDate) {
      filter.startDate = new Date(startDate);
    }
    if (endDate) {
      filter.endDate = new Date(endDate);
    }
    if (source) {
      filter.source = source;
    }
    const { logs, total } = await logger.getLogs(filter);
    const formattedLogs = logs.map((log) => ({
      ...log,
      data: log.data ? JSON.parse(log.data) : null,
      tags: log.tags ? JSON.parse(log.tags) : [],
      formattedDate: new Date(log.createdAt).toLocaleString(),
      formattedDuration: log.duration ? `${log.duration}ms` : null,
      levelClass: getLevelClass(log.level),
      categoryClass: getCategoryClass(log.category)
    }));
    const totalPages = Math.ceil(total / limit);
    const pageData = {
      logs: formattedLogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        startItem: (page - 1) * limit + 1,
        endItem: Math.min(page * limit, total),
        baseUrl: "/admin/logs"
      },
      filters: {
        level: level || "",
        category: category || "",
        search: search || "",
        startDate: startDate || "",
        endDate: endDate || "",
        source: source || ""
      },
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    };
    return c.html(renderLogsListPage(pageData));
  } catch (error) {
    console.error("Error fetching logs:", error);
    return c.html(html.html`<p>Error loading logs: ${error}</p>`);
  }
});
adminLogsRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    const { logs } = await logger.getLogs({
      limit: 1,
      offset: 0,
      search: id
      // Using search to find by ID - this is a simplification
    });
    const log = logs.find((l) => l.id === id);
    if (!log) {
      return c.html(html.html`<p>Log entry not found</p>`);
    }
    const formattedLog = {
      ...log,
      data: log.data ? JSON.parse(log.data) : null,
      tags: log.tags ? JSON.parse(log.tags) : [],
      formattedDate: new Date(log.createdAt).toLocaleString(),
      formattedDuration: log.duration ? `${log.duration}ms` : null,
      levelClass: getLevelClass(log.level),
      categoryClass: getCategoryClass(log.category)
    };
    const pageData = {
      log: formattedLog,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    };
    return c.html(renderLogDetailsPage(pageData));
  } catch (error) {
    console.error("Error fetching log details:", error);
    return c.html(html.html`<p>Error loading log details: ${error}</p>`);
  }
});
adminLogsRoutes.get("/config", async (c) => {
  try {
    const user = c.get("user");
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    const configs = await logger.getAllConfigs();
    const pageData = {
      configs,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    };
    return c.html(renderLogConfigPage(pageData));
  } catch (error) {
    console.error("Error fetching log config:", error);
    return c.html(html.html`<p>Error loading log configuration: ${error}</p>`);
  }
});
adminLogsRoutes.post("/config/:category", async (c) => {
  try {
    const category = c.req.param("category");
    const formData = await c.req.formData();
    const enabled = formData.get("enabled") === "on";
    const level = formData.get("level");
    const retention = parseInt(formData.get("retention"));
    const maxSize = parseInt(formData.get("max_size"));
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    await logger.updateConfig(category, {
      enabled,
      level,
      retention,
      maxSize
    });
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        Configuration updated successfully!
      </div>
    `);
  } catch (error) {
    console.error("Error updating log config:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to update configuration. Please try again.
      </div>
    `);
  }
});
adminLogsRoutes.get("/export", async (c) => {
  try {
    const query = c.req.query();
    const format = query.format || "csv";
    const level = query.level;
    const category = query.category;
    const startDate = query.start_date;
    const endDate = query.end_date;
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    const filter = {
      limit: 1e4,
      // Export up to 10k logs
      offset: 0,
      sortBy: "created_at",
      sortOrder: "desc"
    };
    if (level) {
      filter.level = level.split(",");
    }
    if (category) {
      filter.category = category.split(",");
    }
    if (startDate) {
      filter.startDate = new Date(startDate);
    }
    if (endDate) {
      filter.endDate = new Date(endDate);
    }
    const { logs } = await logger.getLogs(filter);
    if (format === "json") {
      return c.json(logs, 200, {
        "Content-Disposition": 'attachment; filename="logs-export.json"'
      });
    } else {
      const headers = [
        "ID",
        "Level",
        "Category",
        "Message",
        "Source",
        "User ID",
        "IP Address",
        "Method",
        "URL",
        "Status Code",
        "Duration",
        "Created At"
      ];
      const csvRows = [headers.join(",")];
      logs.forEach((log) => {
        const row = [
          log.id,
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          // Escape quotes
          log.source || "",
          log.userId || "",
          log.ipAddress || "",
          log.method || "",
          log.url || "",
          log.statusCode || "",
          log.duration || "",
          new Date(log.createdAt).toISOString()
        ];
        csvRows.push(row.join(","));
      });
      const csv = csvRows.join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="logs-export.csv"'
        }
      });
    }
  } catch (error) {
    console.error("Error exporting logs:", error);
    return c.json({ error: "Failed to export logs" }, 500);
  }
});
adminLogsRoutes.post("/cleanup", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({
        success: false,
        error: "Unauthorized. Admin access required."
      }, 403);
    }
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    await logger.cleanupByRetention();
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        Log cleanup completed successfully!
      </div>
    `);
  } catch (error) {
    console.error("Error cleaning up logs:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to clean up logs. Please try again.
      </div>
    `);
  }
});
adminLogsRoutes.post("/search", async (c) => {
  try {
    const formData = await c.req.formData();
    const search = formData.get("search");
    const level = formData.get("level");
    const category = formData.get("category");
    const logger = chunk3NVJ6W27_cjs.getLogger(c.env.DB);
    const filter = {
      limit: 20,
      offset: 0,
      sortBy: "created_at",
      sortOrder: "desc"
    };
    if (search) filter.search = search;
    if (level) filter.level = [level];
    if (category) filter.category = [category];
    const { logs } = await logger.getLogs(filter);
    const rows = logs.map((log) => {
      const formattedLog = {
        ...log,
        formattedDate: new Date(log.createdAt).toLocaleString(),
        levelClass: getLevelClass(log.level),
        categoryClass: getCategoryClass(log.category)
      };
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${formattedLog.levelClass}">
              ${formattedLog.level}
            </span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${formattedLog.categoryClass}">
              ${formattedLog.category}
            </span>
          </td>
          <td class="px-6 py-4">
            <div class="text-sm text-gray-900 max-w-md truncate">${formattedLog.message}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedLog.source || "-"}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedLog.formattedDate}</td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <a href="/admin/logs/${formattedLog.id}" class="text-indigo-600 hover:text-indigo-900">View</a>
          </td>
        </tr>
      `;
    }).join("");
    return c.html(rows);
  } catch (error) {
    console.error("Error searching logs:", error);
    return c.html(html.html`<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Error searching logs</td></tr>`);
  }
});
function getLevelClass(level) {
  switch (level) {
    case "debug":
      return "bg-gray-100 text-gray-800";
    case "info":
      return "bg-blue-100 text-blue-800";
    case "warn":
      return "bg-yellow-100 text-yellow-800";
    case "error":
      return "bg-red-100 text-red-800";
    case "fatal":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
function getCategoryClass(category) {
  switch (category) {
    case "auth":
      return "bg-green-100 text-green-800";
    case "api":
      return "bg-blue-100 text-blue-800";
    case "workflow":
      return "bg-purple-100 text-purple-800";
    case "plugin":
      return "bg-indigo-100 text-indigo-800";
    case "media":
      return "bg-pink-100 text-pink-800";
    case "system":
      return "bg-gray-100 text-gray-800";
    case "security":
      return "bg-red-100 text-red-800";
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
var adminDesignRoutes = new hono.Hono();
adminDesignRoutes.get("/", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0
  };
  return c.html(chunk3SPQ3J4N_cjs.renderDesignPage(pageData));
});
var adminCheckboxRoutes = new hono.Hono();
adminCheckboxRoutes.get("/", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0
  };
  return c.html(chunk3SPQ3J4N_cjs.renderCheckboxPage(pageData));
});

// src/templates/pages/admin-faq-form.template.ts
function renderFAQForm(data) {
  const { faq, isEdit, errors, message, messageType } = data;
  const pageTitle = isEdit ? "Edit FAQ" : "New FAQ";
  const pageContent = `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">${pageTitle}</h1>
          <p class="mt-2 text-sm text-gray-300">
            ${isEdit ? "Update the FAQ details below" : "Create a new frequently asked question"}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/faq" 
             class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </a>
        </div>
      </div>

      ${message ? chunk3SPQ3J4N_cjs.renderAlert({ type: messageType || "info", message, dismissible: true }) : ""}

      <!-- Form -->
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl">
        <form ${isEdit ? `hx-put="/admin/faq/${faq?.id}"` : 'hx-post="/admin/faq"'} 
              hx-target="body" 
              hx-swap="outerHTML"
              class="space-y-6 p-6">
          
          <!-- Question -->
          <div>
            <label for="question" class="block text-sm font-medium text-white">
              Question <span class="text-red-400">*</span>
            </label>
            <div class="mt-1">
              <textarea name="question" 
                        id="question" 
                        rows="3" 
                        required
                        maxlength="500"
                        class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
                        placeholder="Enter the frequently asked question...">${faq?.question || ""}</textarea>
              <p class="mt-1 text-sm text-gray-300">
                <span id="question-count">0</span>/500 characters
              </p>
            </div>
            ${errors?.question ? `
              <div class="mt-1">
                ${errors.question.map((error) => `
                  <p class="text-sm text-red-400">${escapeHtml4(error)}</p>
                `).join("")}
              </div>
            ` : ""}
          </div>

          <!-- Answer -->
          <div>
            <label for="answer" class="block text-sm font-medium text-white">
              Answer <span class="text-red-400">*</span>
            </label>
            <div class="mt-1">
              <textarea name="answer" 
                        id="answer" 
                        rows="6" 
                        required
                        maxlength="2000"
                        class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
                        placeholder="Enter the detailed answer...">${faq?.answer || ""}</textarea>
              <p class="mt-1 text-sm text-gray-300">
                <span id="answer-count">0</span>/2000 characters. You can use basic HTML for formatting.
              </p>
            </div>
            ${errors?.answer ? `
              <div class="mt-1">
                ${errors.answer.map((error) => `
                  <p class="text-sm text-red-400">${escapeHtml4(error)}</p>
                `).join("")}
              </div>
            ` : ""}
          </div>

          <!-- Category and Tags Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Category -->
            <div>
              <label for="category" class="block text-sm font-medium text-white">Category</label>
              <div class="mt-1">
                <select name="category" 
                        id="category" 
                        class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="">Select a category</option>
                  <option value="general" ${faq?.category === "general" ? "selected" : ""}>General</option>
                  <option value="technical" ${faq?.category === "technical" ? "selected" : ""}>Technical</option>
                  <option value="billing" ${faq?.category === "billing" ? "selected" : ""}>Billing</option>
                  <option value="support" ${faq?.category === "support" ? "selected" : ""}>Support</option>
                  <option value="account" ${faq?.category === "account" ? "selected" : ""}>Account</option>
                  <option value="features" ${faq?.category === "features" ? "selected" : ""}>Features</option>
                </select>
              </div>
              ${errors?.category ? `
                <div class="mt-1">
                  ${errors.category.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml4(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>

            <!-- Tags -->
            <div>
              <label for="tags" class="block text-sm font-medium text-white">Tags</label>
              <div class="mt-1">
                <input type="text" 
                       name="tags" 
                       id="tags" 
                       value="${faq?.tags || ""}"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                       placeholder="e.g., payment, setup, troubleshooting">
                <p class="mt-1 text-sm text-gray-300">Separate multiple tags with commas</p>
              </div>
              ${errors?.tags ? `
                <div class="mt-1">
                  ${errors.tags.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml4(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Status and Sort Order Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Published Status -->
            <div>
              <label class="block text-sm font-medium text-white">Status</label>
              <div class="mt-2 space-y-2">
                <div class="flex items-center">
                  <input id="published" 
                         name="isPublished" 
                         type="radio" 
                         value="true"
                         ${!faq || faq.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-600 bg-gray-700">
                  <label for="published" class="ml-2 block text-sm text-white">
                    Published <span class="text-gray-300">(visible to users)</span>
                  </label>
                </div>
                <div class="flex items-center">
                  <input id="draft" 
                         name="isPublished" 
                         type="radio" 
                         value="false"
                         ${faq && !faq.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-600 bg-gray-700">
                  <label for="draft" class="ml-2 block text-sm text-white">
                    Draft <span class="text-gray-300">(not visible to users)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Sort Order -->
            <div>
              <label for="sortOrder" class="block text-sm font-medium text-white">Sort Order</label>
              <div class="mt-1">
                <input type="number" 
                       name="sortOrder" 
                       id="sortOrder" 
                       value="${faq?.sortOrder || 0}"
                       min="0"
                       step="1"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                <p class="mt-1 text-sm text-gray-300">Lower numbers appear first (0 = highest priority)</p>
              </div>
              ${errors?.sortOrder ? `
                <div class="mt-1">
                  ${errors.sortOrder.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml4(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-3 pt-6 border-t border-white/20">
            <a href="/admin/faq" 
               class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
              Cancel
            </a>
            <button type="submit" 
                    class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-blue-500/80 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-blue-500 transition-all">
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              ${isEdit ? "Update FAQ" : "Create FAQ"}
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Character count for question
      const questionTextarea = document.getElementById('question');
      const questionCount = document.getElementById('question-count');
      
      function updateQuestionCount() {
        questionCount.textContent = questionTextarea.value.length;
      }
      
      questionTextarea.addEventListener('input', updateQuestionCount);
      updateQuestionCount(); // Initial count

      // Character count for answer
      const answerTextarea = document.getElementById('answer');
      const answerCount = document.getElementById('answer-count');
      
      function updateAnswerCount() {
        answerCount.textContent = answerTextarea.value.length;
      }
      
      answerTextarea.addEventListener('input', updateAnswerCount);
      updateAnswerCount(); // Initial count
    </script>
  `;
  const layoutData = {
    title: `${pageTitle} - Admin`,
    pageTitle,
    currentPath: isEdit ? `/admin/faq/${faq?.id}` : "/admin/faq/new",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function escapeHtml4(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/routes/admin-faq.ts
var faqSchema = zod.z.object({
  question: zod.z.string().min(1, "Question is required").max(500, "Question must be under 500 characters"),
  answer: zod.z.string().min(1, "Answer is required").max(2e3, "Answer must be under 2000 characters"),
  category: zod.z.string().optional(),
  tags: zod.z.string().optional(),
  isPublished: zod.z.string().transform((val) => val === "true"),
  sortOrder: zod.z.string().transform((val) => parseInt(val, 10)).pipe(zod.z.number().min(0))
});
var adminFAQRoutes = new hono.Hono();
adminFAQRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const { category, published, search, page = "1" } = c.req.query();
    const currentPage = parseInt(page, 10) || 1;
    const limit = 20;
    const offset = (currentPage - 1) * limit;
    const db = c.env?.DB;
    if (!db) {
      return c.html(chunk3SPQ3J4N_cjs.renderFAQList({
        faqs: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    let whereClause = "WHERE 1=1";
    const params = [];
    if (category) {
      whereClause += " AND category = ?";
      params.push(category);
    }
    if (published !== void 0) {
      whereClause += " AND isPublished = ?";
      params.push(published === "true" ? 1 : 0);
    }
    if (search) {
      whereClause += " AND (question LIKE ? OR answer LIKE ? OR tags LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    const countQuery = `SELECT COUNT(*) as count FROM faqs ${whereClause}`;
    const { results: countResults } = await db.prepare(countQuery).bind(...params).all();
    const totalCount = countResults?.[0]?.count || 0;
    const dataQuery = `
      SELECT * FROM faqs 
      ${whereClause} 
      ORDER BY sortOrder ASC, created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const { results: faqs } = await db.prepare(dataQuery).bind(...params, limit, offset).all();
    const totalPages = Math.ceil(totalCount / limit);
    return c.html(chunk3SPQ3J4N_cjs.renderFAQList({
      faqs: faqs || [],
      totalCount,
      currentPage,
      totalPages,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    const user = c.get("user");
    return c.html(chunk3SPQ3J4N_cjs.renderFAQList({
      faqs: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load FAQs",
      messageType: "error"
    }));
  }
});
adminFAQRoutes.get("/new", async (c) => {
  const user = c.get("user");
  return c.html(renderFAQForm({
    isEdit: false,
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0
  }));
});
adminFAQRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = faqSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderFAQForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      INSERT INTO faqs (question, answer, category, tags, isPublished, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      validatedData.question,
      validatedData.answer,
      validatedData.category || null,
      validatedData.tags || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/faq?message=FAQ created successfully");
    } else {
      return c.html(renderFAQForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Failed to create FAQ",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error creating FAQ:", error);
    const user = c.get("user");
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderFAQForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderFAQForm({
      isEdit: false,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to create FAQ",
      messageType: "error"
    }));
  }
});
adminFAQRoutes.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderFAQForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare("SELECT * FROM faqs WHERE id = ?").bind(id).all();
    if (!results || results.length === 0) {
      return c.redirect("/admin/faq?message=FAQ not found&type=error");
    }
    const faq = results[0];
    return c.html(renderFAQForm({
      faq: {
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        tags: faq.tags,
        isPublished: Boolean(faq.isPublished),
        sortOrder: faq.sortOrder
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching FAQ:", error);
    const user = c.get("user");
    return c.html(renderFAQForm({
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load FAQ",
      messageType: "error"
    }));
  }
});
adminFAQRoutes.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = faqSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderFAQForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      UPDATE faqs 
      SET question = ?, answer = ?, category = ?, tags = ?, isPublished = ?, sortOrder = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      validatedData.question,
      validatedData.answer,
      validatedData.category || null,
      validatedData.tags || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder,
      id
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/faq?message=FAQ updated successfully");
    } else {
      return c.html(renderFAQForm({
        faq: {
          id,
          question: validatedData.question,
          answer: validatedData.answer,
          category: validatedData.category,
          tags: validatedData.tags,
          isPublished: validatedData.isPublished,
          sortOrder: validatedData.sortOrder
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "FAQ not found",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error updating FAQ:", error);
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderFAQForm({
        faq: {
          id,
          question: "",
          answer: "",
          category: "",
          tags: "",
          isPublished: true,
          sortOrder: 0
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderFAQForm({
      faq: {
        id,
        question: "",
        answer: "",
        category: "",
        tags: "",
        isPublished: true,
        sortOrder: 0
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to update FAQ",
      messageType: "error"
    }));
  }
});
adminFAQRoutes.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const db = c.env?.DB;
    if (!db) {
      return c.json({ error: "Database not available" }, 500);
    }
    const { changes } = await db.prepare("DELETE FROM faqs WHERE id = ?").bind(id).run();
    if (changes === 0) {
      return c.json({ error: "FAQ not found" }, 404);
    }
    return c.redirect("/admin/faq?message=FAQ deleted successfully");
  } catch (error) {
    console.error("Error deleting FAQ:", error);
    return c.json({ error: "Failed to delete FAQ" }, 500);
  }
});
var admin_faq_default = adminFAQRoutes;

// src/templates/pages/admin-testimonials-form.template.ts
function renderTestimonialsForm(data) {
  const { testimonial, isEdit, errors, message, messageType } = data;
  const pageTitle = isEdit ? "Edit Testimonial" : "New Testimonial";
  const pageContent = `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">${pageTitle}</h1>
          <p class="mt-2 text-sm text-gray-300">
            ${isEdit ? "Update the testimonial details below" : "Create a new customer testimonial"}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/testimonials"
             class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </a>
        </div>
      </div>

      ${message ? chunk3SPQ3J4N_cjs.renderAlert({ type: messageType || "info", message, dismissible: true }) : ""}

      <!-- Form -->
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl">
        <form ${isEdit ? `hx-put="/admin/testimonials/${testimonial?.id}"` : 'hx-post="/admin/testimonials"'}
              hx-target="body"
              hx-swap="outerHTML"
              class="space-y-6 p-6">

          <!-- Author Information Section -->
          <div>
            <h2 class="text-lg font-medium text-white mb-4">Author Information</h2>

            <!-- Author Name -->
            <div class="mb-4">
              <label for="authorName" class="block text-sm font-medium text-white">
                Author Name <span class="text-red-400">*</span>
              </label>
              <div class="mt-1">
                <input type="text"
                       name="authorName"
                       id="authorName"
                       value="${testimonial?.authorName || ""}"
                       required
                       maxlength="100"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                       placeholder="John Doe">
              </div>
              ${errors?.authorName ? `
                <div class="mt-1">
                  ${errors.authorName.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Author Title -->
              <div>
                <label for="authorTitle" class="block text-sm font-medium text-white">Title/Position</label>
                <div class="mt-1">
                  <input type="text"
                         name="authorTitle"
                         id="authorTitle"
                         value="${testimonial?.authorTitle || ""}"
                         maxlength="100"
                         class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                         placeholder="CEO">
                </div>
                ${errors?.authorTitle ? `
                  <div class="mt-1">
                    ${errors.authorTitle.map((error) => `
                      <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              <!-- Author Company -->
              <div>
                <label for="authorCompany" class="block text-sm font-medium text-white">Company</label>
                <div class="mt-1">
                  <input type="text"
                         name="authorCompany"
                         id="authorCompany"
                         value="${testimonial?.authorCompany || ""}"
                         maxlength="100"
                         class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                         placeholder="Acme Corp">
                </div>
                ${errors?.authorCompany ? `
                  <div class="mt-1">
                    ${errors.authorCompany.map((error) => `
                      <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            </div>
          </div>

          <!-- Testimonial Content Section -->
          <div>
            <h2 class="text-lg font-medium text-white mb-4">Testimonial</h2>

            <!-- Testimonial Text -->
            <div class="mb-4">
              <label for="testimonialText" class="block text-sm font-medium text-white">
                Testimonial <span class="text-red-400">*</span>
              </label>
              <div class="mt-1">
                <textarea name="testimonialText"
                          id="testimonialText"
                          rows="6"
                          required
                          maxlength="1000"
                          class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-300 focus:border-blue-400 focus:outline-none transition-colors w-full"
                          placeholder="Enter the customer's testimonial...">${testimonial?.testimonialText || ""}</textarea>
                <p class="mt-1 text-sm text-gray-300">
                  <span id="testimonial-count">0</span>/1000 characters
                </p>
              </div>
              ${errors?.testimonialText ? `
                <div class="mt-1">
                  ${errors.testimonialText.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>

            <!-- Rating -->
            <div>
              <label for="rating" class="block text-sm font-medium text-white">Rating (Optional)</label>
              <div class="mt-1">
                <select name="rating"
                        id="rating"
                        class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                  <option value="">No rating</option>
                  <option value="5" ${testimonial?.rating === 5 ? "selected" : ""}>\u2B50\u2B50\u2B50\u2B50\u2B50 (5 stars)</option>
                  <option value="4" ${testimonial?.rating === 4 ? "selected" : ""}>\u2B50\u2B50\u2B50\u2B50 (4 stars)</option>
                  <option value="3" ${testimonial?.rating === 3 ? "selected" : ""}>\u2B50\u2B50\u2B50 (3 stars)</option>
                  <option value="2" ${testimonial?.rating === 2 ? "selected" : ""}>\u2B50\u2B50 (2 stars)</option>
                  <option value="1" ${testimonial?.rating === 1 ? "selected" : ""}>\u2B50 (1 star)</option>
                </select>
              </div>
              ${errors?.rating ? `
                <div class="mt-1">
                  ${errors.rating.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Status and Sort Order Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Published Status -->
            <div>
              <label class="block text-sm font-medium text-white">Status</label>
              <div class="mt-2 space-y-2">
                <div class="flex items-center">
                  <input id="published"
                         name="isPublished"
                         type="radio"
                         value="true"
                         ${!testimonial || testimonial.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-600 bg-gray-700">
                  <label for="published" class="ml-2 block text-sm text-white">
                    Published <span class="text-gray-300">(visible to users)</span>
                  </label>
                </div>
                <div class="flex items-center">
                  <input id="draft"
                         name="isPublished"
                         type="radio"
                         value="false"
                         ${testimonial && !testimonial.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-600 bg-gray-700">
                  <label for="draft" class="ml-2 block text-sm text-white">
                    Draft <span class="text-gray-300">(not visible to users)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Sort Order -->
            <div>
              <label for="sortOrder" class="block text-sm font-medium text-white">Sort Order</label>
              <div class="mt-1">
                <input type="number"
                       name="sortOrder"
                       id="sortOrder"
                       value="${testimonial?.sortOrder || 0}"
                       min="0"
                       step="1"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
                <p class="mt-1 text-sm text-gray-300">Lower numbers appear first (0 = highest priority)</p>
              </div>
              ${errors?.sortOrder ? `
                <div class="mt-1">
                  ${errors.sortOrder.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml5(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-3 pt-6 border-t border-white/20">
            <a href="/admin/testimonials"
               class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
              Cancel
            </a>
            <button type="submit"
                    class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-blue-500/80 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-blue-500 transition-all">
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              ${isEdit ? "Update Testimonial" : "Create Testimonial"}
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Character count for testimonial
      const testimonialTextarea = document.getElementById('testimonialText');
      const testimonialCount = document.getElementById('testimonial-count');

      function updateTestimonialCount() {
        testimonialCount.textContent = testimonialTextarea.value.length;
      }

      testimonialTextarea.addEventListener('input', updateTestimonialCount);
      updateTestimonialCount(); // Initial count
    </script>
  `;
  const layoutData = {
    title: `${pageTitle} - Admin`,
    pageTitle,
    currentPath: isEdit ? `/admin/testimonials/${testimonial?.id}` : "/admin/testimonials/new",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function escapeHtml5(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/routes/admin-testimonials.ts
var testimonialSchema = zod.z.object({
  authorName: zod.z.string().min(1, "Author name is required").max(100, "Author name must be under 100 characters"),
  authorTitle: zod.z.string().optional(),
  authorCompany: zod.z.string().optional(),
  testimonialText: zod.z.string().min(1, "Testimonial is required").max(1e3, "Testimonial must be under 1000 characters"),
  rating: zod.z.string().transform((val) => val ? parseInt(val, 10) : void 0).pipe(zod.z.number().min(1).max(5).optional()),
  isPublished: zod.z.string().transform((val) => val === "true"),
  sortOrder: zod.z.string().transform((val) => parseInt(val, 10)).pipe(zod.z.number().min(0))
});
var adminTestimonialsRoutes = new hono.Hono();
adminTestimonialsRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const { published, minRating, search, page = "1" } = c.req.query();
    const currentPage = parseInt(page, 10) || 1;
    const limit = 20;
    const offset = (currentPage - 1) * limit;
    const db = c.env?.DB;
    if (!db) {
      return c.html(chunk3SPQ3J4N_cjs.renderTestimonialsList({
        testimonials: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    let whereClause = "WHERE 1=1";
    const params = [];
    if (published !== void 0) {
      whereClause += " AND isPublished = ?";
      params.push(published === "true" ? 1 : 0);
    }
    if (minRating) {
      whereClause += " AND rating >= ?";
      params.push(parseInt(minRating, 10));
    }
    if (search) {
      whereClause += " AND (author_name LIKE ? OR testimonial_text LIKE ? OR author_company LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    const countQuery = `SELECT COUNT(*) as count FROM testimonials ${whereClause}`;
    const { results: countResults } = await db.prepare(countQuery).bind(...params).all();
    const totalCount = countResults?.[0]?.count || 0;
    const dataQuery = `
      SELECT * FROM testimonials
      ${whereClause}
      ORDER BY sortOrder ASC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    const { results: testimonials } = await db.prepare(dataQuery).bind(...params, limit, offset).all();
    const totalPages = Math.ceil(totalCount / limit);
    return c.html(chunk3SPQ3J4N_cjs.renderTestimonialsList({
      testimonials: testimonials || [],
      totalCount,
      currentPage,
      totalPages,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    const user = c.get("user");
    return c.html(chunk3SPQ3J4N_cjs.renderTestimonialsList({
      testimonials: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load testimonials",
      messageType: "error"
    }));
  }
});
adminTestimonialsRoutes.get("/new", async (c) => {
  const user = c.get("user");
  return c.html(renderTestimonialsForm({
    isEdit: false,
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0
  }));
});
adminTestimonialsRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = testimonialSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderTestimonialsForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      INSERT INTO testimonials (author_name, author_title, author_company, testimonial_text, rating, isPublished, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      validatedData.authorName,
      validatedData.authorTitle || null,
      validatedData.authorCompany || null,
      validatedData.testimonialText,
      validatedData.rating || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/testimonials?message=Testimonial created successfully");
    } else {
      return c.html(renderTestimonialsForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Failed to create testimonial",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error creating testimonial:", error);
    const user = c.get("user");
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderTestimonialsForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderTestimonialsForm({
      isEdit: false,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to create testimonial",
      messageType: "error"
    }));
  }
});
adminTestimonialsRoutes.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderTestimonialsForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare("SELECT * FROM testimonials WHERE id = ?").bind(id).all();
    if (!results || results.length === 0) {
      return c.redirect("/admin/testimonials?message=Testimonial not found&type=error");
    }
    const testimonial = results[0];
    return c.html(renderTestimonialsForm({
      testimonial: {
        id: testimonial.id,
        authorName: testimonial.author_name,
        authorTitle: testimonial.author_title,
        authorCompany: testimonial.author_company,
        testimonialText: testimonial.testimonial_text,
        rating: testimonial.rating,
        isPublished: Boolean(testimonial.isPublished),
        sortOrder: testimonial.sortOrder
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching testimonial:", error);
    const user = c.get("user");
    return c.html(renderTestimonialsForm({
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load testimonial",
      messageType: "error"
    }));
  }
});
adminTestimonialsRoutes.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = testimonialSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderTestimonialsForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      UPDATE testimonials
      SET author_name = ?, author_title = ?, author_company = ?, testimonial_text = ?, rating = ?, isPublished = ?, sortOrder = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      validatedData.authorName,
      validatedData.authorTitle || null,
      validatedData.authorCompany || null,
      validatedData.testimonialText,
      validatedData.rating || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder,
      id
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/testimonials?message=Testimonial updated successfully");
    } else {
      return c.html(renderTestimonialsForm({
        testimonial: {
          id,
          authorName: validatedData.authorName,
          authorTitle: validatedData.authorTitle,
          authorCompany: validatedData.authorCompany,
          testimonialText: validatedData.testimonialText,
          rating: validatedData.rating,
          isPublished: validatedData.isPublished,
          sortOrder: validatedData.sortOrder
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Testimonial not found",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error updating testimonial:", error);
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderTestimonialsForm({
        testimonial: {
          id,
          authorName: "",
          authorTitle: "",
          authorCompany: "",
          testimonialText: "",
          rating: void 0,
          isPublished: true,
          sortOrder: 0
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderTestimonialsForm({
      testimonial: {
        id,
        authorName: "",
        authorTitle: "",
        authorCompany: "",
        testimonialText: "",
        rating: void 0,
        isPublished: true,
        sortOrder: 0
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to update testimonial",
      messageType: "error"
    }));
  }
});
adminTestimonialsRoutes.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const db = c.env?.DB;
    if (!db) {
      return c.json({ error: "Database not available" }, 500);
    }
    const { changes } = await db.prepare("DELETE FROM testimonials WHERE id = ?").bind(id).run();
    if (changes === 0) {
      return c.json({ error: "Testimonial not found" }, 404);
    }
    return c.redirect("/admin/testimonials?message=Testimonial deleted successfully");
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return c.json({ error: "Failed to delete testimonial" }, 500);
  }
});
var admin_testimonials_default = adminTestimonialsRoutes;

// src/templates/pages/admin-code-examples-form.template.ts
function renderCodeExamplesForm(data) {
  const { codeExample, isEdit, errors, message, messageType } = data;
  const pageTitle = isEdit ? "Edit Code Example" : "New Code Example";
  const pageContent = `
    <div class="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-white">${pageTitle}</h1>
          <p class="mt-2 text-sm text-gray-300">
            ${isEdit ? "Update the code example details below" : "Create a new code snippet or example"}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/code-examples"
             class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </a>
        </div>
      </div>

      ${message ? chunk3SPQ3J4N_cjs.renderAlert({ type: messageType || "info", message, dismissible: true }) : ""}

      <!-- Form -->
      <div class="backdrop-blur-xl bg-white/10 rounded-xl border border-white/20 shadow-2xl">
        <form ${isEdit ? `hx-put="/admin/code-examples/${codeExample?.id}"` : 'hx-post="/admin/code-examples"'}
              hx-target="body"
              hx-swap="outerHTML"
              class="space-y-6 p-6">

          <!-- Basic Information Section -->
          <div>
            <h2 class="text-lg font-medium text-white mb-4">Basic Information</h2>

            <!-- Title -->
            <div class="mb-4">
              <label for="title" class="block text-sm font-medium text-white">
                Title <span class="text-red-400">*</span>
              </label>
              <div class="mt-1">
                <input type="text"
                       name="title"
                       id="title"
                       value="${codeExample?.title || ""}"
                       required
                       maxlength="200"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6"
                       placeholder="e.g., React useState Hook Example">
              </div>
              ${errors?.title ? `
                <div class="mt-1">
                  ${errors.title.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>

            <!-- Description -->
            <div class="mb-4">
              <label for="description" class="block text-sm font-medium text-white">Description</label>
              <div class="mt-1">
                <textarea name="description"
                          id="description"
                          rows="3"
                          maxlength="500"
                          class="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors w-full"
                          placeholder="Briefly describe what this code example demonstrates...">${codeExample?.description || ""}</textarea>
                <p class="mt-1 text-sm text-gray-300">
                  <span id="description-count">0</span>/500 characters
                </p>
              </div>
              ${errors?.description ? `
                <div class="mt-1">
                  ${errors.description.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <!-- Language -->
              <div>
                <label for="language" class="block text-sm font-medium text-white">
                  Language <span class="text-red-400">*</span>
                </label>
                <div class="mt-1">
                  <select name="language"
                          id="language"
                          required
                          class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6">
                    <option value="">Select language...</option>
                    <option value="javascript" ${codeExample?.language === "javascript" ? "selected" : ""}>JavaScript</option>
                    <option value="typescript" ${codeExample?.language === "typescript" ? "selected" : ""}>TypeScript</option>
                    <option value="python" ${codeExample?.language === "python" ? "selected" : ""}>Python</option>
                    <option value="go" ${codeExample?.language === "go" ? "selected" : ""}>Go</option>
                    <option value="rust" ${codeExample?.language === "rust" ? "selected" : ""}>Rust</option>
                    <option value="java" ${codeExample?.language === "java" ? "selected" : ""}>Java</option>
                    <option value="php" ${codeExample?.language === "php" ? "selected" : ""}>PHP</option>
                    <option value="ruby" ${codeExample?.language === "ruby" ? "selected" : ""}>Ruby</option>
                    <option value="sql" ${codeExample?.language === "sql" ? "selected" : ""}>SQL</option>
                  </select>
                </div>
                ${errors?.language ? `
                  <div class="mt-1">
                    ${errors.language.map((error) => `
                      <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              <!-- Category -->
              <div>
                <label for="category" class="block text-sm font-medium text-white">Category</label>
                <div class="mt-1">
                  <input type="text"
                         name="category"
                         id="category"
                         value="${codeExample?.category || ""}"
                         maxlength="50"
                         class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6"
                         placeholder="e.g., frontend, backend">
                </div>
                ${errors?.category ? `
                  <div class="mt-1">
                    ${errors.category.map((error) => `
                      <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                    `).join("")}
                  </div>
                ` : ""}
              </div>

              <!-- Tags -->
              <div>
                <label for="tags" class="block text-sm font-medium text-white">Tags</label>
                <div class="mt-1">
                  <input type="text"
                         name="tags"
                         id="tags"
                         value="${codeExample?.tags || ""}"
                         maxlength="200"
                         class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6"
                         placeholder="e.g., react, hooks, state">
                  <p class="mt-1 text-sm text-gray-300">Comma-separated tags</p>
                </div>
                ${errors?.tags ? `
                  <div class="mt-1">
                    ${errors.tags.map((error) => `
                      <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            </div>
          </div>

          <!-- Code Section -->
          <div>
            <h2 class="text-lg font-medium text-white mb-4">Code</h2>

            <!-- Code Editor -->
            <div class="mb-4">
              <label for="code" class="block text-sm font-medium text-white">
                Code <span class="text-red-400">*</span>
              </label>
              <div class="mt-1">
                <textarea name="code"
                          id="code"
                          rows="20"
                          required
                          class="backdrop-blur-sm bg-gray-800/90 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-300 focus:border-purple-400 focus:outline-none transition-colors w-full font-mono text-sm"
                          placeholder="Paste your code here...">${codeExample?.code || ""}</textarea>
                <p class="mt-1 text-sm text-gray-300">
                  <span id="code-count">0</span> characters
                </p>
              </div>
              ${errors?.code ? `
                <div class="mt-1">
                  ${errors.code.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Status and Sort Order Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Published Status -->
            <div>
              <label class="block text-sm font-medium text-white">Status</label>
              <div class="mt-2 space-y-2">
                <div class="flex items-center">
                  <input id="published"
                         name="isPublished"
                         type="radio"
                         value="true"
                         ${!codeExample || codeExample.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-purple-600 focus:ring-purple-600 border-gray-600 bg-gray-700">
                  <label for="published" class="ml-2 block text-sm text-white">
                    Published <span class="text-gray-300">(visible to users)</span>
                  </label>
                </div>
                <div class="flex items-center">
                  <input id="draft"
                         name="isPublished"
                         type="radio"
                         value="false"
                         ${codeExample && !codeExample.isPublished ? "checked" : ""}
                         class="h-4 w-4 text-purple-600 focus:ring-purple-600 border-gray-600 bg-gray-700">
                  <label for="draft" class="ml-2 block text-sm text-white">
                    Draft <span class="text-gray-300">(not visible to users)</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Sort Order -->
            <div>
              <label for="sortOrder" class="block text-sm font-medium text-white">Sort Order</label>
              <div class="mt-1">
                <input type="number"
                       name="sortOrder"
                       id="sortOrder"
                       value="${codeExample?.sortOrder || 0}"
                       min="0"
                       step="1"
                       class="block w-full rounded-md border-0 bg-gray-700 py-1.5 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6">
                <p class="mt-1 text-sm text-gray-300">Lower numbers appear first (0 = highest priority)</p>
              </div>
              ${errors?.sortOrder ? `
                <div class="mt-1">
                  ${errors.sortOrder.map((error) => `
                    <p class="text-sm text-red-400">${escapeHtml6(error)}</p>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end space-x-3 pt-6 border-t border-white/20">
            <a href="/admin/code-examples"
               class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-white/10 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-white/20 transition-all">
              Cancel
            </a>
            <button type="submit"
                    class="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-purple-500/80 px-4 py-2 text-sm font-semibold text-white border border-white/20 hover:bg-purple-500 transition-all">
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              ${isEdit ? "Update Code Example" : "Create Code Example"}
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      // Character count for description
      const descriptionTextarea = document.getElementById('description');
      const descriptionCount = document.getElementById('description-count');

      function updateDescriptionCount() {
        descriptionCount.textContent = descriptionTextarea.value.length;
      }

      descriptionTextarea.addEventListener('input', updateDescriptionCount);
      updateDescriptionCount(); // Initial count

      // Character count for code
      const codeTextarea = document.getElementById('code');
      const codeCount = document.getElementById('code-count');

      function updateCodeCount() {
        codeCount.textContent = codeTextarea.value.length;
      }

      codeTextarea.addEventListener('input', updateCodeCount);
      updateCodeCount(); // Initial count
    </script>
  `;
  const layoutData = {
    title: `${pageTitle} - Admin`,
    pageTitle,
    currentPath: isEdit ? `/admin/code-examples/${codeExample?.id}` : "/admin/code-examples/new",
    user: data.user,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function escapeHtml6(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// src/routes/admin-code-examples.ts
var codeExampleSchema = zod.z.object({
  title: zod.z.string().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  description: zod.z.string().max(500, "Description must be under 500 characters").optional(),
  code: zod.z.string().min(1, "Code is required"),
  language: zod.z.string().min(1, "Language is required"),
  category: zod.z.string().max(50, "Category must be under 50 characters").optional(),
  tags: zod.z.string().max(200, "Tags must be under 200 characters").optional(),
  isPublished: zod.z.string().transform((val) => val === "true"),
  sortOrder: zod.z.string().transform((val) => parseInt(val, 10)).pipe(zod.z.number().min(0))
});
var adminCodeExamplesRoutes = new hono.Hono();
adminCodeExamplesRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const { published, language, search, page = "1" } = c.req.query();
    const currentPage = parseInt(page, 10) || 1;
    const limit = 20;
    const offset = (currentPage - 1) * limit;
    const db = c.env?.DB;
    if (!db) {
      return c.html(chunk3SPQ3J4N_cjs.renderCodeExamplesList({
        codeExamples: [],
        totalCount: 0,
        currentPage: 1,
        totalPages: 1,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    let whereClause = "WHERE 1=1";
    const params = [];
    if (published !== void 0) {
      whereClause += " AND isPublished = ?";
      params.push(published === "true" ? 1 : 0);
    }
    if (language) {
      whereClause += " AND language = ?";
      params.push(language);
    }
    if (search) {
      whereClause += " AND (title LIKE ? OR description LIKE ? OR code LIKE ? OR tags LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    const countQuery = `SELECT COUNT(*) as count FROM code_examples ${whereClause}`;
    const { results: countResults } = await db.prepare(countQuery).bind(...params).all();
    const totalCount = countResults?.[0]?.count || 0;
    const dataQuery = `
      SELECT * FROM code_examples
      ${whereClause}
      ORDER BY sortOrder ASC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    const { results: codeExamples } = await db.prepare(dataQuery).bind(...params, limit, offset).all();
    const totalPages = Math.ceil(totalCount / limit);
    return c.html(chunk3SPQ3J4N_cjs.renderCodeExamplesList({
      codeExamples: codeExamples || [],
      totalCount,
      currentPage,
      totalPages,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching code examples:", error);
    const user = c.get("user");
    return c.html(chunk3SPQ3J4N_cjs.renderCodeExamplesList({
      codeExamples: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load code examples",
      messageType: "error"
    }));
  }
});
adminCodeExamplesRoutes.get("/new", async (c) => {
  const user = c.get("user");
  return c.html(renderCodeExamplesForm({
    isEdit: false,
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0
  }));
});
adminCodeExamplesRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = codeExampleSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderCodeExamplesForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      INSERT INTO code_examples (title, description, code, language, category, tags, isPublished, sortOrder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      validatedData.title,
      validatedData.description || null,
      validatedData.code,
      validatedData.language,
      validatedData.category || null,
      validatedData.tags || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/code-examples?message=Code example created successfully");
    } else {
      return c.html(renderCodeExamplesForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Failed to create code example",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error creating code example:", error);
    const user = c.get("user");
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderCodeExamplesForm({
        isEdit: false,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderCodeExamplesForm({
      isEdit: false,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to create code example",
      messageType: "error"
    }));
  }
});
adminCodeExamplesRoutes.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderCodeExamplesForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare("SELECT * FROM code_examples WHERE id = ?").bind(id).all();
    if (!results || results.length === 0) {
      return c.redirect("/admin/code-examples?message=Code example not found&type=error");
    }
    const example = results[0];
    return c.html(renderCodeExamplesForm({
      codeExample: {
        id: example.id,
        title: example.title,
        description: example.description,
        code: example.code,
        language: example.language,
        category: example.category,
        tags: example.tags,
        isPublished: Boolean(example.isPublished),
        sortOrder: example.sortOrder
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0
    }));
  } catch (error) {
    console.error("Error fetching code example:", error);
    const user = c.get("user");
    return c.html(renderCodeExamplesForm({
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to load code example",
      messageType: "error"
    }));
  }
});
adminCodeExamplesRoutes.put("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const formData = await c.req.formData();
    const data = Object.fromEntries(formData.entries());
    const validatedData = codeExampleSchema.parse(data);
    const user = c.get("user");
    const db = c.env?.DB;
    if (!db) {
      return c.html(renderCodeExamplesForm({
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Database not available",
        messageType: "error"
      }));
    }
    const { results } = await db.prepare(`
      UPDATE code_examples
      SET title = ?, description = ?, code = ?, language = ?, category = ?, tags = ?, isPublished = ?, sortOrder = ?
      WHERE id = ?
      RETURNING *
    `).bind(
      validatedData.title,
      validatedData.description || null,
      validatedData.code,
      validatedData.language,
      validatedData.category || null,
      validatedData.tags || null,
      validatedData.isPublished ? 1 : 0,
      validatedData.sortOrder,
      id
    ).all();
    if (results && results.length > 0) {
      return c.redirect("/admin/code-examples?message=Code example updated successfully");
    } else {
      return c.html(renderCodeExamplesForm({
        codeExample: {
          id,
          title: validatedData.title,
          description: validatedData.description,
          code: validatedData.code,
          language: validatedData.language,
          category: validatedData.category,
          tags: validatedData.tags,
          isPublished: validatedData.isPublished,
          sortOrder: validatedData.sortOrder
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        message: "Code example not found",
        messageType: "error"
      }));
    }
  } catch (error) {
    console.error("Error updating code example:", error);
    const user = c.get("user");
    const id = parseInt(c.req.param("id"));
    if (error instanceof zod.z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const field = err.path[0];
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });
      return c.html(renderCodeExamplesForm({
        codeExample: {
          id,
          title: "",
          description: "",
          code: "",
          language: "",
          category: "",
          tags: "",
          isPublished: true,
          sortOrder: 0
        },
        isEdit: true,
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        errors,
        message: "Please correct the errors below",
        messageType: "error"
      }));
    }
    return c.html(renderCodeExamplesForm({
      codeExample: {
        id,
        title: "",
        description: "",
        code: "",
        language: "",
        category: "",
        tags: "",
        isPublished: true,
        sortOrder: 0
      },
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      message: "Failed to update code example",
      messageType: "error"
    }));
  }
});
adminCodeExamplesRoutes.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const db = c.env?.DB;
    if (!db) {
      return c.json({ error: "Database not available" }, 500);
    }
    const { changes } = await db.prepare("DELETE FROM code_examples WHERE id = ?").bind(id).run();
    if (changes === 0) {
      return c.json({ error: "Code example not found" }, 404);
    }
    return c.redirect("/admin/code-examples?message=Code example deleted successfully");
  } catch (error) {
    console.error("Error deleting code example:", error);
    return c.json({ error: "Failed to delete code example" }, 500);
  }
});
var admin_code_examples_default = adminCodeExamplesRoutes;

// src/templates/pages/admin-dashboard.template.ts
function renderDashboardPage(data) {
  const pageContent = `
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Dashboard</h1>
        <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Welcome to your SonicJS AI admin dashboard</p>
      </div>
      <div class="mt-4 sm:mt-0 flex items-center gap-x-3">
        <a href="/docs/getting-started" target="_blank" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-lime-600 dark:bg-lime-700 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-lime-700 dark:hover:bg-lime-600 transition-colors shadow-sm">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/>
          </svg>
          Developer Docs
        </a>
        <a href="/admin/api-reference" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
          </svg>
          API Docs
        </a>
        <a href="/api" target="_blank" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/>
          </svg>
          OpenAPI
        </a>
      </div>
    </div>

    <!-- Stats Cards -->
    <div
      id="stats-container"
      class="mb-8"
      hx-get="/admin/dashboard/stats"
      hx-trigger="load"
      hx-swap="innerHTML"
    >
      ${renderStatsCardsSkeleton()}
    </div>

    <!-- Dashboard Grid -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
      <!-- Analytics Chart -->
      <div class="xl:col-span-2">
        ${renderAnalyticsChart()}
      </div>

      <!-- Recent Activity -->
      <div
        class="xl:col-span-1"
        id="recent-activity-container"
        hx-get="/admin/dashboard/recent-activity"
        hx-trigger="load"
        hx-swap="innerHTML"
      >
        ${renderRecentActivitySkeleton()}
      </div>
    </div>

    <!-- Secondary Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Quick Actions -->
      ${renderQuickActions()}

      <!-- System Status -->
      ${renderSystemStatus()}

      <!-- Storage Usage -->
      <div id="storage-usage-container" hx-get="/admin/dashboard/storage" hx-trigger="load" hx-swap="innerHTML">
        ${renderStorageUsage()}
      </div>
    </div>

    <script>
      function refreshDashboard() {
        htmx.trigger('#stats-container', 'htmx:load');
        showNotification('Dashboard refreshed', 'success');
      }
    </script>
  `;
  const layoutData = {
    title: "Dashboard",
    pageTitle: "Dashboard",
    currentPath: "/admin",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayout(layoutData);
}
function renderStatsCards(stats) {
  const cards = [
    {
      title: "Total Collections",
      value: stats.collections.toString(),
      change: "12.5",
      isPositive: true
    },
    {
      title: "Content Items",
      value: stats.contentItems.toString(),
      change: "8.2",
      isPositive: true
    },
    {
      title: "Media Files",
      value: stats.mediaFiles.toString(),
      change: "15.3",
      isPositive: true
    },
    {
      title: "Active Users",
      value: stats.users.toString(),
      change: "2.4",
      isPositive: false
    }
  ];
  const cardColors = ["text-cyan-400", "text-lime-400", "text-pink-400", "text-purple-400"];
  return `
    <div>
      <h3 class="text-base font-semibold text-zinc-950 dark:text-white">Last 30 days</h3>
      <dl class="mt-5 grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-zinc-800/75 dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
        ${cards.map((card, index) => `
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-base font-normal text-zinc-700 dark:text-zinc-100">${card.title}</dt>
            <dd class="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div class="flex items-baseline text-2xl font-semibold ${cardColors[index]}">
                ${card.value}
              </div>
              <div class="inline-flex items-baseline rounded-full ${card.isPositive ? "bg-lime-400/10 text-lime-600 dark:text-lime-400" : "bg-pink-400/10 text-pink-600 dark:text-pink-400"} px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0">
                <svg viewBox="0 0 20 20" fill="currentColor" class="-ml-1 mr-0.5 size-5 shrink-0 self-center">
                  ${card.isPositive ? '<path d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clip-rule="evenodd" fill-rule="evenodd" />' : '<path d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" fill-rule="evenodd" />'}
                </svg>
                <span class="sr-only">${card.isPositive ? "Increased" : "Decreased"} by</span>
                ${card.change}%
              </div>
            </dd>
          </div>
        `).join("")}
      </dl>
    </div>
  `;
}
function renderStatsCardsSkeleton() {
  return `
    <div>
      <div class="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-5"></div>
      <div class="grid grid-cols-1 divide-zinc-950/5 dark:divide-white/10 overflow-hidden rounded-lg bg-zinc-800/75 dark:bg-zinc-800/75 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
        ${Array(4).fill(0).map(
    () => `
            <div class="px-4 py-5 sm:p-6 animate-pulse">
              <div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-3"></div>
              <div class="h-8 w-16 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            </div>
          `
  ).join("")}
      </div>
    </div>
  `;
}
function renderAnalyticsChart() {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <div class="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
          <div>
            <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Real-Time Analytics</h3>
            <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Requests per second (live)</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-lime-500 animate-pulse"></div>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">Live</span>
          </div>
        </div>
        <div class="mt-4 flex items-baseline gap-2">
          <span id="current-rps" class="text-4xl font-bold text-cyan-500 dark:text-cyan-400">0</span>
          <span class="text-sm text-zinc-500 dark:text-zinc-400">req/s</span>
        </div>
      </div>

      <div class="px-6 py-6">
        <canvas id="requestsChart" class="w-full" style="height: 300px;"></canvas>
      </div>

      <!-- Hidden div to trigger HTMX polling -->
      <div
        hx-get="/admin/dashboard/api/metrics"
        hx-trigger="every 1s"
        hx-swap="none"
        style="display: none;"
      ></div>
    </div>

    <script>
      // Initialize Chart.js for Real-time Requests
      (function() {
        const ctx = document.getElementById('requestsChart');
        if (!ctx) return;

        // Initialize with last 60 seconds of data (1 data point per second)
        const maxDataPoints = 60;
        const labels = [];
        const data = [];

        for (let i = maxDataPoints - 1; i >= 0; i--) {
          labels.push(\`-\${i}s\`);
          data.push(0);
        }

        const isDark = document.documentElement.classList.contains('dark');

        const chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Requests/sec',
              data: data,
              borderColor: isDark ? 'rgb(34, 211, 238)' : 'rgb(6, 182, 212)',
              backgroundColor: isDark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointBackgroundColor: isDark ? 'rgb(34, 211, 238)' : 'rgb(6, 182, 212)',
              pointBorderColor: isDark ? 'rgb(17, 24, 39)' : 'rgb(255, 255, 255)',
              pointBorderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: isDark ? 'rgb(39, 39, 42)' : 'rgb(255, 255, 255)',
                titleColor: isDark ? 'rgb(255, 255, 255)' : 'rgb(9, 9, 11)',
                bodyColor: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(9, 9, 11, 0.05)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                  label: function(context) {
                    return 'Requests/sec: ' + context.parsed.y.toFixed(2);
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                border: {
                  display: false
                },
                grid: {
                  color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  drawBorder: false
                },
                ticks: {
                  color: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                  padding: 8,
                  callback: function(value) {
                    return value.toFixed(1);
                  }
                }
              },
              x: {
                border: {
                  display: false
                },
                grid: {
                  display: false
                },
                ticks: {
                  color: isDark ? 'rgb(161, 161, 170)' : 'rgb(113, 113, 122)',
                  padding: 8,
                  maxTicksLimit: 6
                }
              }
            }
          }
        });

        // Listen for metrics updates from HTMX
        window.addEventListener('htmx:afterRequest', function(event) {
          console.log('[Dashboard] HTMX request completed:', event.detail.pathInfo.requestPath);

          if (event.detail.pathInfo.requestPath === '/admin/dashboard/api/metrics') {
            try {
              const metrics = JSON.parse(event.detail.xhr.responseText);
              console.log('[Dashboard] Metrics received:', metrics);

              // Update current RPS display
              const rpsElement = document.getElementById('current-rps');
              if (rpsElement) {
                rpsElement.textContent = metrics.requestsPerSecond.toFixed(2);
              }

              // Add new data point to chart
              chart.data.datasets[0].data.shift();
              chart.data.datasets[0].data.push(metrics.requestsPerSecond);

              // Regenerate labels to maintain -60s to now format
              const newLabels = [];
              for (let i = maxDataPoints - 1; i >= 1; i--) {
                newLabels.push(\`-\${i}s\`);
              }
              newLabels.push('now');
              chart.data.labels = newLabels;

              chart.update('none'); // Update without animation for smoother real-time updates
              console.log('[Dashboard] Chart updated with RPS:', metrics.requestsPerSecond);
            } catch (e) {
              console.error('[Dashboard] Error updating metrics:', e);
            }
          }
        });
      })();
    </script>
  `;
}
function renderRecentActivitySkeleton() {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 animate-pulse">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <div class="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
      </div>
      <div class="px-6 py-6">
        <div class="space-y-6">
          ${Array(3).fill(0).map(() => `
            <div class="flex gap-x-4">
              <div class="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
              <div class="flex-auto space-y-2">
                <div class="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                <div class="h-3 w-32 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}
function renderRecentActivity(activities) {
  const getInitials = (user) => {
    const parts = user.split(" ").filter((p) => p.length > 0);
    if (parts.length >= 2) {
      const first = parts[0]?.[0] || "";
      const second = parts[1]?.[0] || "";
      return (first + second).toUpperCase();
    }
    return user.substring(0, 2).toUpperCase();
  };
  const getRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };
  const getColorClasses = (type) => {
    switch (type) {
      case "content":
        return {
          bgColor: "bg-lime-500/10 dark:bg-lime-400/10",
          textColor: "text-lime-700 dark:text-lime-300"
        };
      case "media":
        return {
          bgColor: "bg-cyan-500/10 dark:bg-cyan-400/10",
          textColor: "text-cyan-700 dark:text-cyan-300"
        };
      case "user":
        return {
          bgColor: "bg-pink-500/10 dark:bg-pink-400/10",
          textColor: "text-pink-700 dark:text-pink-300"
        };
      case "collection":
        return {
          bgColor: "bg-purple-500/10 dark:bg-purple-400/10",
          textColor: "text-purple-700 dark:text-purple-300"
        };
      default:
        return {
          bgColor: "bg-gray-500/10 dark:bg-gray-400/10",
          textColor: "text-gray-700 dark:text-gray-300"
        };
    }
  };
  const formattedActivities = (activities || []).map((activity) => {
    const colors = getColorClasses(activity.type);
    return {
      ...activity,
      initials: getInitials(activity.user),
      time: getRelativeTime(activity.timestamp),
      ...colors
    };
  });
  if (formattedActivities.length === 0) {
    formattedActivities.push({
      type: "content",
      description: "No recent activity",
      user: "System",
      time: "",
      initials: "SY",
      bgColor: "bg-gray-500/10 dark:bg-gray-400/10",
      textColor: "text-gray-700 dark:text-gray-300",
      id: "0",
      action: "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Recent Activity</h3>
          <button class="text-xs/5 font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors">
            View all
          </button>
        </div>
      </div>

      <div class="px-6 py-6">
        <ul role="list" class="space-y-6">
          ${formattedActivities.map(
    (activity) => `
            <li class="relative flex gap-x-4">
              <div class="flex h-10 w-10 flex-none items-center justify-center rounded-full ${activity.bgColor}">
                <span class="text-xs font-semibold ${activity.textColor}">${activity.initials}</span>
              </div>
              <div class="flex-auto">
                <p class="text-sm/6 font-medium text-zinc-950 dark:text-white">${activity.description}</p>
                <p class="mt-1 text-xs/5 text-zinc-500 dark:text-zinc-400">
                  <span class="font-medium text-zinc-950 dark:text-white">${activity.user}</span>
                  <span class="text-zinc-400 dark:text-zinc-500"> \xB7 </span>
                  ${activity.time}
                </p>
              </div>
            </li>
          `
  ).join("")}
        </ul>
      </div>
    </div>
  `;
}
function renderQuickActions() {
  const actions = [
    {
      title: "Create Content",
      description: "Add new blog post or page",
      href: "/admin/content/new",
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>`
    },
    {
      title: "Upload Media",
      description: "Add images and files",
      href: "/admin/media",
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
      </svg>`
    },
    {
      title: "Manage Users",
      description: "Add or edit user accounts",
      href: "/admin/users",
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>`
    }
  ];
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Quick Actions</h3>
      </div>

      <div class="p-6">
        <div class="space-y-2">
          ${actions.map(
    (action) => `
            <a href="${action.href}" class="group flex items-center gap-x-3 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div class="flex h-10 w-10 flex-none items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400">
                ${action.icon}
              </div>
              <div class="flex-auto">
                <p class="text-sm/6 font-medium text-zinc-950 dark:text-white">${action.title}</p>
                <p class="text-xs/5 text-zinc-500 dark:text-zinc-400">${action.description}</p>
              </div>
              <svg class="h-5 w-5 flex-none text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
              </svg>
            </a>
          `
  ).join("")}
        </div>
      </div>
    </div>
  `;
}
function renderSystemStatus() {
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <div class="flex items-center justify-between">
          <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">System Status</h3>
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-lime-500 animate-pulse"></div>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">Live</span>
          </div>
        </div>
      </div>

      <div
        id="system-status-container"
        class="p-6"
        hx-get="/admin/dashboard/system-status"
        hx-trigger="load, every 30s"
        hx-swap="innerHTML"
      >
        <!-- Loading skeleton with gradient -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${[
    { color: "from-blue-500/20 to-cyan-500/20", darkColor: "dark:from-blue-500/10 dark:to-cyan-500/10" },
    { color: "from-purple-500/20 to-pink-500/20", darkColor: "dark:from-purple-500/10 dark:to-pink-500/10" },
    { color: "from-amber-500/20 to-orange-500/20", darkColor: "dark:from-amber-500/10 dark:to-orange-500/10" },
    { color: "from-lime-500/20 to-emerald-500/20", darkColor: "dark:from-lime-500/10 dark:to-emerald-500/10" }
  ].map((gradient, i) => `
            <div class="relative group">
              <div class="absolute inset-0 bg-gradient-to-br ${gradient.color} ${gradient.darkColor} rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div class="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
                <div class="flex items-center justify-between mb-3">
                  <div class="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                  <div class="h-6 w-6 bg-zinc-200 dark:bg-zinc-700 rounded-full"></div>
                </div>
                <div class="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>

    <style>
      @keyframes ping-slow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .animate-ping-slow {
        animation: ping-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    </style>
  `;
}
function renderStorageUsage(databaseSizeBytes, mediaSizeBytes) {
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };
  const dbSizeGB = databaseSizeBytes ? databaseSizeBytes / 1024 ** 3 : 0;
  const dbMaxGB = 10;
  const dbPercentageRaw = dbSizeGB / dbMaxGB * 100;
  const dbPercentage = Math.min(Math.max(dbPercentageRaw, 0.5), 100);
  const dbUsedFormatted = databaseSizeBytes ? formatBytes(databaseSizeBytes) : "Unknown";
  const mediaUsedFormatted = mediaSizeBytes ? formatBytes(mediaSizeBytes) : "0 B";
  const storageItems = [
    {
      label: "Database",
      used: dbUsedFormatted,
      total: "10 GB",
      percentage: dbPercentage,
      color: dbPercentage > 80 ? "bg-red-500 dark:bg-red-400" : dbPercentage > 60 ? "bg-amber-500 dark:bg-amber-400" : "bg-cyan-500 dark:bg-cyan-400"
    },
    {
      label: "Media Files",
      used: mediaUsedFormatted,
      total: "\u221E",
      percentage: 0,
      color: "bg-lime-500 dark:bg-lime-400",
      note: "Stored in R2"
    },
    {
      label: "Cache (KV)",
      used: "N/A",
      total: "\u221E",
      percentage: 0,
      color: "bg-purple-500 dark:bg-purple-400",
      note: "Unlimited"
    }
  ];
  return `
    <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
      <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
        <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Storage Usage</h3>
      </div>

      <div class="px-6 py-6">
        <dl class="space-y-6">
          ${storageItems.map(
    (item) => `
            <div>
              <div class="flex items-center justify-between mb-2">
                <dt class="text-sm/6 text-zinc-500 dark:text-zinc-400">
                  ${item.label}
                  ${item.note ? `<span class="ml-2 text-xs text-zinc-400 dark:text-zinc-500">(${item.note})</span>` : ""}
                </dt>
                <dd class="text-sm/6 font-medium text-zinc-950 dark:text-white">${item.used} / ${item.total}</dd>
              </div>
              <div class="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div class="${item.color} h-full rounded-full transition-all duration-300" style="width: ${item.percentage}%"></div>
              </div>
            </div>
          `
  ).join("")}
        </dl>
      </div>
    </div>
  `;
}

// src/routes/admin-dashboard.ts
var VERSION = chunkOQFE3DSZ_cjs.getCoreVersion();
var router = new hono.Hono();
router.use("*", chunk4BJGEGX5_cjs.requireAuth());
router.get("/", async (c) => {
  const user = c.get("user");
  try {
    const pageData = {
      user: {
        name: user.email.split("@")[0] || user.email,
        email: user.email,
        role: user.role
      },
      version: VERSION
    };
    return c.html(renderDashboardPage(pageData));
  } catch (error) {
    console.error("Dashboard error:", error);
    const pageData = {
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      },
      version: VERSION
    };
    return c.html(renderDashboardPage(pageData));
  }
});
router.get("/stats", async (c) => {
  try {
    const db = c.env.DB;
    let collectionsCount = 0;
    try {
      const collectionsStmt = db.prepare("SELECT COUNT(*) as count FROM collections WHERE is_active = 1");
      const collectionsResult = await collectionsStmt.first();
      collectionsCount = collectionsResult?.count || 0;
    } catch (error) {
      console.error("Error fetching collections count:", error);
    }
    let contentCount = 0;
    try {
      const contentStmt = db.prepare("SELECT COUNT(*) as count FROM content");
      const contentResult = await contentStmt.first();
      contentCount = contentResult?.count || 0;
    } catch (error) {
      console.error("Error fetching content count:", error);
    }
    let mediaCount = 0;
    let mediaSize = 0;
    try {
      const mediaStmt = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL");
      const mediaResult = await mediaStmt.first();
      mediaCount = mediaResult?.count || 0;
      mediaSize = mediaResult?.total_size || 0;
    } catch (error) {
      console.error("Error fetching media count:", error);
    }
    let usersCount = 0;
    try {
      const usersStmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1");
      const usersResult = await usersStmt.first();
      usersCount = usersResult?.count || 0;
    } catch (error) {
      console.error("Error fetching users count:", error);
    }
    const html9 = renderStatsCards({
      collections: collectionsCount,
      contentItems: contentCount,
      mediaFiles: mediaCount,
      users: usersCount,
      mediaSize
    });
    return c.html(html9);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.html('<div class="text-red-500">Failed to load statistics</div>');
  }
});
router.get("/storage", async (c) => {
  try {
    const db = c.env.DB;
    let databaseSize = 0;
    try {
      const result = await db.prepare("SELECT 1").run();
      databaseSize = result?.meta?.size_after || 0;
    } catch (error) {
      console.error("Error fetching database size:", error);
    }
    let mediaSize = 0;
    try {
      const mediaStmt = db.prepare("SELECT COALESCE(SUM(size), 0) as total_size FROM media WHERE deleted_at IS NULL");
      const mediaResult = await mediaStmt.first();
      mediaSize = mediaResult?.total_size || 0;
    } catch (error) {
      console.error("Error fetching media size:", error);
    }
    const html9 = renderStorageUsage(databaseSize, mediaSize);
    return c.html(html9);
  } catch (error) {
    console.error("Error fetching storage usage:", error);
    return c.html('<div class="text-red-500">Failed to load storage information</div>');
  }
});
router.get("/recent-activity", async (c) => {
  try {
    const db = c.env.DB;
    const limit = parseInt(c.req.query("limit") || "5");
    const activityStmt = db.prepare(`
      SELECT
        a.id,
        a.action,
        a.resource_type,
        a.resource_id,
        a.details,
        a.created_at,
        u.email,
        u.first_name,
        u.last_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.resource_type IN ('content', 'collections', 'users', 'media')
      ORDER BY a.created_at DESC
      LIMIT ?
    `);
    const { results } = await activityStmt.bind(limit).all();
    const activities = (results || []).map((row) => {
      const userName = row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.email || "System";
      let description = "";
      if (row.action === "create") {
        description = `Created new ${row.resource_type}`;
      } else if (row.action === "update") {
        description = `Updated ${row.resource_type}`;
      } else if (row.action === "delete") {
        description = `Deleted ${row.resource_type}`;
      } else {
        description = `${row.action} ${row.resource_type}`;
      }
      return {
        id: row.id,
        type: row.resource_type,
        action: row.action,
        description,
        timestamp: new Date(Number(row.created_at)).toISOString(),
        user: userName
      };
    });
    const html9 = renderRecentActivity(activities);
    return c.html(html9);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    const html9 = renderRecentActivity([]);
    return c.html(html9);
  }
});
router.get("/api/metrics", async (c) => {
  return c.json({
    requestsPerSecond: chunkRCQ2HIQD_cjs.metricsTracker.getRequestsPerSecond(),
    totalRequests: chunkRCQ2HIQD_cjs.metricsTracker.getTotalRequests(),
    averageRPS: Number(chunkRCQ2HIQD_cjs.metricsTracker.getAverageRPS().toFixed(2)),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router.get("/system-status", async (c) => {
  try {
    const html9 = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">API Status</span>
              <svg class="w-6 h-6 text-lime-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Operational</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Database</span>
              <svg class="w-6 h-6 text-lime-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Connected</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 dark:from-amber-500/10 dark:to-orange-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">R2 Storage</span>
              <svg class="w-6 h-6 text-lime-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Available</p>
          </div>
        </div>

        <div class="relative group">
          <div class="absolute inset-0 bg-gradient-to-br from-lime-500/20 to-emerald-500/20 dark:from-lime-500/10 dark:to-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div class="relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5 border border-zinc-200/50 dark:border-zinc-700/50">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">KV Cache</span>
              <svg class="w-6 h-6 text-lime-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Ready</p>
          </div>
        </div>
      </div>
    `;
    return c.html(html9);
  } catch (error) {
    console.error("Error fetching system status:", error);
    return c.html('<div class="text-red-500">Failed to load system status</div>');
  }
});

// src/templates/pages/admin-collections-list.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();

// src/templates/components/table.template.ts
function renderTable2(data) {
  const tableId = data.tableId || `table-${Math.random().toString(36).substr(2, 9)}`;
  if (data.rows.length === 0) {
    return `
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-8 text-center">
        <div class="text-zinc-500 dark:text-zinc-400">
          <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">${data.emptyMessage || "No data available"}</p>
        </div>
      </div>
    `;
  }
  return `
    <div class="${data.className || ""}" id="${tableId}">
      ${data.title ? `
        <div class="px-4 sm:px-0 mb-4">
          <h3 class="text-base font-semibold text-zinc-950 dark:text-white">${data.title}</h3>
        </div>
      ` : ""}
      <div class="overflow-x-auto">
        <table class="min-w-full sortable-table">
          <thead>
            <tr>
              ${data.selectable ? `
                <th class="px-4 py-3.5 text-center sm:pl-0">
                  <div class="flex items-center justify-center">
                    <div class="group grid size-4 grid-cols-1">
                      <input type="checkbox" id="select-all-${tableId}" class="col-start-1 row-start-1 appearance-none rounded border border-white/10 bg-white/5 checked:border-cyan-500 checked:bg-cyan-500 indeterminate:border-cyan-500 indeterminate:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:border-white/5 disabled:bg-white/10 disabled:checked:bg-white/10 forced-colors:appearance-auto row-checkbox" />
                      <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-white/25">
                        <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                        <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                      </svg>
                    </div>
                  </div>
                </th>
              ` : ""}
              ${data.columns.map((column, index) => {
    const isFirst = index === 0 && !data.selectable;
    const isLast = index === data.columns.length - 1;
    return `
                <th class="px-4 py-3.5 text-left text-sm font-semibold text-zinc-950 dark:text-white ${isFirst ? "sm:pl-0" : ""} ${isLast ? "sm:pr-0" : ""} ${column.className || ""}">
                  ${column.sortable ? `
                    <button
                      class="flex items-center gap-x-2 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors sort-btn text-left"
                      data-column="${column.key}"
                      data-sort-type="${column.sortType || "string"}"
                      data-sort-direction="none"
                      onclick="sortTable('${tableId}', '${column.key}', '${column.sortType || "string"}')"
                    >
                      <span>${column.label}</span>
                      <div class="sort-icons flex flex-col">
                        <svg class="w-3 h-3 sort-up opacity-30" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
                        </svg>
                        <svg class="w-3 h-3 sort-down opacity-30 -mt-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    </button>
                  ` : column.label}
                </th>
              `;
  }).join("")}
            </tr>
          </thead>
          <tbody>
            ${data.rows.map((row, rowIndex) => {
    if (!row) return "";
    const clickableClass = data.rowClickable ? "cursor-pointer" : "";
    const clickHandler = data.rowClickable && data.rowClickUrl ? `onclick="window.location.href='${data.rowClickUrl(row)}'"` : "";
    return `
                <tr class="group border-t border-zinc-950/5 dark:border-white/5 hover:bg-gradient-to-r hover:from-cyan-50/50 hover:via-blue-50/30 hover:to-purple-50/50 dark:hover:from-cyan-900/20 dark:hover:via-blue-900/10 dark:hover:to-purple-900/20 hover:shadow-sm hover:shadow-cyan-500/5 dark:hover:shadow-cyan-400/5 transition-all duration-300 ${clickableClass}" ${clickHandler}>
                  ${data.selectable ? `
                    <td class="px-4 py-4 sm:pl-0" onclick="event.stopPropagation()">
                      <div class="flex items-center justify-center">
                        <div class="group grid size-4 grid-cols-1">
                          <input type="checkbox" value="${row.id || ""}" class="col-start-1 row-start-1 appearance-none rounded border border-white/10 bg-white/5 checked:border-cyan-500 checked:bg-cyan-500 indeterminate:border-cyan-500 indeterminate:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:border-white/5 disabled:bg-white/10 disabled:checked:bg-white/10 forced-colors:appearance-auto row-checkbox" />
                          <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-white/25">
                            <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                            <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                          </svg>
                        </div>
                      </div>
                    </td>
                  ` : ""}
                  ${data.columns.map((column, colIndex) => {
      const value = row[column.key];
      const displayValue = column.render ? column.render(value, row) : value;
      const stopPropagation = column.key === "actions" ? 'onclick="event.stopPropagation()"' : "";
      const isFirst = colIndex === 0 && !data.selectable;
      const isLast = colIndex === data.columns.length - 1;
      return `
                      <td class="px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400 ${isFirst ? "sm:pl-0 font-medium text-zinc-950 dark:text-white" : ""} ${isLast ? "sm:pr-0" : ""} ${column.className || ""}" ${stopPropagation}>
                        ${displayValue || ""}
                      </td>
                    `;
    }).join("")}
                </tr>
              `;
  }).join("")}
          </tbody>
        </table>
      </div>

      <script>
        // Table sorting functionality
        window.sortTable = function(tableId, column, sortType) {
          const tableContainer = document.getElementById(tableId);
          const table = tableContainer.querySelector('.sortable-table');
          const tbody = table.querySelector('tbody');
          const rows = Array.from(tbody.querySelectorAll('tr'));
          const headerBtn = table.querySelector(\`[data-column="\${column}"]\`);

          // Get current sort direction
          let direction = headerBtn.getAttribute('data-sort-direction');

          // Reset all sort indicators
          table.querySelectorAll('.sort-btn').forEach(btn => {
            btn.setAttribute('data-sort-direction', 'none');
            btn.querySelectorAll('.sort-up, .sort-down').forEach(icon => {
              icon.classList.add('opacity-30');
              icon.classList.remove('opacity-100', 'text-zinc-950', 'dark:text-white');
            });
          });

          // Determine new direction
          if (direction === 'none' || direction === 'desc') {
            direction = 'asc';
          } else {
            direction = 'desc';
          }

          // Update current header
          headerBtn.setAttribute('data-sort-direction', direction);
          const upIcon = headerBtn.querySelector('.sort-up');
          const downIcon = headerBtn.querySelector('.sort-down');

          if (direction === 'asc') {
            upIcon.classList.remove('opacity-30');
            upIcon.classList.add('opacity-100', 'text-zinc-950', 'dark:text-white');
            downIcon.classList.add('opacity-30');
            downIcon.classList.remove('opacity-100', 'text-zinc-950', 'dark:text-white');
          } else {
            downIcon.classList.remove('opacity-30');
            downIcon.classList.add('opacity-100', 'text-zinc-950', 'dark:text-white');
            upIcon.classList.add('opacity-30');
            upIcon.classList.remove('opacity-100', 'text-zinc-950', 'dark:text-white');
          }

          // Find column index (accounting for potential select column)
          const headers = Array.from(table.querySelectorAll('th'));
          const selectableOffset = table.querySelector('input[id^="select-all"]') ? 1 : 0;
          const columnIndex = headers.findIndex(th => th.querySelector(\`[data-column="\${column}"]\`)) - selectableOffset;

          // Sort rows
          rows.sort((a, b) => {
            const aCell = a.children[columnIndex + selectableOffset];
            const bCell = b.children[columnIndex + selectableOffset];

            if (!aCell || !bCell) return 0;

            let aValue = aCell.textContent.trim();
            let bValue = bCell.textContent.trim();

            // Handle different sort types
            switch (sortType) {
              case 'number':
                aValue = parseFloat(aValue.replace(/[^0-9.-]/g, '')) || 0;
                bValue = parseFloat(bValue.replace(/[^0-9.-]/g, '')) || 0;
                break;
              case 'date':
                aValue = new Date(aValue).getTime() || 0;
                bValue = new Date(bValue).getTime() || 0;
                break;
              case 'boolean':
                aValue = aValue.toLowerCase() === 'true' || aValue.toLowerCase() === 'published' || aValue.toLowerCase() === 'active';
                bValue = bValue.toLowerCase() === 'true' || bValue.toLowerCase() === 'published' || bValue.toLowerCase() === 'active';
                break;
              default: // string
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
          });

          // Re-append sorted rows
          rows.forEach(row => tbody.appendChild(row));
        };

        // Select all functionality
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('[id^="select-all"]').forEach(selectAll => {
            selectAll.addEventListener('change', function() {
              const tableId = this.id.replace('select-all-', '');
              const table = document.getElementById(tableId);
              if (table) {
                const checkboxes = table.querySelectorAll('.row-checkbox');
                checkboxes.forEach(checkbox => {
                  checkbox.checked = this.checked;
                });
              }
            });
          });
        });
      </script>
    </div>
  `;
}

// src/templates/pages/admin-collections-list.template.ts
function renderCollectionsListPage(data) {
  const tableData = {
    tableId: "collections-table",
    rowClickable: true,
    rowClickUrl: (collection) => `/admin/collections/${collection.id}`,
    columns: [
      {
        key: "name",
        label: "Name",
        sortable: true,
        sortType: "string",
        render: (value, collection) => `
            <div class="flex items-center gap-2 ml-2">
                <span class="inline-flex items-center rounded-md bg-cyan-50 dark:bg-cyan-500/10 px-2.5 py-1 text-sm font-medium text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-700/10 dark:ring-cyan-400/20">
                  ${collection.name}
                </span>
                ${collection.managed ? `
                  <span class="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-700/10 dark:ring-purple-400/20" title="Config-managed collection (read-only in UI)">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
                    </svg>
                    Config
                  </span>
                ` : ""}
            </div>
          `
      },
      {
        key: "display_name",
        label: "Display Name",
        sortable: true,
        sortType: "string"
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        sortType: "string",
        render: (value, collection) => collection.description || '<span class="text-zinc-500 dark:text-zinc-400">-</span>'
      },
      {
        key: "field_count",
        label: "Fields",
        sortable: true,
        sortType: "number",
        render: (value, collection) => {
          const count = collection.field_count || 0;
          return `
            <div class="flex items-center">
              <span class="inline-flex items-center rounded-md bg-pink-50 dark:bg-pink-500/10 px-2.5 py-1 text-sm font-medium text-pink-700 dark:text-pink-300 ring-1 ring-inset ring-pink-700/10 dark:ring-pink-400/20">
                ${count} ${count === 1 ? "field" : "fields"}
              </span>
            </div>
          `;
        }
      },
      {
        key: "managed",
        label: "Source",
        sortable: true,
        sortType: "string",
        render: (value, collection) => {
          if (collection.managed) {
            return `
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                <span class="text-sm text-zinc-700 dark:text-zinc-300">Code</span>
              </div>
            `;
          } else {
            return `
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"/>
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"/>
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"/>
                </svg>
                <span class="text-sm text-zinc-700 dark:text-zinc-300">Database</span>
              </div>
            `;
          }
        }
      },
      {
        key: "formattedDate",
        label: "Created",
        sortable: true,
        sortType: "date"
      },
      {
        key: "actions",
        label: "Content",
        sortable: false,
        render: (value, collection) => {
          if (!collection || !collection.id) return '<span class="text-zinc-500 dark:text-zinc-400">-</span>';
          return `
            <div class="flex items-center space-x-2">
              <a href="/admin/content?model=${collection.name}" class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </a>
            </div>
          `;
        }
      }
    ],
    rows: data.collections,
    emptyMessage: "No collections found."
  };
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Collections</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage your content collections and their schemas</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/collections/new" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Collection
          </a>
        </div>
      </div>

      <!-- Filters -->
      <div class="relative rounded-xl overflow-hidden mb-6">
        <!-- Gradient Background -->
        <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 dark:from-cyan-400/20 dark:via-blue-400/20 dark:to-purple-400/20"></div>

        <div class="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
          <div class="px-6 py-5">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <form onsubmit="performSearch(event)" class="flex items-center space-x-2">
                  <div class="relative group">
                    <input
                      id="collections-search"
                      type="text"
                      placeholder="Search collections..."
                      value="${data.search || ""}"
                      oninput="toggleClearButton()"
                      class="rounded-full bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 pl-11 pr-10 text-sm w-72 text-zinc-950 dark:text-white border-2 border-cyan-200/50 dark:border-cyan-700/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-zinc-800 focus:shadow-lg focus:shadow-cyan-500/20 dark:focus:shadow-cyan-400/20 transition-all duration-300"
                    >
                    <div class="absolute left-3.5 top-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 opacity-90 group-focus-within:opacity-100 transition-opacity">
                      <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <button
                      type="button"
                      id="clear-search"
                      onclick="clearSearch()"
                      class="${data.search ? "" : "hidden"} absolute right-3 top-3 flex items-center justify-center w-5 h-5 rounded-full bg-zinc-400/20 dark:bg-zinc-500/20 hover:bg-zinc-400/30 dark:hover:bg-zinc-500/30 transition-colors"
                    >
                      <svg class="h-3 w-3 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <button
                    type="submit"
                    class="inline-flex items-center gap-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-400 dark:to-blue-400 text-white text-sm font-medium rounded-full hover:from-cyan-600 hover:to-blue-600 dark:hover:from-cyan-500 dark:hover:to-blue-500 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    Search
                  </button>
                </form>
                <script>
                  function performSearch(event) {
                    event.preventDefault();
                    const searchInput = document.getElementById('collections-search');
                    const value = searchInput.value.trim();
                    const params = new URLSearchParams(window.location.search);
                    if (value) {
                      params.set('search', value);
                    } else {
                      params.delete('search');
                    }
                    window.location.href = window.location.pathname + '?' + params.toString();
                  }

                  function clearSearch() {
                    const params = new URLSearchParams(window.location.search);
                    params.delete('search');
                    window.location.href = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
                  }

                  function toggleClearButton() {
                    const searchInput = document.getElementById('collections-search');
                    const clearButton = document.getElementById('clear-search');
                    if (searchInput.value.trim()) {
                      clearButton.classList.remove('hidden');
                    } else {
                      clearButton.classList.add('hidden');
                    }
                  }
                </script>
              </div>
              <div class="flex items-center gap-x-3">
                <span class="text-sm/6 font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm">${data.collections.length} ${data.collections.length === 1 ? "collection" : "collections"}</span>
                <button
                  class="inline-flex items-center gap-x-1.5 px-3 py-1.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm text-zinc-950 dark:text-white text-sm font-medium rounded-full ring-1 ring-inset ring-cyan-200/50 dark:ring-cyan-700/50 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-900/30 dark:hover:to-blue-900/30 hover:ring-cyan-300 dark:hover:ring-cyan-600 transition-all duration-200"
                  onclick="location.reload()"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Collections List -->
      <div id="collections-list">
        ${renderTable2(tableData)}
      </div>

      <!-- Empty State -->
      ${data.collections.length === 0 ? `
        <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 p-12 text-center">
          <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-4 text-base/7 font-semibold text-zinc-950 dark:text-white">No collections found</h3>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Get started by creating your first collection</p>
          <div class="mt-6">
            <a href="/admin/collections/new" class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm">
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New Collection
            </a>
          </div>
        </div>
      ` : ""}
    </div>
  `;
  const layoutData = {
    title: "Collections",
    pageTitle: "Collections",
    currentPath: "/admin/collections",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/templates/pages/admin-collections-form.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderCollectionFormPage(data) {
  const isEdit = data.isEdit || !!data.id;
  const title = isEdit ? "Edit Collection" : "Create New Collection";
  const subtitle = isEdit ? `Update collection: ${data.display_name}` : "Define a new content collection with custom fields and settings.";
  const fields = [
    {
      name: "displayName",
      label: "Display Name",
      type: "text",
      value: data.display_name || "",
      placeholder: "Blog Posts",
      required: true,
      readonly: data.managed,
      className: data.managed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed" : ""
    },
    {
      name: "name",
      label: "Collection Name",
      type: "text",
      value: data.name || "",
      placeholder: "blog_posts",
      required: true,
      readonly: isEdit,
      helpText: isEdit ? "Collection name cannot be changed" : "Lowercase letters, numbers, and underscores only",
      className: isEdit ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed" : ""
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      value: data.description || "",
      placeholder: "Description of this collection...",
      rows: 3,
      readonly: data.managed,
      className: data.managed ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed" : ""
    }
  ];
  const formData = {
    id: "collection-form",
    ...isEdit ? { hxPut: `/admin/collections/${data.id}`, action: `/admin/collections/${data.id}`, method: "PUT" } : { hxPost: "/admin/collections", action: "/admin/collections" },
    hxTarget: "#form-messages",
    fields,
    submitButtons: data.managed ? [] : [
      {
        label: isEdit ? "Update Collection" : "Create Collection",
        type: "submit",
        className: "btn-primary"
      }
    ]
  };
  const pageContent = `
    <div class="space-y-6">
      <!-- Config-Managed Collection Banner -->
      ${data.managed ? `
        <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 p-4">
          <div class="flex items-start gap-x-3">
            <svg class="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <div class="flex-1">
              <h3 class="text-sm/6 font-semibold text-amber-900 dark:text-amber-300">
                Config-Managed Collection
              </h3>
              <div class="text-sm/6 text-amber-800 dark:text-amber-400 mt-1 space-y-1">
                <p>This collection is managed by a configuration file and cannot be edited through the admin interface.</p>
                <p class="mt-2">
                  <span class="font-medium">Config file:</span>
                  <code class="ml-2 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-mono text-xs">
                    src/collections/${data.name}.collection.ts
                  </code>
                </p>
                <p class="mt-2 text-xs">
                  To modify this collection's schema, edit the configuration file directly in your code editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      ` : ""}

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">${title}</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">${subtitle}</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a href="/admin/collections" class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Collections
          </a>
        </div>
      </div>

      <!-- Form Container -->
      <div class="rounded-lg bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 overflow-hidden">
        <!-- Form Header -->
        <div class="border-b border-zinc-950/5 dark:border-white/10 px-6 py-6">
          <div class="flex items-center gap-x-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 ring-1 ring-zinc-950/10 dark:ring-white/10">
              <svg class="h-6 w-6 text-zinc-950 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <div>
              <h2 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Collection Details</h2>
              <p class="text-sm/6 text-zinc-500 dark:text-zinc-400">Configure your collection settings below</p>
            </div>
          </div>
        </div>

        <!-- Form Content -->
        <div class="px-6 py-6">
          <div id="form-messages"></div>
          ${data.error ? renderAlert2({ type: "error", message: data.error, dismissible: true }) : ""}
          ${data.success ? renderAlert2({ type: "success", message: data.success, dismissible: true }) : ""}

          <!-- Form Styling -->
          <style>
            #collection-form .form-group {
              margin-bottom: 1.5rem;
            }

            #collection-form .form-label {
              display: block;
              font-size: 0.875rem;
              font-weight: 500;
              margin-bottom: 0.5rem;
              line-height: 1.5rem;
            }

            .dark #collection-form .form-label {
              color: white;
            }

            html:not(.dark) #collection-form .form-label {
              color: #09090b; /* zinc-950 */
            }

            #collection-form .form-input,
            #collection-form .form-textarea {
              width: 100%;
              padding: 0.625rem 0.75rem;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              line-height: 1.5rem;
              transition: all 0.15s;
            }

            html:not(.dark) #collection-form .form-input,
            html:not(.dark) #collection-form .form-textarea {
              background: white;
              border: 1px solid rgba(9, 9, 11, 0.1); /* zinc-950/10 */
              color: #09090b; /* zinc-950 */
            }

            .dark #collection-form .form-input,
            .dark #collection-form .form-textarea {
              background: #18181b; /* zinc-900 */
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: white;
            }

            #collection-form .form-input:focus,
            #collection-form .form-textarea:focus {
              outline: none;
              box-shadow: 0 0 0 2px #2563eb; /* blue-600 */
            }

            .dark #collection-form .form-input:focus,
            .dark #collection-form .form-textarea:focus {
              box-shadow: 0 0 0 2px #3b82f6; /* blue-500 */
            }

            html:not(.dark) #collection-form .form-input::placeholder,
            html:not(.dark) #collection-form .form-textarea::placeholder {
              color: #71717a; /* zinc-500 */
            }

            .dark #collection-form .form-input::placeholder,
            .dark #collection-form .form-textarea::placeholder {
              color: #71717a; /* zinc-500 */
            }

            #collection-form .btn {
              padding: 0.625rem 1rem;
              font-weight: 600;
              font-size: 0.875rem;
              border-radius: 0.5rem;
              transition: all 0.15s;
              border: none;
              cursor: pointer;
            }

            html:not(.dark) #collection-form .btn-primary {
              background: #09090b; /* zinc-950 */
              color: white;
            }

            html:not(.dark) #collection-form .btn-primary:hover {
              background: #27272a; /* zinc-800 */
            }

            .dark #collection-form .btn-primary {
              background: white;
              color: #09090b; /* zinc-950 */
            }

            .dark #collection-form .btn-primary:hover {
              background: #f4f4f5; /* zinc-100 */
            }

            #collection-form .form-help-text {
              font-size: 0.75rem;
              margin-top: 0.25rem;
            }

            html:not(.dark) #collection-form .form-help-text {
              color: #71717a; /* zinc-500 */
            }

            .dark #collection-form .form-help-text {
              color: #a1a1aa; /* zinc-400 */
            }
          </style>
          
          ${chunk3SPQ3J4N_cjs.renderForm(formData)}
          
          ${isEdit && !data.managed ? `
            <!-- Fields Management Section -->
            <div class="mt-8 pt-8 border-t border-zinc-950/5 dark:border-white/10">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Collection Fields</h3>
                  <p class="text-sm/6 text-zinc-500 dark:text-zinc-400 mt-1">Define the fields that content in this collection will have</p>
                </div>
                <button
                  type="button"
                  onclick="showAddFieldModal()"
                  class="inline-flex items-center gap-x-1.5 px-3.5 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-semibold text-sm rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Field
                </button>
              </div>
              
              <!-- Fields List -->
              <div id="fields-list" class="space-y-3">
                ${(data.fields || []).map((field) => `
                  <div class="field-item bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-950/5 dark:border-white/10 p-4" data-field-id="${field.id}">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-x-4">
                        <div class="drag-handle cursor-move text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400">
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16"/>
                          </svg>
                        </div>
                        <div>
                          <div class="flex items-center gap-x-2">
                            <span class="text-sm/6 font-medium text-zinc-950 dark:text-white">${field.field_label}</span>
                            <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20 dark:ring-cyan-400/20">
                              ${field.field_type}
                            </span>
                            ${field.is_required ? `
                              <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-pink-500/10 dark:bg-pink-400/10 text-pink-700 dark:text-pink-300 ring-1 ring-inset ring-pink-500/20 dark:ring-pink-400/20">
                                Required
                              </span>
                            ` : ""}
                          </div>
                          <div class="text-sm/6 text-zinc-500 dark:text-zinc-400 mt-1">
                            Field name: <code class="text-zinc-950 dark:text-white font-mono text-xs">${field.field_name}</code>
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-x-2">
                        <button
                          type="button"
                          onclick="editField('${field.id}')"
                          class="inline-flex items-center gap-x-1 px-2.5 py-1.5 text-sm font-medium text-zinc-950 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/>
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          onclick="deleteField('${field.id}')"
                          class="inline-flex items-center gap-x-1 px-2.5 py-1.5 text-sm font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-colors"
                        >
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                `).join("")}

                ${(data.fields || []).length === 0 ? `
                  <div class="text-center py-12 text-zinc-500 dark:text-zinc-400">
                    <svg class="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                    </svg>
                    <p class="mt-4 text-base/7 font-semibold text-zinc-950 dark:text-white">No fields defined</p>
                    <p class="mt-2 text-sm/6">Add your first field to get started</p>
                  </div>
                ` : ""}
              </div>
            </div>
          ` : `
            <div class="mt-6 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-900/30 p-4">
              <div class="flex items-start gap-x-3">
                <svg class="h-5 w-5 text-cyan-600 dark:text-cyan-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <div>
                  <h3 class="text-sm/6 font-medium text-cyan-900 dark:text-cyan-300">
                    Create Collection First
                  </h3>
                  <p class="text-sm/6 text-cyan-800 dark:text-cyan-400 mt-1">
                    After creating the collection, you'll be able to add and configure custom fields.
                  </p>
                </div>
              </div>
            </div>
          `}
          
          <!-- Action Buttons -->
          <div class="mt-6 pt-6 border-t border-zinc-950/5 dark:border-white/10 flex items-center justify-between">
            <a href="/admin/collections" class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              ${data.managed ? "Back to Collections" : "Cancel"}
            </a>

            ${isEdit && !data.managed ? `
              <button
                type="button"
                hx-delete="/admin/collections/${data.id}"
                hx-confirm="Are you sure you want to delete this collection? This action cannot be undone."
                hx-target="body"
                class="inline-flex items-center justify-center gap-x-1.5 rounded-lg bg-pink-600 dark:bg-pink-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 dark:hover:bg-pink-600 transition-colors shadow-sm"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                </svg>
                Delete Collection
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Field Modal -->
    <div id="field-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-zinc-950/5 dark:ring-white/10 w-full max-w-lg mx-4">
        <div class="px-6 py-4 border-b border-zinc-950/5 dark:border-white/10">
          <div class="flex items-center justify-between">
            <h3 id="modal-title" class="text-lg font-semibold text-zinc-950 dark:text-white">Add Field</h3>
            <button onclick="closeFieldModal()" class="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <form id="field-form" class="p-6 space-y-4">
          <input type="hidden" id="field-id" name="field_id">

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Field Name</label>
            <input
              type="text"
              id="field-name"
              name="field_name"
              required
              pattern="[a-z0-9_]+"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="field_name"
            >
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Lowercase letters, numbers, and underscores only</p>
          </div>

          <div>
            <label for="field-type" class="block text-sm/6 font-medium text-zinc-950 dark:text-white">Field Type</label>
            <div class="mt-2 grid grid-cols-1">
              <select
                id="field-type"
                name="field_type"
                required
                class="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white/5 dark:bg-white/5 py-1.5 pl-3 pr-8 text-base text-zinc-950 dark:text-white outline outline-1 -outline-offset-1 outline-blue-500/30 dark:outline-blue-400/30 *:bg-white dark:*:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 dark:focus-visible:outline-blue-400 sm:text-sm/6"
              >
                <option value="">Select field type...</option>
                <option value="text">Text</option>
                <option value="richtext">Rich Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
                <option value="media">Media</option>
                <option value="guid">GUID (Auto-generated)</option>
              </select>
              <svg viewBox="0 0 16 16" fill="currentColor" data-slot="icon" aria-hidden="true" class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-blue-600 dark:text-blue-400 sm:size-4">
                <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" fill-rule="evenodd" />
              </svg>
            </div>
            <p id="field-type-help" class="text-xs text-zinc-500 dark:text-zinc-400 mt-1"></p>
          </div>

          <div>
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Field Label</label>
            <input
              type="text"
              id="field-label"
              name="field_label"
              required
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="Field Label"
            >
          </div>

          <div class="flex items-center space-x-6">
            <div class="flex gap-3">
              <div class="flex h-6 shrink-0 items-center">
                <div class="group grid size-4 grid-cols-1">
                  <input
                    type="checkbox"
                    id="field-required"
                    name="is_required"
                    value="1"
                    class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                  />
                  <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                    <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                    <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                  </svg>
                </div>
              </div>
              <div class="text-sm/6">
                <label for="field-required" class="font-medium text-zinc-950 dark:text-white">Required</label>
              </div>
            </div>

            <div class="flex gap-3">
              <div class="flex h-6 shrink-0 items-center">
                <div class="group grid size-4 grid-cols-1">
                  <input
                    type="checkbox"
                    id="field-searchable"
                    name="is_searchable"
                    value="1"
                    class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                  />
                  <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                    <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                    <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                  </svg>
                </div>
              </div>
              <div class="text-sm/6">
                <label for="field-searchable" class="font-medium text-zinc-950 dark:text-white">Searchable</label>
              </div>
            </div>
          </div>

          <div id="field-options-container" class="hidden">
            <label class="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Field Options (JSON)</label>
            <textarea
              id="field-options"
              name="field_options"
              rows="3"
              class="w-full rounded-lg bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-950 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:outline-none transition-colors font-mono"
              placeholder='{"maxLength": 200, "placeholder": "Enter text..."}'
            ></textarea>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">JSON configuration for field-specific options</p>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-zinc-950/5 dark:border-white/10">
            <button
              type="button"
              onclick="closeFieldModal()"
              class="rounded-lg bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <span id="submit-text">Add Field</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <script>
      const collectionId = '${data.id || ""}';
      
      
      let currentEditingField = null;

      // Field modal functions
      function showAddFieldModal() {
        document.getElementById('modal-title').textContent = 'Add Field';
        document.getElementById('submit-text').textContent = 'Add Field';
        document.getElementById('field-form').reset();
        document.getElementById('field-id').value = '';
        document.getElementById('field-name').disabled = false;
        currentEditingField = null;
        document.getElementById('field-modal').classList.remove('hidden');
      }

      function editField(fieldId) {
        const fieldItem = document.querySelector(\`[data-field-id="\${fieldId}"]\`);
        if (!fieldItem) return;

        // Find the field data from the collection's fields array
        const field = ${JSON.stringify(data.fields || [])}.find(f => f.id === fieldId);
        if (!field) return;

        // Set up the modal for editing
        document.getElementById('modal-title').textContent = 'Edit Field';
        document.getElementById('submit-text').textContent = 'Update Field';
        document.getElementById('field-id').value = fieldId;
        currentEditingField = fieldId;

        // Populate form with existing field data
        document.getElementById('field-name').value = field.field_name || '';
        document.getElementById('field-name').disabled = true;
        document.getElementById('field-label').value = field.field_label || '';
        document.getElementById('field-type').value = field.field_type || '';
        document.getElementById('field-required').checked = Boolean(field.is_required);
        document.getElementById('field-searchable').checked = Boolean(field.is_searchable);
        
        // Handle field options - serialize object back to JSON string
        if (field.field_options) {
          document.getElementById('field-options').value = typeof field.field_options === 'string' 
            ? field.field_options 
            : JSON.stringify(field.field_options, null, 2);
        } else {
          document.getElementById('field-options').value = '';
        }

        // Show/hide options container based on field type
        const fieldType = field.field_type;
        const optionsContainer = document.getElementById('field-options-container');
        const helpText = document.getElementById('field-type-help');

        if (['select', 'media', 'richtext', 'guid'].includes(fieldType)) {
          optionsContainer.classList.remove('hidden');

          // Set help text based on type
          switch (fieldType) {
            case 'select':
              helpText.textContent = 'Create a dropdown select field with custom options';
              break;
            case 'media':
              helpText.textContent = 'Upload and manage media files (images, videos, documents)';
              break;
            case 'richtext':
              helpText.textContent = 'Full-featured WYSIWYG text editor with formatting options';
              break;
            case 'guid':
              helpText.textContent = 'Automatically generates a unique identifier (UUID v4) for each content item';
              break;
          }
        } else {
          optionsContainer.classList.add('hidden');

          // Set help text for other field types
          switch (fieldType) {
            case 'text':
              helpText.textContent = 'Single-line text input for short content';
              break;
            case 'number':
              helpText.textContent = 'Numeric input field for integers or decimals';
              break;
            case 'boolean':
              helpText.textContent = 'True/false checkbox field';
              break;
            case 'date':
              helpText.textContent = 'Date and time picker field';
              break;
            default:
              helpText.textContent = '';
          }
        }

        document.getElementById('field-modal').classList.remove('hidden');
      }

      function closeFieldModal() {
        document.getElementById('field-modal').classList.add('hidden');
        currentEditingField = null;
      }

      let fieldToDelete = null;

      function deleteField(fieldId) {
        fieldToDelete = fieldId;
        showConfirmDialog('delete-field-confirm');
      }

      function performDeleteField() {
        if (!fieldToDelete) return;

        fetch(\`/admin/collections/\${collectionId}/fields/\${fieldToDelete}\`, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert('Error deleting field: ' + data.error);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Error deleting field');
        })
        .finally(() => {
          fieldToDelete = null;
        });
      }

      // Field form submission
      document.getElementById('field-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!collectionId) {
          alert('Error: Collection ID is missing. Cannot save field.');
          return;
        }
        
        const formData = new FormData(this);
        const isEditing = currentEditingField !== null;
        
        const url = isEditing 
          ? \`/admin/collections/\${collectionId}/fields/\${currentEditingField}\`
          : \`/admin/collections/\${collectionId}/fields\`;
        
        const method = isEditing ? 'PUT' : 'POST';
        
        
        fetch(url, {
          method: method,
          body: formData
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }
          return response.json();
        })
        .then(data => {
          if (data.success) {
            location.reload();
          } else {
            alert('Error saving field: ' + (data.error || 'Unknown error'));
          }
        })
        .catch(error => {
          alert('Error saving field: ' + error.message);
        });
      });

      // Field type change handler
      document.getElementById('field-type').addEventListener('change', function() {
        const optionsContainer = document.getElementById('field-options-container');
        const fieldOptions = document.getElementById('field-options');
        const helpText = document.getElementById('field-type-help');
        const fieldNameInput = document.getElementById('field-name');

        // Show/hide options based on field type
        if (['select', 'media', 'richtext', 'guid'].includes(this.value)) {
          optionsContainer.classList.remove('hidden');

          // Set default options and help text based on type
          switch (this.value) {
            case 'select':
              fieldOptions.value = '{"options": ["Option 1", "Option 2"], "multiple": false}';
              helpText.textContent = 'Create a dropdown select field with custom options';
              break;
            case 'media':
              fieldOptions.value = '{"accept": "image/*", "maxSize": "10MB"}';
              helpText.textContent = 'Upload and manage media files (images, videos, documents)';
              break;
            case 'richtext':
              fieldOptions.value = '{"toolbar": "full", "height": 400}';
              helpText.textContent = 'Full-featured WYSIWYG text editor with formatting options';
              break;
            case 'guid':
              fieldOptions.value = '{"autoGenerate": true, "format": "uuid-v4"}';
              helpText.textContent = 'Automatically generates a unique identifier (UUID v4) for each content item';
              // Suggest 'id' as field name for GUID fields
              if (!fieldNameInput.value || fieldNameInput.value === '') {
                fieldNameInput.value = 'id';
              }
              break;
          }
        } else {
          optionsContainer.classList.add('hidden');
          fieldOptions.value = '{}';

          // Set help text for other field types
          switch (this.value) {
            case 'text':
              helpText.textContent = 'Single-line text input for short content';
              break;
            case 'number':
              helpText.textContent = 'Numeric input field for integers or decimals';
              break;
            case 'boolean':
              helpText.textContent = 'True/false checkbox field';
              break;
            case 'date':
              helpText.textContent = 'Date and time picker field';
              break;
            default:
              helpText.textContent = '';
          }
        }
      });

      // Close modal on escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !document.getElementById('field-modal').classList.contains('hidden')) {
          closeFieldModal();
        }
      });

      // Close modal on backdrop click
      document.getElementById('field-modal').addEventListener('click', function(e) {
        if (e.target === this) {
          closeFieldModal();
        }
      });
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog2({
    id: "delete-field-confirm",
    title: "Delete Field",
    message: "Are you sure you want to delete this field? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
    iconColor: "red",
    confirmClass: "bg-red-500 hover:bg-red-400",
    onConfirm: "performDeleteField()"
  })}

    ${getConfirmationDialogScript2()}
  `;
  const layoutData = {
    title,
    pageTitle: "Collections",
    currentPath: "/admin/collections",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}

// src/routes/admin-collections.ts
var adminCollectionsRoutes = new hono.Hono();
adminCollectionsRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
adminCollectionsRoutes.get("/", async (c) => {
  try {
    const user = c.get("user");
    const db = c.env.DB;
    const url = new URL(c.req.url);
    const search = url.searchParams.get("search") || "";
    let stmt;
    let results;
    if (search) {
      stmt = db.prepare(`
        SELECT id, name, display_name, description, created_at, managed
        FROM collections
        WHERE is_active = 1
        AND (name LIKE ? OR display_name LIKE ? OR description LIKE ?)
        ORDER BY created_at DESC
      `);
      const searchParam = `%${search}%`;
      const queryResults = await stmt.bind(searchParam, searchParam, searchParam).all();
      results = queryResults.results;
    } else {
      stmt = db.prepare("SELECT id, name, display_name, description, created_at, managed FROM collections WHERE is_active = 1 ORDER BY created_at DESC");
      const queryResults = await stmt.all();
      results = queryResults.results;
    }
    const fieldCountStmt = db.prepare("SELECT collection_id, COUNT(*) as count FROM content_fields GROUP BY collection_id");
    const { results: fieldCountResults } = await fieldCountStmt.all();
    const fieldCounts = new Map((fieldCountResults || []).map((row) => [String(row.collection_id), Number(row.count)]));
    const collections = (results || []).filter((row) => row && row.id).map((row) => {
      return {
        id: String(row.id || ""),
        name: String(row.name || ""),
        display_name: String(row.display_name || ""),
        description: row.description ? String(row.description) : void 0,
        created_at: Number(row.created_at || 0),
        formattedDate: row.created_at ? new Date(Number(row.created_at)).toLocaleDateString() : "Unknown",
        field_count: fieldCounts.get(String(row.id)) || 0,
        managed: row.managed === 1
      };
    });
    const pageData = {
      collections,
      search,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      version: c.get("appVersion")
    };
    return c.html(renderCollectionsListPage(pageData));
  } catch (error) {
    console.error("Error fetching collections:", error);
    return c.html(html.html`<p>Error loading collections</p>`);
  }
});
adminCollectionsRoutes.get("/new", (c) => {
  const user = c.get("user");
  const formData = {
    isEdit: false,
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    version: c.get("appVersion")
  };
  return c.html(renderCollectionFormPage(formData));
});
adminCollectionsRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const name = formData.get("name");
    const displayName = formData.get("displayName");
    const description = formData.get("description");
    const isHtmx = c.req.header("HX-Request") === "true";
    if (!name || !displayName) {
      const errorMsg = "Name and display name are required.";
      if (isHtmx) {
        return c.html(html.html`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ${errorMsg}
          </div>
        `);
      } else {
        return c.redirect("/admin/collections/new");
      }
    }
    if (!/^[a-z0-9_]+$/.test(name)) {
      const errorMsg = "Collection name must contain only lowercase letters, numbers, and underscores.";
      if (isHtmx) {
        return c.html(html.html`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ${errorMsg}
          </div>
        `);
      } else {
        return c.redirect("/admin/collections/new");
      }
    }
    const db = c.env.DB;
    const existingStmt = db.prepare("SELECT id FROM collections WHERE name = ?");
    const existing = await existingStmt.bind(name).first();
    if (existing) {
      const errorMsg = "A collection with this name already exists.";
      if (isHtmx) {
        return c.html(html.html`
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            ${errorMsg}
          </div>
        `);
      } else {
        return c.redirect("/admin/collections/new");
      }
    }
    const basicSchema = {
      type: "object",
      properties: {
        title: {
          type: "string",
          title: "Title",
          required: true
        },
        content: {
          type: "string",
          title: "Content",
          format: "richtext"
        },
        status: {
          type: "string",
          title: "Status",
          enum: ["draft", "published", "archived"],
          default: "draft"
        }
      },
      required: ["title"]
    };
    const collectionId = globalThis.crypto.randomUUID();
    const now = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO collections (id, name, display_name, description, schema, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertStmt.bind(
      collectionId,
      name,
      displayName,
      description || null,
      JSON.stringify(basicSchema),
      1,
      // is_active
      now,
      now
    ).run();
    try {
      await c.env.CACHE_KV.delete("cache:collections:all");
      await c.env.CACHE_KV.delete(`cache:collection:${name}`);
    } catch (e) {
      console.error("Error clearing cache:", e);
    }
    if (isHtmx) {
      return c.html(html.html`
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Collection created successfully! Redirecting...
          <script>
            setTimeout(() => {
              window.location.href = '/admin/collections';
            }, 1500);
          </script>
        </div>
      `);
    } else {
      return c.redirect("/admin/collections");
    }
  } catch (error) {
    console.error("Error creating collection:", error);
    const isHtmx = c.req.header("HX-Request") === "true";
    if (isHtmx) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Failed to create collection. Please try again.
        </div>
      `);
    } else {
      return c.redirect("/admin/collections/new");
    }
  }
});
adminCollectionsRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user");
    const db = c.env.DB;
    const stmt = db.prepare("SELECT * FROM collections WHERE id = ?");
    const collection = await stmt.bind(id).first();
    if (!collection) {
      const formData2 = {
        isEdit: true,
        error: "Collection not found.",
        user: user ? {
          name: user.email,
          email: user.email,
          role: user.role
        } : void 0,
        version: c.get("appVersion")
      };
      return c.html(renderCollectionFormPage(formData2));
    }
    const fieldsStmt = db.prepare(`
      SELECT * FROM content_fields
      WHERE collection_id = ?
      ORDER BY field_order ASC
    `);
    const { results: fieldsResults } = await fieldsStmt.bind(id).all();
    const fields = (fieldsResults || []).map((row) => ({
      id: row.id,
      field_name: row.field_name,
      field_type: row.field_type,
      field_label: row.field_label,
      field_options: row.field_options ? JSON.parse(row.field_options) : {},
      field_order: row.field_order,
      is_required: row.is_required === 1,
      is_searchable: row.is_searchable === 1
    }));
    const formData = {
      id: collection.id,
      name: collection.name,
      display_name: collection.display_name,
      description: collection.description,
      fields,
      managed: collection.managed === 1,
      isEdit: true,
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      version: c.get("appVersion")
    };
    return c.html(renderCollectionFormPage(formData));
  } catch (error) {
    console.error("Error fetching collection:", error);
    const user = c.get("user");
    const formData = {
      isEdit: true,
      error: "Failed to load collection.",
      user: user ? {
        name: user.email,
        email: user.email,
        role: user.role
      } : void 0,
      version: c.get("appVersion")
    };
    return c.html(renderCollectionFormPage(formData));
  }
});
adminCollectionsRoutes.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const formData = await c.req.formData();
    const displayName = formData.get("displayName");
    const description = formData.get("description");
    if (!displayName) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Display name is required.
        </div>
      `);
    }
    const db = c.env.DB;
    const updateStmt = db.prepare(`
      UPDATE collections
      SET display_name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(displayName, description || null, Date.now(), id).run();
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        Collection updated successfully!
      </div>
    `);
  } catch (error) {
    console.error("Error updating collection:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to update collection. Please try again.
      </div>
    `);
  }
});
adminCollectionsRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = c.env.DB;
    const contentStmt = db.prepare("SELECT COUNT(*) as count FROM content WHERE collection_id = ?");
    const contentResult = await contentStmt.bind(id).first();
    if (contentResult && contentResult.count > 0) {
      return c.html(html.html`
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Cannot delete collection: it contains ${contentResult.count} content item(s). Delete all content first.
        </div>
      `);
    }
    const deleteFieldsStmt = db.prepare("DELETE FROM content_fields WHERE collection_id = ?");
    await deleteFieldsStmt.bind(id).run();
    const deleteStmt = db.prepare("DELETE FROM collections WHERE id = ?");
    await deleteStmt.bind(id).run();
    return c.html(html.html`
      <script>
        window.location.href = '/admin/collections';
      </script>
    `);
  } catch (error) {
    console.error("Error deleting collection:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to delete collection. Please try again.
      </div>
    `);
  }
});
adminCollectionsRoutes.post("/:id/fields", async (c) => {
  try {
    const collectionId = c.req.param("id");
    const formData = await c.req.formData();
    const fieldName = formData.get("field_name");
    const fieldType = formData.get("field_type");
    const fieldLabel = formData.get("field_label");
    const isRequired = formData.get("is_required") === "1";
    const isSearchable = formData.get("is_searchable") === "1";
    const fieldOptions = formData.get("field_options") || "{}";
    if (!fieldName || !fieldType || !fieldLabel) {
      return c.json({ success: false, error: "Field name, type, and label are required." });
    }
    if (!/^[a-z0-9_]+$/.test(fieldName)) {
      return c.json({ success: false, error: "Field name must contain only lowercase letters, numbers, and underscores." });
    }
    const db = c.env.DB;
    const existingStmt = db.prepare("SELECT id FROM content_fields WHERE collection_id = ? AND field_name = ?");
    const existing = await existingStmt.bind(collectionId, fieldName).first();
    if (existing) {
      return c.json({ success: false, error: "A field with this name already exists." });
    }
    const orderStmt = db.prepare("SELECT MAX(field_order) as max_order FROM content_fields WHERE collection_id = ?");
    const orderResult = await orderStmt.bind(collectionId).first();
    const nextOrder = (orderResult?.max_order || 0) + 1;
    const fieldId = globalThis.crypto.randomUUID();
    const now = Date.now();
    const insertStmt = db.prepare(`
      INSERT INTO content_fields (
        id, collection_id, field_name, field_type, field_label,
        field_options, field_order, is_required, is_searchable,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await insertStmt.bind(
      fieldId,
      collectionId,
      fieldName,
      fieldType,
      fieldLabel,
      fieldOptions,
      nextOrder,
      isRequired ? 1 : 0,
      isSearchable ? 1 : 0,
      now,
      now
    ).run();
    return c.json({ success: true, fieldId });
  } catch (error) {
    console.error("Error adding field:", error);
    return c.json({ success: false, error: "Failed to add field." });
  }
});
adminCollectionsRoutes.put("/:collectionId/fields/:fieldId", async (c) => {
  try {
    const fieldId = c.req.param("fieldId");
    const formData = await c.req.formData();
    const fieldLabel = formData.get("field_label");
    const isRequired = formData.get("is_required") === "1";
    const isSearchable = formData.get("is_searchable") === "1";
    const fieldOptions = formData.get("field_options") || "{}";
    if (!fieldLabel) {
      return c.json({ success: false, error: "Field label is required." });
    }
    const db = c.env.DB;
    const updateStmt = db.prepare(`
      UPDATE content_fields
      SET field_label = ?, field_options = ?, is_required = ?, is_searchable = ?, updated_at = ?
      WHERE id = ?
    `);
    await updateStmt.bind(fieldLabel, fieldOptions, isRequired ? 1 : 0, isSearchable ? 1 : 0, Date.now(), fieldId).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating field:", error);
    return c.json({ success: false, error: "Failed to update field." });
  }
});
adminCollectionsRoutes.delete("/:collectionId/fields/:fieldId", async (c) => {
  try {
    const fieldId = c.req.param("fieldId");
    const db = c.env.DB;
    const deleteStmt = db.prepare("DELETE FROM content_fields WHERE id = ?");
    await deleteStmt.bind(fieldId).run();
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting field:", error);
    return c.json({ success: false, error: "Failed to delete field." });
  }
});
adminCollectionsRoutes.post("/:collectionId/fields/reorder", async (c) => {
  try {
    const body = await c.req.json();
    const fieldIds = body.fieldIds;
    if (!Array.isArray(fieldIds)) {
      return c.json({ success: false, error: "Invalid field order data." });
    }
    const db = c.env.DB;
    for (let i = 0; i < fieldIds.length; i++) {
      const updateStmt = db.prepare("UPDATE content_fields SET field_order = ?, updated_at = ? WHERE id = ?");
      await updateStmt.bind(i + 1, Date.now(), fieldIds[i]).run();
    }
    return c.json({ success: true });
  } catch (error) {
    console.error("Error reordering fields:", error);
    return c.json({ success: false, error: "Failed to reorder fields." });
  }
});

// src/templates/pages/admin-settings.template.ts
chunk3SPQ3J4N_cjs.init_admin_layout_catalyst_template();
function renderSettingsPage(data) {
  const activeTab = data.activeTab || "general";
  const pageContent = `
    <div>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 class="text-2xl/8 font-semibold text-zinc-950 dark:text-white sm:text-xl/8">Settings</h1>
          <p class="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage your application settings and preferences</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex space-x-3">
          <button
            onclick="resetSettings()"
            class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Reset to Defaults
          </button>
          <button
            onclick="saveAllSettings()"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-950 dark:bg-white px-3.5 py-2.5 text-sm font-semibold text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            Save All Changes
          </button>
        </div>
      </div>

      <!-- Settings Navigation Tabs -->
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10 mb-6 overflow-hidden">
        <div class="border-b border-zinc-950/5 dark:border-white/10">
          <nav class="flex overflow-x-auto" role="tablist">
            ${renderTabButton("general", "General", "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", activeTab)}
            ${renderTabButton("appearance", "Appearance", "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z", activeTab)}
            ${renderTabButton("security", "Security", "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", activeTab)}
            ${renderTabButton("notifications", "Notifications", "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", activeTab)}
            ${renderTabButton("storage", "Storage", "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12", activeTab)}
            ${renderTabButton("migrations", "Migrations", "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4", activeTab)}
            ${renderTabButton("database-tools", "Database Tools", "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01", activeTab)}
          </nav>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="rounded-xl bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-zinc-950/5 dark:ring-white/10">
        <div id="settings-content" class="p-8">
          ${renderTabContent(activeTab, data.settings)}
        </div>
      </div>
    </div>

    <script>
      // Initialize tab-specific features on page load
      const currentTab = '${activeTab}';

      function saveAllSettings() {
        // Collect all form data
        const formData = new FormData();
        
        // Get all form inputs
        document.querySelectorAll('input, select, textarea').forEach(input => {
          if (input.type === 'checkbox') {
            formData.append(input.name, input.checked);
          } else if (input.name) {
            formData.append(input.name, input.value);
          }
        });
        
        // Show loading state
        const saveBtn = document.querySelector('button[onclick="saveAllSettings()"]');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = 'Saving...';
        saveBtn.disabled = true;
        
        // Simulate save (replace with actual API call)
        setTimeout(() => {
          saveBtn.innerHTML = originalText;
          saveBtn.disabled = false;
          showNotification('Settings saved successfully!', 'success');
        }, 1000);
      }
      
      function resetSettings() {
        showConfirmDialog('reset-settings-confirm');
      }

      function performResetSettings() {
        showNotification('Settings reset to defaults', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      // Migration functions
      window.refreshMigrationStatus = async function() {
        try {
          const response = await fetch('/admin/settings/api/migrations/status');
          const result = await response.json();
          
          if (result.success) {
            updateMigrationUI(result.data);
          } else {
            console.error('Failed to refresh migration status');
          }
        } catch (error) {
          console.error('Error loading migration status:', error);
        }
      };

      window.runPendingMigrations = async function() {
        const btn = document.getElementById('run-migrations-btn');
        if (!btn || btn.disabled) return;

        showConfirmDialog('run-migrations-confirm');
      };

      window.performRunMigrations = async function() {
        const btn = document.getElementById('run-migrations-btn');
        if (!btn) return;

        btn.disabled = true;
        btn.innerHTML = 'Running...';

        try {
          const response = await fetch('/admin/settings/api/migrations/run', {
            method: 'POST'
          });
          const result = await response.json();

          if (result.success) {
            alert(result.message);
            setTimeout(() => window.refreshMigrationStatus(), 1000);
          } else {
            alert(result.error || 'Failed to run migrations');
          }
        } catch (error) {
          alert('Error running migrations');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Run Pending';
        }
      };

      window.validateSchema = async function() {
        try {
          const response = await fetch('/admin/settings/api/migrations/validate');
          const result = await response.json();
          
          if (result.success) {
            if (result.data.valid) {
              alert('Database schema is valid');
            } else {
              alert(\`Schema validation failed: \${result.data.issues.join(', ')}\`);
            }
          } else {
            alert('Failed to validate schema');
          }
        } catch (error) {
          alert('Error validating schema');
        }
      };

      window.updateMigrationUI = function(data) {
        const totalEl = document.getElementById('total-migrations');
        const appliedEl = document.getElementById('applied-migrations');
        const pendingEl = document.getElementById('pending-migrations');
        
        if (totalEl) totalEl.textContent = data.totalMigrations;
        if (appliedEl) appliedEl.textContent = data.appliedMigrations;
        if (pendingEl) pendingEl.textContent = data.pendingMigrations;
        
        const runBtn = document.getElementById('run-migrations-btn');
        if (runBtn) {
          runBtn.disabled = data.pendingMigrations === 0;
        }
        
        // Update migrations list
        const listContainer = document.getElementById('migrations-list');
        if (listContainer && data.migrations && data.migrations.length > 0) {
          listContainer.innerHTML = data.migrations.map(migration => \`
            <div class="px-6 py-4 flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0">
                    \${migration.applied 
                      ? '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                      : '<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                    }
                  </div>
                  <div>
                    <h5 class="text-white font-medium">\${migration.name}</h5>
                    <p class="text-sm text-gray-300">\${migration.filename}</p>
                    \${migration.description ? \`<p class="text-xs text-gray-400 mt-1">\${migration.description}</p>\` : ''}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center space-x-4 text-sm">
                \${migration.size ? \`<span class="text-gray-400">\${(migration.size / 1024).toFixed(1)} KB</span>\` : ''}
                <span class="px-2 py-1 rounded-full text-xs font-medium \${
                  migration.applied 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }">
                  \${migration.applied ? 'Applied' : 'Pending'}
                </span>
                \${migration.appliedAt ? \`<span class="text-gray-400">\${new Date(migration.appliedAt).toLocaleDateString()}</span>\` : ''}
              </div>
            </div>
          \`).join('');
        }
      };
      
      // Auto-load migrations when switching to that tab
      function initializeMigrations() {
        if (currentTab === 'migrations') {
          setTimeout(window.refreshMigrationStatus, 500);
        }
      }
      
      // Database Tools functions
      window.refreshDatabaseStats = async function() {
        try {
          const response = await fetch('/admin/settings/api/database-tools/stats');
          const result = await response.json();
          
          if (result.success) {
            updateDatabaseToolsUI(result.data);
          } else {
            console.error('Failed to refresh database stats');
          }
        } catch (error) {
          console.error('Error loading database stats:', error);
        }
      };

      window.createDatabaseBackup = async function() {
        const btn = document.getElementById('create-backup-btn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = 'Creating Backup...';
        
        try {
          const response = await fetch('/admin/settings/api/database-tools/backup', {
            method: 'POST'
          });
          const result = await response.json();
          
          if (result.success) {
            alert(result.message);
            setTimeout(() => window.refreshDatabaseStats(), 1000);
          } else {
            alert(result.error || 'Failed to create backup');
          }
        } catch (error) {
          alert('Error creating backup');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Create Backup';
        }
      };

      window.truncateDatabase = async function() {
        // Show dangerous operation warning
        const confirmText = prompt(
          'WARNING: This will delete ALL data except your admin account!\\n\\n' +
          'This action CANNOT be undone!\\n\\n' +
          'Type "TRUNCATE ALL DATA" to confirm:'
        );
        
        if (confirmText !== 'TRUNCATE ALL DATA') {
          alert('Operation cancelled. Confirmation text did not match.');
          return;
        }
        
        const btn = document.getElementById('truncate-db-btn');
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = 'Truncating...';
        
        try {
          const response = await fetch('/admin/settings/api/database-tools/truncate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              confirmText: confirmText
            })
          });
          const result = await response.json();
          
          if (result.success) {
            alert(result.message + '\\n\\nTables cleared: ' + result.data.tablesCleared.join(', '));
            setTimeout(() => {
              window.refreshDatabaseStats();
              // Optionally reload page to refresh all data
              window.location.reload();
            }, 2000);
          } else {
            alert(result.error || 'Failed to truncate database');
          }
        } catch (error) {
          alert('Error truncating database');
        } finally {
          btn.disabled = false;
          btn.innerHTML = 'Truncate All Data';
        }
      };

      window.validateDatabase = async function() {
        try {
          const response = await fetch('/admin/settings/api/database-tools/validate');
          const result = await response.json();
          
          if (result.success) {
            if (result.data.valid) {
              alert('Database validation passed. No issues found.');
            } else {
              alert('Database validation failed:\\n\\n' + result.data.issues.join('\\n'));
            }
          } else {
            alert('Failed to validate database');
          }
        } catch (error) {
          alert('Error validating database');
        }
      };

      window.updateDatabaseToolsUI = function(data) {
        const totalTablesEl = document.getElementById('total-tables');
        const totalRowsEl = document.getElementById('total-rows');
        const tablesListEl = document.getElementById('tables-list');

        if (totalTablesEl) totalTablesEl.textContent = data.tables.length;
        if (totalRowsEl) totalRowsEl.textContent = data.totalRows.toLocaleString();

        if (tablesListEl && data.tables && data.tables.length > 0) {
          tablesListEl.innerHTML = data.tables.map(table => \`
            <a
              href="/admin/database-tools/tables/\${table.name}"
              class="flex items-center justify-between py-3 px-4 rounded-lg bg-white dark:bg-white/5 hover:bg-zinc-50 dark:hover:bg-white/10 cursor-pointer transition-colors ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 no-underline"
            >
              <div class="flex items-center space-x-3">
                <svg class="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <span class="text-zinc-950 dark:text-white font-medium">\${table.name}</span>
              </div>
              <div class="flex items-center space-x-3">
                <span class="text-zinc-500 dark:text-zinc-400 text-sm">\${table.rowCount.toLocaleString()} rows</span>
                <svg class="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          \`).join('');
        }
      };

      // Auto-load tab-specific data after all functions are defined
      if (currentTab === 'migrations') {
        setTimeout(window.refreshMigrationStatus, 500);
      }

      if (currentTab === 'database-tools') {
        setTimeout(window.refreshDatabaseStats, 500);
      }
    </script>

    <!-- Confirmation Dialogs -->
    ${renderConfirmationDialog2({
    id: "reset-settings-confirm",
    title: "Reset Settings",
    message: "Are you sure you want to reset all settings to their default values? This action cannot be undone.",
    confirmText: "Reset",
    cancelText: "Cancel",
    iconColor: "yellow",
    confirmClass: "bg-yellow-500 hover:bg-yellow-400",
    onConfirm: "performResetSettings()"
  })}

    ${renderConfirmationDialog2({
    id: "run-migrations-confirm",
    title: "Run Migrations",
    message: "Are you sure you want to run pending migrations? This action cannot be undone.",
    confirmText: "Run Migrations",
    cancelText: "Cancel",
    iconColor: "blue",
    confirmClass: "bg-blue-500 hover:bg-blue-400",
    onConfirm: "performRunMigrations()"
  })}

    ${getConfirmationDialogScript2()}
  `;
  const layoutData = {
    title: "Settings",
    pageTitle: "Settings",
    currentPath: "/admin/settings",
    user: data.user,
    version: data.version,
    content: pageContent
  };
  return chunk3SPQ3J4N_cjs.renderAdminLayoutCatalyst(layoutData);
}
function renderTabButton(tabId, label, iconPath, activeTab) {
  const isActive = activeTab === tabId;
  const baseClasses = "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap no-underline";
  const activeClasses = isActive ? "border-zinc-950 dark:border-white text-zinc-950 dark:text-white" : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700";
  return `
    <a
      href="/admin/settings/${tabId}"
      data-tab="${tabId}"
      class="${baseClasses} ${activeClasses}"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
      </svg>
      <span>${label}</span>
    </a>
  `;
}
function renderTabContent(activeTab, settings) {
  switch (activeTab) {
    case "general":
      return renderGeneralSettings(settings?.general);
    case "appearance":
      return renderAppearanceSettings(settings?.appearance);
    case "security":
      return renderSecuritySettings(settings?.security);
    case "notifications":
      return renderNotificationSettings(settings?.notifications);
    case "storage":
      return renderStorageSettings(settings?.storage);
    case "migrations":
      return renderMigrationSettings(settings?.migrations);
    case "database-tools":
      return renderDatabaseToolsSettings(settings?.databaseTools);
    default:
      return renderGeneralSettings(settings?.general);
  }
}
function renderGeneralSettings(settings) {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg/7 font-semibold text-zinc-950 dark:text-white">General Settings</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Configure basic application settings and preferences.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Site Name</label>
            <input
              type="text"
              name="siteName"
              value="${settings?.siteName || "SonicJS AI"}"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="Enter site name"
            />
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Admin Email</label>
            <input
              type="email"
              name="adminEmail"
              value="${settings?.adminEmail || "admin@example.com"}"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Timezone</label>
            <select
              name="timezone"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="UTC" ${settings?.timezone === "UTC" ? "selected" : ""}>UTC</option>
              <option value="America/New_York" ${settings?.timezone === "America/New_York" ? "selected" : ""}>Eastern Time</option>
              <option value="America/Chicago" ${settings?.timezone === "America/Chicago" ? "selected" : ""}>Central Time</option>
              <option value="America/Denver" ${settings?.timezone === "America/Denver" ? "selected" : ""}>Mountain Time</option>
              <option value="America/Los_Angeles" ${settings?.timezone === "America/Los_Angeles" ? "selected" : ""}>Pacific Time</option>
            </select>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Site Description</label>
            <textarea
              name="siteDescription"
              rows="3"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
              placeholder="Describe your site..."
            >${settings?.siteDescription || ""}</textarea>
          </div>

          <div>
            <label class="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-2">Language</label>
            <select
              name="language"
              class="w-full rounded-lg bg-white dark:bg-white/5 px-3 py-2 text-sm/6 text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:focus:ring-indigo-400"
            >
              <option value="en" ${settings?.language === "en" ? "selected" : ""}>English</option>
              <option value="es" ${settings?.language === "es" ? "selected" : ""}>Spanish</option>
              <option value="fr" ${settings?.language === "fr" ? "selected" : ""}>French</option>
              <option value="de" ${settings?.language === "de" ? "selected" : ""}>German</option>
            </select>
          </div>
          
          <div class="flex gap-3">
            <div class="flex h-6 shrink-0 items-center">
              <div class="group grid size-4 grid-cols-1">
                <input
                  type="checkbox"
                  id="maintenanceMode"
                  name="maintenanceMode"
                  ${settings?.maintenanceMode ? "checked" : ""}
                  class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                />
                <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                  <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                  <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                </svg>
              </div>
            </div>
            <div class="text-sm/6">
              <label for="maintenanceMode" class="font-medium text-zinc-950 dark:text-white">
                Enable maintenance mode
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderAppearanceSettings(settings) {
  return `
    <div class="space-y-6">
      <!-- WIP Notice -->
      <div class="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-blue-900 dark:text-blue-300">Work in Progress</h4>
            <p class="mt-1 text-sm/6 text-blue-700 dark:text-blue-200">
              This settings section is currently under development and provided for reference and design feedback only. Changes made here will not be saved.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Appearance Settings</h3>
        <p class="text-gray-300 mb-6">Customize the look and feel of your application.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex items-center space-x-2 p-3 bg-white/10 rounded-lg border border-white/20 cursor-pointer hover:bg-white/20 transition-colors">
                <input 
                  type="radio" 
                  name="theme" 
                  value="light"
                  ${settings?.theme === "light" ? "checked" : ""}
                  class="text-blue-600"
                />
                <span class="text-sm text-gray-300">Light</span>
              </label>
              <label class="flex items-center space-x-2 p-3 bg-white/10 rounded-lg border border-white/20 cursor-pointer hover:bg-white/20 transition-colors">
                <input 
                  type="radio" 
                  name="theme" 
                  value="dark"
                  ${settings?.theme === "dark" || !settings?.theme ? "checked" : ""}
                  class="text-blue-600"
                />
                <span class="text-sm text-gray-300">Dark</span>
              </label>
              <label class="flex items-center space-x-2 p-3 bg-white/10 rounded-lg border border-white/20 cursor-pointer hover:bg-white/20 transition-colors">
                <input 
                  type="radio" 
                  name="theme" 
                  value="auto"
                  ${settings?.theme === "auto" ? "checked" : ""}
                  class="text-blue-600"
                />
                <span class="text-sm text-gray-300">Auto</span>
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
            <div class="flex items-center space-x-3">
              <input 
                type="color" 
                name="primaryColor"
                value="${settings?.primaryColor || "#465FFF"}"
                class="w-12 h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
              />
              <input 
                type="text" 
                value="${settings?.primaryColor || "#465FFF"}"
                class="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#465FFF"
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
            <input 
              type="url" 
              name="logoUrl"
              value="${settings?.logoUrl || ""}"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Favicon URL</label>
            <input 
              type="url" 
              name="favicon"
              value="${settings?.favicon || ""}"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/favicon.ico"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Custom CSS</label>
            <textarea 
              name="customCSS"
              rows="6"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="/* Add your custom CSS here */"
            >${settings?.customCSS || ""}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderSecuritySettings(settings) {
  return `
    <div class="space-y-6">
      <!-- WIP Notice -->
      <div class="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-blue-900 dark:text-blue-300">Work in Progress</h4>
            <p class="mt-1 text-sm/6 text-blue-700 dark:text-blue-200">
              This settings section is currently under development and provided for reference and design feedback only. Changes made here will not be saved.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Security Settings</h3>
        <p class="text-gray-300 mb-6">Configure security and authentication settings.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-5">
          <div class="flex gap-3">
            <div class="flex h-6 shrink-0 items-center">
              <div class="group grid size-4 grid-cols-1">
                <input
                  type="checkbox"
                  id="twoFactorEnabled"
                  name="twoFactorEnabled"
                  ${settings?.twoFactorEnabled ? "checked" : ""}
                  class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                />
                <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                  <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                  <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                </svg>
              </div>
            </div>
            <div class="text-sm/6">
              <label for="twoFactorEnabled" class="font-medium text-zinc-950 dark:text-white">
                Enable Two-Factor Authentication
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Session Timeout (minutes)</label>
            <input 
              type="number" 
              name="sessionTimeout"
              value="${settings?.sessionTimeout || 30}"
              min="5"
              max="1440"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Password Requirements</label>
            <div class="space-y-3">
              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="requireUppercase"
                      name="requireUppercase"
                      ${settings?.passwordRequirements?.requireUppercase ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="requireUppercase" class="font-medium text-zinc-950 dark:text-white">Require uppercase letters</label>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="requireNumbers"
                      name="requireNumbers"
                      ${settings?.passwordRequirements?.requireNumbers ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="requireNumbers" class="font-medium text-zinc-950 dark:text-white">Require numbers</label>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="requireSymbols"
                      name="requireSymbols"
                      ${settings?.passwordRequirements?.requireSymbols ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="requireSymbols" class="font-medium text-zinc-950 dark:text-white">Require symbols</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Minimum Password Length</label>
            <input 
              type="number" 
              name="minPasswordLength"
              value="${settings?.passwordRequirements?.minLength || 8}"
              min="6"
              max="128"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">IP Whitelist</label>
            <textarea 
              name="ipWhitelist"
              rows="4"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter IP addresses (one per line)&#10;192.168.1.1&#10;10.0.0.1"
            >${settings?.ipWhitelist?.join("\n") || ""}</textarea>
            <p class="text-xs text-gray-400 mt-1">Leave empty to allow all IPs</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderNotificationSettings(settings) {
  return `
    <div class="space-y-6">
      <!-- WIP Notice -->
      <div class="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-blue-900 dark:text-blue-300">Work in Progress</h4>
            <p class="mt-1 text-sm/6 text-blue-700 dark:text-blue-200">
              This settings section is currently under development and provided for reference and design feedback only. Changes made here will not be saved.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Notification Settings</h3>
        <p class="text-gray-300 mb-6">Configure how and when you receive notifications.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <h4 class="text-md font-medium text-white mb-3">Email Notifications</h4>
            <div class="space-y-5">
              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      name="emailNotifications"
                      ${settings?.emailNotifications ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="emailNotifications" class="font-medium text-zinc-950 dark:text-white">Enable email notifications</label>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="contentUpdates"
                      name="contentUpdates"
                      ${settings?.contentUpdates ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="contentUpdates" class="font-medium text-zinc-950 dark:text-white">Content updates</label>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="systemAlerts"
                      name="systemAlerts"
                      ${settings?.systemAlerts ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="systemAlerts" class="font-medium text-zinc-950 dark:text-white">System alerts</label>
                </div>
              </div>

              <div class="flex gap-3">
                <div class="flex h-6 shrink-0 items-center">
                  <div class="group grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      id="userRegistrations"
                      name="userRegistrations"
                      ${settings?.userRegistrations ? "checked" : ""}
                      class="col-start-1 row-start-1 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-white dark:bg-white/5 checked:border-indigo-500 checked:bg-indigo-500 indeterminate:border-indigo-500 indeterminate:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:border-zinc-950/5 dark:disabled:border-white/5 disabled:bg-zinc-950/10 dark:disabled:bg-white/10 disabled:checked:bg-zinc-950/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                    />
                    <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-[:disabled]:stroke-zinc-950/25 dark:group-has-[:disabled]:stroke-white/25">
                      <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
                      <path d="M3 7H11" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:indeterminate]:opacity-100" />
                    </svg>
                  </div>
                </div>
                <div class="text-sm/6">
                  <label for="userRegistrations" class="font-medium text-zinc-950 dark:text-white">New user registrations</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Email Frequency</label>
            <select 
              name="emailFrequency"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="immediate" ${settings?.emailFrequency === "immediate" ? "selected" : ""}>Immediate</option>
              <option value="daily" ${settings?.emailFrequency === "daily" ? "selected" : ""}>Daily Digest</option>
              <option value="weekly" ${settings?.emailFrequency === "weekly" ? "selected" : ""}>Weekly Digest</option>
            </select>
          </div>
          
          <div class="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h5 class="text-sm font-medium text-blue-300">Notification Preferences</h5>
                <p class="text-xs text-blue-200 mt-1">
                  Critical system alerts will always be sent immediately regardless of your frequency setting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderStorageSettings(settings) {
  return `
    <div class="space-y-6">
      <!-- WIP Notice -->
      <div class="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-blue-900 dark:text-blue-300">Work in Progress</h4>
            <p class="mt-1 text-sm/6 text-blue-700 dark:text-blue-200">
              This settings section is currently under development and provided for reference and design feedback only. Changes made here will not be saved.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Storage Settings</h3>
        <p class="text-gray-300 mb-6">Configure file storage and backup settings.</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Max File Size (MB)</label>
            <input 
              type="number" 
              name="maxFileSize"
              value="${settings?.maxFileSize || 10}"
              min="1"
              max="100"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Storage Provider</label>
            <select 
              name="storageProvider"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="local" ${settings?.storageProvider === "local" ? "selected" : ""}>Local Storage</option>
              <option value="cloudflare" ${settings?.storageProvider === "cloudflare" ? "selected" : ""}>Cloudflare R2</option>
              <option value="s3" ${settings?.storageProvider === "s3" ? "selected" : ""}>Amazon S3</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Backup Frequency</label>
            <select 
              name="backupFrequency"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily" ${settings?.backupFrequency === "daily" ? "selected" : ""}>Daily</option>
              <option value="weekly" ${settings?.backupFrequency === "weekly" ? "selected" : ""}>Weekly</option>
              <option value="monthly" ${settings?.backupFrequency === "monthly" ? "selected" : ""}>Monthly</option>
            </select>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Allowed File Types</label>
            <textarea 
              name="allowedFileTypes"
              rows="3"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jpg, jpeg, png, gif, pdf, docx"
            >${settings?.allowedFileTypes?.join(", ") || "jpg, jpeg, png, gif, pdf, docx"}</textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Backup Retention (days)</label>
            <input 
              type="number" 
              name="retentionPeriod"
              value="${settings?.retentionPeriod || 30}"
              min="7"
              max="365"
              class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div class="p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>
                <h5 class="text-sm font-medium text-green-300">Storage Status</h5>
                <p class="text-xs text-green-200 mt-1">
                  Current usage: 2.4 GB / 10 GB available
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function renderMigrationSettings(settings) {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">Database Migrations</h3>
        <p class="text-gray-300 mb-6">View and manage database migrations to keep your schema up to date.</p>
      </div>
      
      <!-- Migration Status Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="backdrop-blur-md bg-blue-500/20 rounded-lg border border-blue-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-300">Total Migrations</p>
              <p id="total-migrations" class="text-2xl font-bold text-white">${settings?.totalMigrations || "0"}</p>
            </div>
            <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
          </div>
        </div>
        
        <div class="backdrop-blur-md bg-green-500/20 rounded-lg border border-green-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-300">Applied</p>
              <p id="applied-migrations" class="text-2xl font-bold text-white">${settings?.appliedMigrations || "0"}</p>
            </div>
            <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        
        <div class="backdrop-blur-md bg-orange-500/20 rounded-lg border border-orange-500/30 p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-orange-300">Pending</p>
              <p id="pending-migrations" class="text-2xl font-bold text-white">${settings?.pendingMigrations || "0"}</p>
            </div>
            <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Migration Actions -->
      <div class="flex items-center space-x-4 mb-6">
        <button 
          onclick="window.refreshMigrationStatus()"
          class="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh Status
        </button>
        
        <button 
          onclick="window.runPendingMigrations()"
          id="run-migrations-btn"
          class="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          ${(settings?.pendingMigrations || 0) === 0 ? "disabled" : ""}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4.586a1 1 0 00.293.707l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1"/>
          </svg>
          Run Pending
        </button>

        <button 
          onclick="window.validateSchema()" 
          class="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Validate Schema
        </button>
      </div>

      <!-- Migrations List -->
      <div class="backdrop-blur-md bg-white/10 rounded-lg border border-white/20 overflow-hidden">
        <div class="px-6 py-4 border-b border-white/10">
          <h4 class="text-lg font-medium text-white">Migration History</h4>
          <p class="text-sm text-gray-300 mt-1">List of all available database migrations</p>
        </div>
        
        <div id="migrations-list" class="divide-y divide-white/10">
          <div class="px-6 py-8 text-center">
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
            <p class="text-gray-300">Loading migration status...</p>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Load migration status when tab becomes active
      if (typeof refreshMigrationStatus === 'undefined') {
        window.refreshMigrationStatus = async function() {
          try {
            const response = await fetch('/admin/settings/api/migrations/status');
            const result = await response.json();
            
            if (result.success) {
              updateMigrationUI(result.data);
            } else {
              console.error('Failed to refresh migration status');
            }
          } catch (error) {
            console.error('Error loading migration status:', error);
          }
        };

        window.runPendingMigrations = async function() {
          const btn = document.getElementById('run-migrations-btn');
          if (!btn || btn.disabled) return;

          showConfirmDialog('run-migrations-confirm');
        };

        window.performRunMigrations = async function() {
          const btn = document.getElementById('run-migrations-btn');
          if (!btn) return;

          btn.disabled = true;
          btn.innerHTML = 'Running...';

          try {
            const response = await fetch('/admin/api/migrations/run', {
              method: 'POST'
            });
            const result = await response.json();

            if (result.success) {
              alert(result.message);
              setTimeout(() => window.refreshMigrationStatus(), 1000);
            } else {
              alert(result.error || 'Failed to run migrations');
            }
          } catch (error) {
            alert('Error running migrations');
          } finally {
            btn.disabled = false;
            btn.innerHTML = 'Run Pending';
          }
        };

        window.validateSchema = async function() {
          try {
            const response = await fetch('/admin/api/migrations/validate');
            const result = await response.json();
            
            if (result.success) {
              if (result.data.valid) {
                alert('Database schema is valid');
              } else {
                alert(\`Schema validation failed: \${result.data.issues.join(', ')}\`);
              }
            } else {
              alert('Failed to validate schema');
            }
          } catch (error) {
            alert('Error validating schema');
          }
        };

        window.updateMigrationUI = function(data) {
          const totalEl = document.getElementById('total-migrations');
          const appliedEl = document.getElementById('applied-migrations');
          const pendingEl = document.getElementById('pending-migrations');
          
          if (totalEl) totalEl.textContent = data.totalMigrations;
          if (appliedEl) appliedEl.textContent = data.appliedMigrations;
          if (pendingEl) pendingEl.textContent = data.pendingMigrations;
          
          const runBtn = document.getElementById('run-migrations-btn');
          if (runBtn) {
            runBtn.disabled = data.pendingMigrations === 0;
          }
          
          // Update migrations list
          const listContainer = document.getElementById('migrations-list');
          if (listContainer && data.migrations && data.migrations.length > 0) {
            listContainer.innerHTML = data.migrations.map(migration => \`
              <div class="px-6 py-4 flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      \${migration.applied 
                        ? '<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                        : '<svg class="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
                      }
                    </div>
                    <div>
                      <h5 class="text-white font-medium">\${migration.name}</h5>
                      <p class="text-sm text-gray-300">\${migration.filename}</p>
                      \${migration.description ? \`<p class="text-xs text-gray-400 mt-1">\${migration.description}</p>\` : ''}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center space-x-4 text-sm">
                  \${migration.size ? \`<span class="text-gray-400">\${(migration.size / 1024).toFixed(1)} KB</span>\` : ''}
                  <span class="px-2 py-1 rounded-full text-xs font-medium \${
                    migration.applied 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }">
                    \${migration.applied ? 'Applied' : 'Pending'}
                  </span>
                  \${migration.appliedAt ? \`<span class="text-gray-400">\${new Date(migration.appliedAt).toLocaleDateString()}</span>\` : ''}
                </div>
              </div>
            \`).join('');
          }
        };
      }
      
      // Auto-load when tab becomes active
      if (currentTab === 'migrations') {
        setTimeout(refreshMigrationStatus, 500);
      }
    </script>
  `;
}
function renderDatabaseToolsSettings(settings) {
  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-lg/7 font-semibold text-zinc-950 dark:text-white">Database Tools</h3>
        <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Manage database operations including backup, restore, and maintenance.</p>
      </div>

      <!-- Database Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">Total Tables</p>
              <p id="total-tables" class="mt-2 text-3xl/8 font-semibold text-zinc-950 dark:text-white">${settings?.totalTables || "0"}</p>
            </div>
            <div class="rounded-lg bg-indigo-500/10 p-3">
              <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm/6 font-medium text-zinc-500 dark:text-zinc-400">Total Rows</p>
              <p id="total-rows" class="mt-2 text-3xl/8 font-semibold text-zinc-950 dark:text-white">${settings?.totalRows?.toLocaleString() || "0"}</p>
            </div>
            <div class="rounded-lg bg-green-500/10 p-3">
              <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Database Operations -->
      <div class="space-y-4">
        <!-- Safe Operations -->
        <div class="rounded-lg bg-white dark:bg-white/5 p-6 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10">
          <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white mb-4">Safe Operations</h4>
          <div class="flex flex-wrap gap-3">
            <button
              onclick="window.refreshDatabaseStats()"
              class="inline-flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 dark:text-white ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh Stats
            </button>

            <button
              onclick="window.createDatabaseBackup()"
              id="create-backup-btn"
              class="inline-flex items-center justify-center rounded-lg bg-indigo-600 dark:bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Create Backup
            </button>

            <button
              onclick="window.validateDatabase()"
              class="inline-flex items-center justify-center rounded-lg bg-green-600 dark:bg-green-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 dark:hover:bg-green-400 transition-colors shadow-sm"
            >
              <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Validate Database
            </button>
          </div>
        </div>
      </div>

      <!-- Tables List -->
      <div class="rounded-lg bg-white dark:bg-white/5 ring-1 ring-inset ring-zinc-950/10 dark:ring-white/10 overflow-hidden">
        <div class="px-6 py-4 border-b border-zinc-950/10 dark:border-white/10">
          <h4 class="text-base/7 font-semibold text-zinc-950 dark:text-white">Database Tables</h4>
          <p class="mt-1 text-sm/6 text-zinc-500 dark:text-zinc-400">Click on a table to view its data</p>
        </div>

        <div id="tables-list" class="p-6 space-y-2">
          <div class="text-center py-8">
            <svg class="w-12 h-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
            </svg>
            <p class="text-zinc-500 dark:text-zinc-400">Loading database statistics...</p>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="rounded-lg bg-red-50 dark:bg-red-950/20 p-6 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/30">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <div class="flex-1">
            <h4 class="text-base/7 font-semibold text-red-900 dark:text-red-400">Danger Zone</h4>
            <p class="mt-1 text-sm/6 text-red-700 dark:text-red-300">
              These operations are destructive and cannot be undone.
              <strong>Your admin account will be preserved</strong>, but all other data will be permanently deleted.
            </p>
            <div class="mt-4">
              <button
                onclick="window.truncateDatabase()"
                id="truncate-db-btn"
                class="inline-flex items-center justify-center rounded-lg bg-red-600 dark:bg-red-500 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 dark:hover:bg-red-400 transition-colors shadow-sm"
              >
                <svg class="-ml-0.5 mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Truncate All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// src/routes/admin-settings.ts
var adminSettingsRoutes = new hono.Hono();
adminSettingsRoutes.use("*", chunk4BJGEGX5_cjs.requireAuth());
function getMockSettings(user) {
  return {
    general: {
      siteName: "SonicJS AI",
      siteDescription: "A modern headless CMS powered by AI",
      adminEmail: user?.email || "admin@example.com",
      timezone: "UTC",
      language: "en",
      maintenanceMode: false
    },
    appearance: {
      theme: "dark",
      primaryColor: "#465FFF",
      logoUrl: "",
      favicon: "",
      customCSS: ""
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordRequirements: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: false
      },
      ipWhitelist: []
    },
    notifications: {
      emailNotifications: true,
      contentUpdates: true,
      systemAlerts: true,
      userRegistrations: false,
      emailFrequency: "immediate"
    },
    storage: {
      maxFileSize: 10,
      allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "docx"],
      storageProvider: "cloudflare",
      backupFrequency: "daily",
      retentionPeriod: 30
    },
    migrations: {
      totalMigrations: 0,
      appliedMigrations: 0,
      pendingMigrations: 0,
      lastApplied: void 0,
      migrations: []
    },
    databaseTools: {
      totalTables: 0,
      totalRows: 0,
      lastBackup: void 0,
      databaseSize: "0 MB",
      tables: []
    }
  };
}
adminSettingsRoutes.get("/", (c) => {
  return c.redirect("/admin/settings/general");
});
adminSettingsRoutes.get("/general", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "general",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/appearance", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "appearance",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/security", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "security",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/notifications", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "notifications",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/storage", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "storage",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/migrations", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "migrations",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/database-tools", (c) => {
  const user = c.get("user");
  const pageData = {
    user: user ? {
      name: user.email,
      email: user.email,
      role: user.role
    } : void 0,
    settings: getMockSettings(user),
    activeTab: "database-tools",
    version: c.get("appVersion")
  };
  return c.html(renderSettingsPage(pageData));
});
adminSettingsRoutes.get("/api/migrations/status", async (c) => {
  try {
    const db = c.env.DB;
    const migrationService = new chunkLEG4KNFP_cjs.MigrationService(db);
    const status = await migrationService.getMigrationStatus();
    return c.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Error fetching migration status:", error);
    return c.json({
      success: false,
      error: "Failed to fetch migration status"
    }, 500);
  }
});
adminSettingsRoutes.post("/api/migrations/run", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({
        success: false,
        error: "Unauthorized. Admin access required."
      }, 403);
    }
    const db = c.env.DB;
    const migrationService = new chunkLEG4KNFP_cjs.MigrationService(db);
    const result = await migrationService.runPendingMigrations();
    return c.json({
      success: result.success,
      message: result.message,
      applied: result.applied
    });
  } catch (error) {
    console.error("Error running migrations:", error);
    return c.json({
      success: false,
      error: "Failed to run migrations"
    }, 500);
  }
});
adminSettingsRoutes.get("/api/migrations/validate", async (c) => {
  try {
    const db = c.env.DB;
    const migrationService = new chunkLEG4KNFP_cjs.MigrationService(db);
    const validation = await migrationService.validateSchema();
    return c.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error("Error validating schema:", error);
    return c.json({
      success: false,
      error: "Failed to validate schema"
    }, 500);
  }
});
adminSettingsRoutes.get("/api/database-tools/stats", async (c) => {
  try {
    const db = c.env.DB;
    const tablesQuery = await db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_cf_%'
      ORDER BY name
    `).all();
    const tables = tablesQuery.results || [];
    let totalRows = 0;
    const tableStats = await Promise.all(
      tables.map(async (table) => {
        try {
          const countResult = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
          const rowCount = countResult?.count || 0;
          totalRows += rowCount;
          return {
            name: table.name,
            rowCount
          };
        } catch (error) {
          console.error(`Error counting rows in ${table.name}:`, error);
          return {
            name: table.name,
            rowCount: 0
          };
        }
      })
    );
    const estimatedSizeBytes = totalRows * 1024;
    const databaseSizeMB = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);
    return c.json({
      success: true,
      data: {
        totalTables: tables.length,
        totalRows,
        databaseSize: `${databaseSizeMB} MB (estimated)`,
        tables: tableStats
      }
    });
  } catch (error) {
    console.error("Error fetching database stats:", error);
    return c.json({
      success: false,
      error: "Failed to fetch database statistics"
    }, 500);
  }
});
adminSettingsRoutes.get("/api/database-tools/validate", async (c) => {
  try {
    const db = c.env.DB;
    const integrityResult = await db.prepare("PRAGMA integrity_check").first();
    const isValid = integrityResult?.integrity_check === "ok";
    return c.json({
      success: true,
      data: {
        valid: isValid,
        message: isValid ? "Database integrity check passed" : "Database integrity check failed"
      }
    });
  } catch (error) {
    console.error("Error validating database:", error);
    return c.json({
      success: false,
      error: "Failed to validate database"
    }, 500);
  }
});
adminSettingsRoutes.post("/api/database-tools/backup", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({
        success: false,
        error: "Unauthorized. Admin access required."
      }, 403);
    }
    return c.json({
      success: true,
      message: "Database backup feature coming soon. Use Cloudflare Dashboard for backups."
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return c.json({
      success: false,
      error: "Failed to create backup"
    }, 500);
  }
});
adminSettingsRoutes.post("/api/database-tools/truncate", async (c) => {
  try {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
      return c.json({
        success: false,
        error: "Unauthorized. Admin access required."
      }, 403);
    }
    const body = await c.req.json();
    const tablesToTruncate = body.tables || [];
    if (!Array.isArray(tablesToTruncate) || tablesToTruncate.length === 0) {
      return c.json({
        success: false,
        error: "No tables specified for truncation"
      }, 400);
    }
    const db = c.env.DB;
    const results = [];
    for (const tableName of tablesToTruncate) {
      try {
        await db.prepare(`DELETE FROM ${tableName}`).run();
        results.push({ table: tableName, success: true });
      } catch (error) {
        console.error(`Error truncating ${tableName}:`, error);
        results.push({ table: tableName, success: false, error: String(error) });
      }
    }
    return c.json({
      success: true,
      message: `Truncated ${results.filter((r) => r.success).length} of ${tablesToTruncate.length} tables`,
      results
    });
  } catch (error) {
    console.error("Error truncating tables:", error);
    return c.json({
      success: false,
      error: "Failed to truncate tables"
    }, 500);
  }
});
adminSettingsRoutes.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    return c.html(html.html`
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        Settings saved successfully!
        <script>
          setTimeout(() => {
            showNotification('Settings saved successfully!', 'success');
          }, 100);
        </script>
      </div>
    `);
  } catch (error) {
    console.error("Error saving settings:", error);
    return c.html(html.html`
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Failed to save settings. Please try again.
      </div>
    `);
  }
});

// src/routes/index.ts
var ROUTES_INFO = {
  message: "Core routes available",
  available: [
    "apiRoutes",
    "apiContentCrudRoutes",
    "apiMediaRoutes",
    "apiSystemRoutes",
    "adminApiRoutes",
    "authRoutes",
    "adminContentRoutes",
    "adminUsersRoutes",
    "adminMediaRoutes",
    "adminPluginRoutes",
    "adminLogsRoutes",
    "adminDesignRoutes",
    "adminCheckboxRoutes",
    "adminFAQRoutes",
    "adminTestimonialsRoutes",
    "adminCodeExamplesRoutes",
    "adminDashboardRoutes",
    "adminCollectionsRoutes",
    "adminSettingsRoutes"
  ],
  status: "Core package routes ready",
  reference: "https://github.com/sonicjs/sonicjs"
};

exports.ROUTES_INFO = ROUTES_INFO;
exports.adminCheckboxRoutes = adminCheckboxRoutes;
exports.adminCollectionsRoutes = adminCollectionsRoutes;
exports.adminDesignRoutes = adminDesignRoutes;
exports.adminLogsRoutes = adminLogsRoutes;
exports.adminMediaRoutes = adminMediaRoutes;
exports.adminPluginRoutes = adminPluginRoutes;
exports.adminSettingsRoutes = adminSettingsRoutes;
exports.admin_api_default = admin_api_default;
exports.admin_code_examples_default = admin_code_examples_default;
exports.admin_content_default = admin_content_default;
exports.admin_faq_default = admin_faq_default;
exports.admin_testimonials_default = admin_testimonials_default;
exports.api_content_crud_default = api_content_crud_default;
exports.api_default = api_default;
exports.api_media_default = api_media_default;
exports.api_system_default = api_system_default;
exports.auth_default = auth_default;
exports.router = router;
exports.userRoutes = userRoutes;
//# sourceMappingURL=chunk-4NHAAKEG.cjs.map
//# sourceMappingURL=chunk-4NHAAKEG.cjs.map