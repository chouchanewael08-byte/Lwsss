import express from 'express';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './src/config/database';
import { seedDatabase } from './src/seed';
import miniappRouter from './src/routes/miniapp';

async function startServer() {
  // First, establish database connection
  await connectDB();
  
  // Seed database if empty
  await seedDatabase();

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Cross-Origin Resource Sharing (CORS) custom headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-telegram-init-data');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Zero-dependency Elegant rolling window Rate Limiter
  const ipLimits = new Map<string, { count: number; resetTime: number }>();
  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.header('x-forwarded-for') || 'unknown-client';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute limit window
    const maxRequests = 120; // max 120 requests/min

    const limit = ipLimits.get(ip);
    if (!limit) {
      ipLimits.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (now > limit.resetTime) {
      limit.count = 1;
      limit.resetTime = now + windowMs;
      return next();
    }

    limit.count++;
    if (limit.count > maxRequests) {
      return res.status(429).json({ error: 'عذراً! لقد تجاوزت الحد الأقصى للمعدل الإرشادي، تفضل بالمحاولة بعد دقيقة واحدة.' });
    }
    next();
  };

  // Mount APIs
  app.use('/api', rateLimiter, miniappRouter);

  // Serve Frontend with Vite configuration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Set up http server and socket.io
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  // Share socket.io instance globally with express routes
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log(`[SkyMarket Socket] Sockets client connected: ${socket.id}`);

    // Allow user to join room based on their telegram ID so they only get their updates
    socket.on('join_user', (userId: string) => {
      socket.join(userId);
      console.log(`[SkyMarket Socket] Client ${socket.id} joined personal user channel: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SkyMarket Socket] Sockets client disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkyMarket Server] Running successfully on port ${PORT}`);
  });
}

startServer();
