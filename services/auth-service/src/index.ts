import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*", credentials: true }));
app.use(express.json());

// const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
// app.use(limiter);

app.get("/health", (_req, res) => res.json({ status: "OK", service: "auth-service" }));

app.use("/auth", authRoutes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack || err);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server with proper error handling
const server = app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

// Handle port binding errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use!`);
    console.error(`   Please stop the process using this port or change the PORT environment variable.`);
    console.error(`   To find the process: lsof -ti:${PORT} or ss -tlnp | grep :${PORT}`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});
