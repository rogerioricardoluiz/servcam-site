import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const { Pool } = pg;
const PORT = (process.env.PORT || 3000) as number;

// Resolve dirname since we are in ES module mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory fallback dataset for AI Studio preview / offline DB
const inMemoryStore: {
  neighborhoods: Array<{ id: string; name: string; description: string; iframe_url: string; lat: number; lng: number; integrator_id?: string | null; integrator_name?: string | null }>;
  profiles: Array<{ id: string; email: string; name: string; role: string; plan: string; approved: boolean; neighborhood_id: string | null; primary_neighborhood_id: string | null; secondary_neighborhood_id: string | null }>;
  cameras: Array<{ id: string; name: string; url: string; status: string; ip: string; coordinates: string; neighborhood_id: string | null }>;
  alerts: Array<{ id: string; title: string; message: string; type: string; created_at: string; created_by: string; neighborhood_id: string | null }>;
  payments: Array<{ id: string; user_id: string; amount: number; due_date: string; status: string; reference_month: string; receipt_base64: string | null; receipt_name: string | null; neighborhood_id: string | null }>;
  pricingConfig?: any;
} = {
  neighborhoods: [
    { id: 'c2df598b-b454-4e71-bacf-0e58bf5ef378', name: 'Sítio Beto', description: 'Arroio Corrente JAguaruna', iframe_url: '', lat: -27.5969, lng: -48.5495, integrator_id: 'bd06f01f-991b-4c1c-bdac-e6778b77ee66', integrator_name: 'Rogerio Integrador' },
    { id: 'hood-demo-1', name: 'Atalaia Central', description: 'Bairro central sob monitoramento integrado Atalaia.', iframe_url: 'about:blank', lat: -27.5969, lng: -48.5495, integrator_id: 'demo-integrator-id', integrator_name: 'Gestor Anderson' },
    { id: 'hood-demo-2', name: 'Jardim Alvorada', description: 'Bairro monitorado com câmeras de alta definição e ronda ativa.', iframe_url: 'about:blank', lat: -27.6012, lng: -48.5410, integrator_id: null, integrator_name: null },
    { id: 'hood-demo-3', name: 'Porto Seguro', description: 'Bairro litorâneo com monitoramento patrimonial ativo.', iframe_url: 'about:blank', lat: -27.5850, lng: -48.5600, integrator_id: null, integrator_name: null }
  ],
  profiles: [
    { id: 'bd06f01f-991b-4c1c-bdac-e6778b77ee66', email: 'rogerioricardoluizintegrador@gmail.com', name: 'Rogerio Integrador', role: 'INTEGRATOR', plan: 'PREMIUM', approved: true, neighborhood_id: 'c2df598b-b454-4e71-bacf-0e58bf5ef378', primary_neighborhood_id: 'c2df598b-b454-4e71-bacf-0e58bf5ef378', secondary_neighborhood_id: null },
    { id: 'demo-user-id', email: 'morador@atalaia.com', name: 'Mariana Costa', role: 'RESIDENT', plan: 'PREMIUM', approved: true, neighborhood_id: 'hood-demo-1', primary_neighborhood_id: 'hood-demo-1', secondary_neighborhood_id: 'hood-demo-2' },
    { id: 'demo-scr-id', email: 'scr@atalaia.com', name: 'Vigia Roberto', role: 'SCR', plan: 'PREMIUM', approved: true, neighborhood_id: 'hood-demo-1', primary_neighborhood_id: 'hood-demo-1', secondary_neighborhood_id: null },
    { id: 'demo-integrator-id', email: 'integrador@atalaia.com', name: 'Gestor Anderson', role: 'INTEGRATOR', plan: 'PREMIUM', approved: true, neighborhood_id: 'hood-demo-1', primary_neighborhood_id: 'hood-demo-1', secondary_neighborhood_id: null }
  ],
  cameras: [],
  alerts: [],
  payments: [],
  pricingConfig: null as any
};

// Supabase REST configuration for background server-side synchronization
const SUPABASE_REST_URL = (process.env.VITE_SUPABASE_URL || 'https://fbffgqccdqnvvtnxfqqo.supabase.co').replace(/\/rest\/v1\/?$/, '').trim();
const SUPABASE_REST_KEY = (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RgMR5VimEm-4k6_BVXDl5g_dK7PvgwN').trim();

async function syncNeighborhoodsFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/rest/v1/neighborhoods?select=*&order=name.asc`, {
      headers: {
        apikey: SUPABASE_REST_KEY,
        Authorization: `Bearer ${SUPABASE_REST_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const existingMap = new Map(inMemoryStore.neighborhoods.map(n => [n.id, n]));
        inMemoryStore.neighborhoods = data.map((n: any) => {
          const prev = existingMap.get(n.id);
          return {
            id: n.id,
            name: n.name,
            description: n.description || '',
            iframe_url: n.iframe_url || n.camera_url || '',
            lat: n.lat ?? -27.5969,
            lng: n.lng ?? -48.5495,
            integrator_id: n.integrator_id ?? prev?.integrator_id ?? null,
            integrator_name: n.integrator_name ?? prev?.integrator_name ?? null
          };
        });
        return inMemoryStore.neighborhoods;
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [Server] Supabase sync fallback:", err?.message || err);
  }
  return inMemoryStore.neighborhoods;
}

// Initial sync on server start
syncNeighborhoodsFromSupabase().catch(() => {});

async function syncCamerasFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/rest/v1/cameras?select=*`, {
      headers: {
        apikey: SUPABASE_REST_KEY,
        Authorization: `Bearer ${SUPABASE_REST_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        inMemoryStore.cameras = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          url: c.iframe_code || '',
          status: 'online',
          ip: '',
          coordinates: (c.lat && c.lng) ? `${c.lat}, ${c.lng}` : '',
          neighborhood_id: c.neighborhood_id || null
        }));
        return inMemoryStore.cameras;
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [Server] Supabase cameras sync fallback:", err?.message || err);
  }
  return inMemoryStore.cameras;
}

syncCamerasFromSupabase().catch(() => {});

// Initialize PostgreSQL Connection Pool
const rdsConfig = {
  host: process.env.RDS_HOST || "localhost",
  port: parseInt(process.env.RDS_PORT || "5432", 10),
  database: process.env.RDS_DATABASE || "atalaia_atalaia",
  user: process.env.RDS_USER || "atalaia_atalaiacloud",
  password: process.env.RDS_PASSWORD,
  ssl: process.env.RDS_SSL === "true"
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
};

let pool: pg.Pool | null = null;
let dbError: string | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.RDS_PASSWORD) {
      console.warn("⚠️ RDS_PASSWORD is not set. Using in-memory store for fallback.");
    }
    pool = new Pool(rdsConfig);
    pool.on("error", (err) => {
      console.error("❌ Unexpected error on idle RDS PostgreSQL client", err);
      dbError = err.message;
    });
  }
  return pool;
}

// Helper to safely execute query or use fallback
async function safeQuery<T>(queryFn: () => Promise<T>, fallbackFn: () => T): Promise<T> {
  if (!process.env.RDS_HOST || process.env.RDS_HOST === "localhost") {
    // Fast-path in-memory fallback if no RDS_HOST set
    return fallbackFn();
  }
  try {
    return await queryFn();
  } catch (err: any) {
    console.warn("⚠️ Database query warning, falling back to in-memory store:", err.message || err);
    return fallbackFn();
  }
}

// Function to initialize the database schema on AWS RDS
async function initializeDatabase() {
  if (!process.env.RDS_HOST || process.env.RDS_HOST === "localhost") {
    console.log("ℹ️ RDS_HOST not configured. Using in-memory state engine.");
    return;
  }
  try {
    const client = getPool();
    console.log("🔄 Initializing AWS RDS Database Schema...");

    // 1. Create Neighborhoods Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS neighborhoods (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        iframe_url TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        integrator_id VARCHAR(255),
        integrator_name VARCHAR(255)
      );
      ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS integrator_id VARCHAR(255);
      ALTER TABLE neighborhoods ADD COLUMN IF NOT EXISTS integrator_name VARCHAR(255);
      UPDATE neighborhoods SET integrator_id = 'bd06f01f-991b-4c1c-bdac-e6778b77ee66', integrator_name = 'Rogerio Integrador' WHERE id = 'c2df598b-b454-4e71-bacf-0e58bf5ef378' OR LOWER(name) LIKE '%beto%';
    `);

    // 2. Create Profiles Table (Multi-tenant ready, reference to neighborhood)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        role VARCHAR(50),
        plan VARCHAR(50),
        approved BOOLEAN DEFAULT FALSE,
        neighborhood_id VARCHAR(255),
        primary_neighborhood_id VARCHAR(255),
        secondary_neighborhood_id VARCHAR(255)
      );
    `);

    // 3. Create Cameras Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cameras (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT,
        status VARCHAR(50),
        ip VARCHAR(50),
        coordinates VARCHAR(100),
        neighborhood_id VARCHAR(255) REFERENCES neighborhoods(id) ON DELETE SET NULL
      );
    `);

    // 4. Create Alerts Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255),
        neighborhood_id VARCHAR(255) REFERENCES neighborhoods(id) ON DELETE SET NULL
      );
    `);

    // 5. Create Payments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES profiles(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2),
        due_date VARCHAR(50),
        status VARCHAR(50),
        reference_month VARCHAR(50),
        receipt_base64 TEXT,
        receipt_name VARCHAR(255),
        neighborhood_id VARCHAR(255) REFERENCES neighborhoods(id) ON DELETE SET NULL
      );
    `);

    // Seed default neighborhoods if empty
    const countRes = await client.query("SELECT COUNT(*) FROM neighborhoods");
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log("🌱 Seeding default neighborhoods to RDS...");
      await client.query(`
        INSERT INTO neighborhoods (id, name, description, iframe_url, lat, lng) VALUES
        ('hood-demo-1', 'Atalaia Central', 'Bairro central sob monitoramento integrado Atalaia.', 'about:blank', -27.5969, -48.5495),
        ('hood-demo-2', 'Jardim Alvorada', 'Bairro monitorado com câmeras de alta definição e ronda ativa.', 'about:blank', -27.6012, -48.5410),
        ('hood-demo-3', 'Porto Seguro', 'Bairro litorâneo com monitoramento patrimonial ativo.', 'about:blank', -27.5850, -48.5600);
      `);
    }

    // Seed default profiles if empty
    const profilesRes = await client.query("SELECT COUNT(*) FROM profiles");
    if (parseInt(profilesRes.rows[0].count, 10) === 0) {
      console.log("🌱 Seeding default profiles to RDS...");
      await client.query(`
        INSERT INTO profiles (id, email, name, role, plan, approved, neighborhood_id, primary_neighborhood_id, secondary_neighborhood_id) VALUES
        ('demo-user-id', 'morador@atalaia.com', 'Mariana Costa', 'RESIDENT', 'PREMIUM', true, 'hood-demo-1', 'hood-demo-1', 'hood-demo-2'),
        ('demo-scr-id', 'scr@atalaia.com', 'Vigia Roberto', 'SCR', 'PREMIUM', true, 'hood-demo-1', 'hood-demo-1', NULL),
        ('demo-integrator-id', 'integrador@atalaia.com', 'Gestor Anderson', 'INTEGRATOR', 'PREMIUM', true, 'hood-demo-1', 'hood-demo-1', NULL);
      `);
    }

    console.log("✅ AWS RDS Database initialized successfully!");
    dbError = null;
  } catch (err: any) {
    console.error("❌ Failed to initialize RDS Database:", err);
    dbError = err.message || String(err);
  }
}

async function startServer() {
  const app = express();

  // Parse JSON payloads
  app.use(express.json({ limit: "15mb" }));

  // Run DB initialization
  await initializeDatabase();

  // --- API ROUTES ---

  // --- SUPABASE PROXY (Bypasses browser CORS/tracking/iframe restrictions) ---
  app.all("/api/supabase-proxy", async (req, res) => {
    try {
      const target = req.query.target as string;
      if (!target || !target.startsWith("http")) {
        return res.status(400).json({ error: "Invalid target URL" });
      }
      const headers: Record<string, string> = {
        apikey: SUPABASE_REST_KEY,
        Authorization: (req.headers.authorization as string) || `Bearer ${SUPABASE_REST_KEY}`,
        "Content-Type": (req.headers["content-type"] as string) || "application/json"
      };
      if (req.headers.prefer) {
        headers["Prefer"] = req.headers.prefer as string;
      }
      const fetchOpts: RequestInit = {
        method: req.method,
        headers
      };
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        fetchOpts.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
      const proxyRes = await fetch(target, fetchOpts);
      const text = await proxyRes.text();
      res.status(proxyRes.status);
      proxyRes.headers.forEach((val, key) => {
        if (!["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())) {
          res.setHeader(key, val);
        }
      });
      res.send(text);
    } catch (err: any) {
      console.warn("⚠️ [Server] Supabase proxy error:", err?.message || err);
      res.status(200).json([]);
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      if (process.env.RDS_HOST && process.env.RDS_HOST !== "localhost") {
        const client = getPool();
        const dbRes = await client.query("SELECT NOW()");
        const tablesRes = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        return res.json({
          status: "ok",
          database: "connected",
          timestamp: dbRes.rows[0].now,
          rds_host: rdsConfig.host,
          tables: tablesRes.rows.map(t => t.table_name),
          error: dbError
        });
      }
      res.json({
        status: "ok",
        database: "in-memory",
        timestamp: new Date().toISOString(),
        rds_host: rdsConfig.host,
        tables: ["neighborhoods", "profiles", "cameras", "alerts", "payments"],
        error: null
      });
    } catch (err: any) {
      res.json({
        status: "ok",
        database: "in-memory (fallback)",
        rds_host: rdsConfig.host,
        message: err.message || String(err),
        error: dbError
      });
    }
  });

  // Database schema setup trigger
  app.post("/api/setup-db", async (req, res) => {
    await initializeDatabase();
    if (dbError) {
      res.status(500).json({ status: "error", message: dbError });
    } else {
      res.json({ status: "success", message: "AWS RDS database initialized/migrated successfully" });
    }
  });

  // --- NEIGHBORHOODS API ---
  app.get("/api/neighborhoods", async (req, res) => {
    const data = await safeQuery(
      async () => {
        const client = getPool();
        const { rows } = await client.query("SELECT * FROM neighborhoods ORDER BY name ASC");
        return rows;
      },
      () => {
        if (inMemoryStore.neighborhoods.length === 3 && inMemoryStore.neighborhoods[0].id === 'hood-demo-1') {
          syncNeighborhoodsFromSupabase().catch(() => {});
        }
        return inMemoryStore.neighborhoods;
      }
    );
    res.json(data);
  });

  // --- PRICING CALCULATOR CONFIG API ---
  app.get("/api/pricing-config", async (req, res) => {
    try {
      if (inMemoryStore.pricingConfig) {
        return res.json(inMemoryStore.pricingConfig);
      }
      // Try to fetch from Supabase system_settings
      const sbRes = await fetch(`${SUPABASE_REST_URL}/rest/v1/system_settings?key=eq.pricing_calculator_config&select=value`, {
        headers: {
          apikey: SUPABASE_REST_KEY,
          Authorization: `Bearer ${SUPABASE_REST_KEY}`
        }
      });
      if (sbRes.ok) {
        const rows = await sbRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
          const parsed = JSON.parse(rows[0].value);
          inMemoryStore.pricingConfig = parsed;
          return res.json(parsed);
        }
      }
    } catch (err: any) {
      console.warn("⚠️ [Server] Pricing config read fallback:", err?.message || err);
    }
    res.json(inMemoryStore.pricingConfig || null);
  });

  app.post("/api/pricing-config", async (req, res) => {
    try {
      const config = req.body;
      if (!config) {
        return res.status(400).json({ error: "Missing config body" });
      }
      inMemoryStore.pricingConfig = config;
      // Sync to Supabase in background
      fetch(`${SUPABASE_REST_URL}/rest/v1/system_settings`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_REST_KEY,
          Authorization: `Bearer ${SUPABASE_REST_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          key: "pricing_calculator_config",
          value: JSON.stringify(config),
          updated_at: new Date().toISOString()
        })
      }).catch((e) => console.warn("⚠️ [Server] Supabase pricing config sync notice:", e?.message || e));

      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save pricing config" });
    }
  });

  app.post("/api/neighborhoods", async (req, res) => {
    const { id, name, description, iframe_url, lat, lng, integrator_id, integrator_name } = req.body;
    const safeId = id || `hood-${Date.now()}`;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query(
          `INSERT INTO neighborhoods (id, name, description, iframe_url, lat, lng, integrator_id, integrator_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET 
             name = $2, 
             description = $3, 
             iframe_url = $4, 
             lat = $5, 
             lng = $6,
             integrator_id = COALESCE($7, neighborhoods.integrator_id),
             integrator_name = COALESCE($8, neighborhoods.integrator_name)`,
          [safeId, name, description || "", iframe_url || "", lat || -27.5969, lng || -48.5495, integrator_id || null, integrator_name || null]
        );
      },
      () => {
        const idx = inMemoryStore.neighborhoods.findIndex(n => n.id === safeId);
        const prev = idx >= 0 ? inMemoryStore.neighborhoods[idx] : undefined;
        const item = {
          id: safeId,
          name: name ?? prev?.name ?? "",
          description: description !== undefined ? description : (prev?.description || ""),
          iframe_url: iframe_url !== undefined ? iframe_url : (prev?.iframe_url || ""),
          lat: lat || prev?.lat || -27.5969,
          lng: lng || prev?.lng || -48.5495,
          integrator_id: integrator_id !== undefined ? (integrator_id || null) : (prev?.integrator_id ?? null),
          integrator_name: integrator_name !== undefined ? (integrator_name || null) : (prev?.integrator_name ?? null)
        };
        if (idx >= 0) inMemoryStore.neighborhoods[idx] = item;
        else inMemoryStore.neighborhoods.push(item);
      }
    );
    res.json({ success: true, id: safeId });
  });

  app.delete("/api/neighborhoods/:id", async (req, res) => {
    const { id } = req.params;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query("DELETE FROM neighborhoods WHERE id = $1", [id]);
      },
      () => {
        inMemoryStore.neighborhoods = inMemoryStore.neighborhoods.filter(n => n.id !== id);
      }
    );
    res.json({ success: true });
  });

  // --- USERS / PROFILES API ---
  app.get("/api/users", async (req, res) => {
    const { neighborhoodId } = req.query;
    const data = await safeQuery(
      async () => {
        const client = getPool();
        let query = "SELECT * FROM profiles";
        const params: any[] = [];
        if (neighborhoodId) {
          query += " WHERE neighborhood_id = $1 OR secondary_neighborhood_id = $1";
          params.push(neighborhoodId);
        }
        query += " ORDER BY name ASC";
        const { rows } = await client.query(query, params);
        return rows;
      },
      () => {
        if (!neighborhoodId) return inMemoryStore.profiles;
        return inMemoryStore.profiles.filter(p => p.neighborhood_id === neighborhoodId || p.secondary_neighborhood_id === neighborhoodId);
      }
    );
    res.json(data);
  });

  app.post("/api/users/upsert", async (req, res) => {
    const { id, email, name, role, plan, approved, neighborhoodId, primaryNeighborhoodId, secondaryNeighborhoodId } = req.body;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query(
          `INSERT INTO profiles (id, email, name, role, plan, approved, neighborhood_id, primary_neighborhood_id, secondary_neighborhood_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET 
             email = EXCLUDED.email, 
             name = EXCLUDED.name, 
             role = EXCLUDED.role, 
             plan = EXCLUDED.plan, 
             approved = EXCLUDED.approved, 
             neighborhood_id = EXCLUDED.neighborhood_id, 
             primary_neighborhood_id = EXCLUDED.primary_neighborhood_id, 
             secondary_neighborhood_id = EXCLUDED.secondary_neighborhood_id`,
          [
            id, 
            email, 
            name, 
            role || "RESIDENT", 
            plan || "FREE", 
            approved ?? false, 
            neighborhoodId || null, 
            primaryNeighborhoodId || neighborhoodId || null, 
            secondaryNeighborhoodId || null
          ]
        );
      },
      () => {
        const idx = inMemoryStore.profiles.findIndex(p => p.id === id);
        const item = {
          id,
          email,
          name,
          role: role || "RESIDENT",
          plan: plan || "FREE",
          approved: approved ?? false,
          neighborhood_id: neighborhoodId || null,
          primary_neighborhood_id: primaryNeighborhoodId || neighborhoodId || null,
          secondary_neighborhood_id: secondaryNeighborhoodId || null
        };
        if (idx >= 0) inMemoryStore.profiles[idx] = item;
        else inMemoryStore.profiles.push(item);
      }
    );
    res.json({ success: true });
  });

  // --- ALERTS API ---
  app.get("/api/alerts", async (req, res) => {
    const { neighborhoodId } = req.query;
    const data = await safeQuery(
      async () => {
        const client = getPool();
        let query = "SELECT * FROM alerts";
        const params: any[] = [];
        if (neighborhoodId) {
          query += " WHERE neighborhood_id = $1";
          params.push(neighborhoodId);
        }
        query += " ORDER BY created_at DESC LIMIT 50";
        const { rows } = await client.query(query, params);
        return rows;
      },
      () => {
        if (!neighborhoodId) return inMemoryStore.alerts;
        return inMemoryStore.alerts.filter(a => a.neighborhood_id === neighborhoodId);
      }
    );
    res.json(data);
  });

  app.post("/api/alerts", async (req, res) => {
    const { id, title, message, type, neighborhood_id, created_by } = req.body;
    const safeId = id || `alert-${Date.now()}`;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query(
          `INSERT INTO alerts (id, title, message, type, neighborhood_id, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [safeId, title, message || "", type || "INFO", neighborhood_id, created_by || "system"]
        );
      },
      () => {
        inMemoryStore.alerts.unshift({
          id: safeId,
          title,
          message: message || "",
          type: type || "INFO",
          created_at: new Date().toISOString(),
          created_by: created_by || "system",
          neighborhood_id: neighborhood_id || null
        });
      }
    );
    res.json({ success: true, id: safeId });
  });

  // --- CAMERAS API ---
  app.get("/api/cameras", async (req, res) => {
    const { neighborhoodId } = req.query;
    const data = await safeQuery(
      async () => {
        const client = getPool();
        let query = "SELECT * FROM cameras";
        const params: any[] = [];
        if (neighborhoodId) {
          query += " WHERE neighborhood_id = $1";
          params.push(neighborhoodId);
        }
        const { rows } = await client.query(query, params);
        return rows;
      },
      () => {
        if (inMemoryStore.cameras.length === 0) {
          syncCamerasFromSupabase().catch(() => {});
        }
        if (!neighborhoodId) return inMemoryStore.cameras;
        return inMemoryStore.cameras.filter(c => c.neighborhood_id === neighborhoodId);
      }
    );
    res.json(data);
  });

  app.post("/api/cameras", async (req, res) => {
    const { id, name, url, status, ip, coordinates, neighborhood_id } = req.body;
    const safeId = id || `cam-${Date.now()}`;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query(
          `INSERT INTO cameras (id, name, url, status, ip, coordinates, neighborhood_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = $2, url = $3, status = $4, ip = $5, coordinates = $6, neighborhood_id = $7`,
          [safeId, name, url || "", status || "ACTIVE", ip || "", coordinates || "", neighborhood_id]
        );
      },
      () => {
        const idx = inMemoryStore.cameras.findIndex(c => c.id === safeId);
        const item = { id: safeId, name, url: url || "", status: status || "ACTIVE", ip: ip || "", coordinates: coordinates || "", neighborhood_id: neighborhood_id || null };
        if (idx >= 0) inMemoryStore.cameras[idx] = item;
        else inMemoryStore.cameras.push(item);
      }
    );
    res.json({ success: true, id: safeId });
  });

  // --- PAYMENTS API ---
  app.get("/api/payments", async (req, res) => {
    const data = await safeQuery(
      async () => {
        const client = getPool();
        const { rows } = await client.query(`
          SELECT p.*, pr.name as user_name, pr.plan as user_plan
          FROM payments p
          LEFT JOIN profiles pr ON p.user_id = pr.id
          ORDER BY p.due_date DESC
        `);
        return rows.map(r => ({
          id: r.id,
          user_id: r.user_id,
          amount: parseFloat(r.amount),
          due_date: r.due_date,
          status: r.status,
          reference_month: r.reference_month,
          receipt_base64: r.receipt_base64,
          receipt_name: r.receipt_name,
          profiles: {
            name: r.user_name || "Morador",
            plan: r.user_plan || "PREMIUM",
            neighborhood_id: r.neighborhood_id
          }
        }));
      },
      () => {
        return inMemoryStore.payments.map(p => {
          const user = inMemoryStore.profiles.find(pr => pr.id === p.user_id);
          return {
            ...p,
            profiles: {
              name: user?.name || "Morador",
              plan: user?.plan || "PREMIUM",
              neighborhood_id: p.neighborhood_id
            }
          };
        });
      }
    );
    res.json(data);
  });

  app.post("/api/payments", async (req, res) => {
    const { id, user_id, amount, due_date, status, reference_month, neighborhood_id, receipt_base64, receipt_name } = req.body;
    const safeId = id || `pay-${Date.now()}`;
    await safeQuery(
      async () => {
        const client = getPool();
        await client.query(
          `INSERT INTO payments (id, user_id, amount, due_date, status, reference_month, neighborhood_id, receipt_base64, receipt_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET 
             user_id = EXCLUDED.user_id, 
             amount = EXCLUDED.amount, 
             due_date = EXCLUDED.due_date, 
             status = EXCLUDED.status, 
             reference_month = EXCLUDED.reference_month, 
             neighborhood_id = EXCLUDED.neighborhood_id,
             receipt_base64 = EXCLUDED.receipt_base64,
             receipt_name = EXCLUDED.receipt_name`,
          [safeId, user_id, amount, due_date, status || "PENDING", reference_month, neighborhood_id || null, receipt_base64 || null, receipt_name || null]
        );
      },
      () => {
        const idx = inMemoryStore.payments.findIndex(p => p.id === safeId);
        const item = {
          id: safeId,
          user_id,
          amount: typeof amount === 'number' ? amount : parseFloat(amount),
          due_date,
          status: status || "PENDING",
          reference_month,
          neighborhood_id: neighborhood_id || null,
          receipt_base64: receipt_base64 || null,
          receipt_name: receipt_name || null
        };
        if (idx >= 0) inMemoryStore.payments[idx] = item;
        else inMemoryStore.payments.push(item);
      }
    );
    res.json({ success: true, id: safeId });
  });

  app.put("/api/payments/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status, receipt_base64, receipt_name } = req.body;
    await safeQuery(
      async () => {
        const client = getPool();
        let query = "UPDATE payments SET status = $1";
        const params: any[] = [status];
        if (receipt_base64 !== undefined) {
          query += ", receipt_base64 = $2, receipt_name = $3";
          params.push(receipt_base64, receipt_name || null);
        }
        query += ` WHERE id = $${params.length + 1}`;
        params.push(id);
        await client.query(query, params);
      },
      () => {
        const pay = inMemoryStore.payments.find(p => p.id === id);
        if (pay) {
          pay.status = status;
          if (receipt_base64 !== undefined) {
            pay.receipt_base64 = receipt_base64;
            pay.receipt_name = receipt_name || null;
          }
        }
      }
    );
    res.json({ success: true });
  });

  // --- MERCADO PAGO CHECKOUT PREFERENCE API ---
  app.post("/api/mercadopago/create-preference", async (req, res) => {
    try {
      const {
        planId,
        cameras,
        retentionDays,
        amount,
        title,
        description,
        payer,
        couponCode,
        metadata,
        mpAccessToken
      } = req.body;

      // 1. Resolve Access Token: Request body -> Env var -> Supabase system_settings
      let token = mpAccessToken || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '';

      if (!token) {
        try {
          const sbRes = await fetch(`${SUPABASE_REST_URL}/rest/v1/system_settings?key=eq.mercado_pago_access_token&select=value`, {
            headers: {
              apikey: SUPABASE_REST_KEY,
              Authorization: `Bearer ${SUPABASE_REST_KEY}`
            }
          });
          if (sbRes.ok) {
            const rows = await sbRes.json();
            if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
              token = rows[0].value.trim();
            }
          }
        } catch (tokenErr) {
          console.warn("⚠️ [Server] Failed fetching MP token from Supabase:", tokenErr);
        }
      }

      // Compute pricing description
      const camCount = cameras ? Number(cameras) : 1;
      let finalPrice = amount ? Number(amount) : 0;
      if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
        // Fallback to official fixed table pricing:
        // 0-10: 24.90, 11-20: 22.90, 21-30: 20.90, 31-50: 18.90, 51+: 15.90
        let unitRate = 24.90;
        if (camCount <= 10) unitRate = 24.90;
        else if (camCount <= 20) unitRate = 22.90;
        else if (camCount <= 30) unitRate = 20.90;
        else if (camCount <= 50) unitRate = 18.90;
        else unitRate = 15.90;
        finalPrice = camCount * unitRate;
      }

      const planTitle = title || (cameras 
        ? `ServCam - Monitoramento ${camCount} ${camCount === 1 ? 'Câmera' : 'Câmeras'} em Nuvem` 
        : `ServCam - Assinatura Plataforma de Segurança`);
      const planDesc = description || (cameras 
        ? `Gravação contínua em nuvem 24/7 (3 dias inclusos) - ${camCount} câmeras ativas.` 
        : `Acesso e monitoramento 24/7 ServCam.`);

      // Compute origin for back_urls
      const host = req.get('origin') || req.get('referer') || `http://localhost:${PORT}`;
      const cleanOrigin = host.replace(/\/+$/, '');
      const returnSuccess = `${cleanOrigin}/#/payment-success?plan=${encodeURIComponent(planId || 'CUSTOM')}&status=approved${couponCode ? `&coupon=${couponCode}` : ''}`;
      const returnFailure = `${cleanOrigin}/#/payment-success?status=failure`;
      const returnPending = `${cleanOrigin}/#/payment-success?status=pending`;

      // If we have a Mercado Pago token, invoke Mercado Pago Preferences API
      if (token && (token.startsWith('TEST-') || token.startsWith('APP_USR-'))) {
        try {
          const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              items: [
                {
                  id: String(planId || 'servcam_cameras'),
                  title: planTitle,
                  description: planDesc,
                  quantity: 1,
                  unit_price: parseFloat(finalPrice.toFixed(2)),
                  currency_id: 'BRL'
                }
              ],
              payer: {
                name: payer?.name || 'Cliente ServCam',
                email: payer?.email || 'cliente@servcam.com.br',
                phone: payer?.phone ? { number: String(payer.phone).replace(/\D/g, '') } : undefined
              },
              back_urls: {
                success: returnSuccess,
                failure: returnFailure,
                pending: returnPending
              },
              auto_return: 'approved',
              statement_descriptor: 'SERVCAM',
              external_reference: `servcam_${Date.now()}_${(payer?.email || 'user').replace(/[^a-zA-Z0-9]/g, '')}`,
              metadata: {
                planId: planId || 'CUSTOM',
                cameras: camCount,
                retentionDays: retentionDays || 3,
                source: 'servcam-web',
                couponCode: couponCode || null,
                ...(metadata || {})
              }
            })
          });

          if (mpResponse.ok) {
            const prefData = await mpResponse.json();
            const checkoutUrl = prefData.init_point || prefData.sandbox_init_point;
            if (checkoutUrl) {
              return res.json({
                success: true,
                init_point: checkoutUrl,
                preference_id: prefData.id,
                sandbox: !!prefData.sandbox_init_point && token.startsWith('TEST-')
              });
            }
          } else {
            const errBody = await mpResponse.text();
            console.warn("⚠️ [Server] Mercado Pago API preference creation returned:", errBody);
          }
        } catch (mpErr: any) {
          console.error("❌ [Server] Error calling Mercado Pago API:", mpErr?.message || mpErr);
        }
      }

      // Fallback checkout URL if token not set or API error:
      const fallbackHost = req.get('origin') || req.get('referer') || `http://localhost:${PORT}`;
      const fallbackCleanOrigin = fallbackHost.replace(/\/+$/, '');
      const sandboxCheckoutUrl = `${fallbackCleanOrigin}/#/payment-checkout?cameras=${camCount}&amount=${finalPrice}&plan=${planId || 'CUSTOM'}&coupon=${couponCode || ''}`;
      
      return res.json({
        success: true,
        init_point: sandboxCheckoutUrl,
        preference_id: `pref_servcam_${camCount}cams_${Date.now()}`,
        fallback: true,
        message: "Mercado Pago Sandbox Checkout URL generated"
      });
    } catch (err: any) {
      console.error("❌ [Server] Fatal error creating Mercado Pago preference:", err);
      res.status(500).json({ error: err.message || "Failed to create preference" });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SaaS ATALAIA Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
