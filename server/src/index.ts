/**
 * DreamStage Server Entry Point
 * Express application setup with all middleware and routes.
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { CLIENT_PUBLIC_ROOT } from './config/paths';
import { testConnection } from './db/client';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import adminRouter from './routes/admin.routes';
import eventsRoutes from './modules/events/events.routes';
import editorRoutes from './modules/editor/editor.routes';
import budgetRoutes from './modules/budget/budget.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import bookingRoutes from './modules/booking/booking.routes';
import venueSelectionRoutes from './modules/booking/venue-selection.routes';
import collaborationRoutes from './modules/collaboration/collaboration.routes';
import checklistRoutes from './modules/checklist/checklist.routes';
import publicRoutes from './modules/public/public.routes';
import requirementsRoutes from './modules/requirements/requirements.routes';
import inquiriesRoutes from './modules/inquiries/inquiries.routes';
import assetsPublicRoutes from './routes/assets.routes';
import aiRoutes from './modules/ai/ai.routes';

const app = express();

// ===========================================
// Security Middleware
// ===========================================
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// ===========================================
// Body Parsing
// ===========================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploaded venue images (written under client/public/uploads)
app.use('/uploads', express.static(path.join(CLIENT_PUBLIC_ROOT, 'uploads')));

// ===========================================
// Health Check
// ===========================================
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      environment: env.NODE_ENV,
    },
  });
});

// ===========================================
// API Routes
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api', assetsPublicRoutes);
app.use('/api/admin', adminRouter);
app.use('/api/events', eventsRoutes);
app.use('/api/events', budgetRoutes); // Budget is nested under events: /api/events/:eventId/budget
app.use('/api/events', checklistRoutes); // Checklist, milestones, timeline
app.use('/api/events', requirementsRoutes); // Requirements nested under events
app.use('/api/editor', editorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api', venueSelectionRoutes);
app.use('/api/shared', collaborationRoutes);
app.use('/api/requirements', requirementsRoutes); // Public requirements form
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/ai', aiRoutes);

// (touch) restart watcher

// ===========================================
// Error Handling
// ===========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ===========================================
// Start Server
// ===========================================
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database');
      process.exit(1);
    }
    
    console.log('✅ Database connected');

    // Start listening
    app.listen(env.PORT, () => {
      console.log(`✅ Server running on port ${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
