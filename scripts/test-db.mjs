import { config } from "dotenv";
import pg from "pg";

config({ override: true });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

pool.query("SELECT 1")
  .then(() => { console.log("Conexión OK"); pool.end(); })
  .catch((e) => { console.log("Error:", e.message); pool.end(); });
