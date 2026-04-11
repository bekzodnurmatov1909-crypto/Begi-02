import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Logging middleware for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // Health Connect (Google Fit) OAuth Configuration
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const SCOPES = [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.nutrition.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
    'openid',
    'profile',
    'email'
  ];

  // Helper to get redirect URI with proxy support
  const getRedirectUri = (req: express.Request) => {
    // Prefer APP_URL from environment if available (AI Studio injects this)
    if (process.env.APP_URL) {
      const baseUrl = process.env.APP_URL.endsWith('/') 
        ? process.env.APP_URL.slice(0, -1) 
        : process.env.APP_URL;
      return `${baseUrl}/auth/google/callback`;
    }

    const host = req.get('host');
    // Force https for production/cloud environments, fallback to req.protocol for local
    const protocol = req.headers['x-forwarded-proto'] || (host?.includes('localhost') ? 'http' : 'https');
    return `${protocol}://${host}/auth/google/callback`;
  };

  // 0. Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 1. Get Google Auth URL
  app.get('/api/auth/google/url', (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID is not configured in Secrets' });
    }
    
    const redirectUri = getRedirectUri(req);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // 2. Google Auth Callback
  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req);

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const { access_token, refresh_token, expires_in } = response.data;
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify({ access_token, refresh_token, expires_in })} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Google Auth Error:', error.response?.data || error.message);
      res.status(500).send('Authentication failed');
    }
  });

  // 2.1 Refresh Google Token
  app.post('/api/auth/google/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('Token Refresh Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ error: 'Failed to refresh token' });
    }
  });

  // 3. Sync Health Data from Health Connect (Google Fit)
  app.post('/api/health/sync', async (req, res) => {
    const { accessToken, startTimeMillis: clientStart, endTimeMillis: clientEnd } = req.body;

    if (!accessToken) {
      return res.status(401).json({ error: 'Missing access token' });
    }

    // Use client provided time range or fallback to server-side "today"
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const startTimeMillis = clientStart || startOfDay.getTime();
    const endTimeMillis = clientEnd || now;

    // Helper to fetch aggregate data
    const fetchAggregate = async (aggregateBy: any) => {
      const dataTypeName = aggregateBy[0].dataTypeName || aggregateBy[0].dataSourceId;
      try {
        const response = await axios.post(
          'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
          {
            aggregateBy,
            bucketByTime: { durationMillis: Math.max(1000, endTimeMillis - startTimeMillis) },
            startTimeMillis,
            endTimeMillis
          },
          { 
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 30000 // Increased to 30 second timeout
          }
        );
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;
        
        // Specifically silence all errors for burned.delta as it's often restricted or unavailable
        if (dataTypeName === 'com.google.calories.burned.delta') {
          return null; 
        }

        if (status === 403) {
          console.warn(`[Health Connect Permission] Denied for ${dataTypeName}`);
        } else if (error.code === 'ECONNABORTED') {
          console.error(`[Health Connect Timeout] for ${dataTypeName}`);
        } else {
          const details = error.response?.data || error.message;
          console.error(`[Health Connect API Error] for ${dataTypeName}:`, JSON.stringify(details, null, 2));
        }
        return null;
      }
    };

    try {
      // Fetch all data in parallel
      const [stepsData, totalCaloriesData, activityCaloriesData, waterData, sleepData, distanceData, activeMinutesData] = await Promise.all([
        fetchAggregate([{ dataTypeName: 'com.google.step_count.delta' }]),
        fetchAggregate([{ dataTypeName: 'com.google.calories.expended' }]),
        fetchAggregate([{ dataTypeName: 'com.google.calories.burned.delta' }]),
        fetchAggregate([{ dataTypeName: 'com.google.hydration' }]),
        fetchAggregate([{ dataTypeName: 'com.google.sleep.segment' }]),
        fetchAggregate([{ dataTypeName: 'com.google.distance.delta' }]),
        fetchAggregate([{ dataTypeName: 'com.google.active_minutes' }])
      ]);

      // Process results safely
      const steps = stepsData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      const totalCalories = Math.round(totalCaloriesData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0);
      
      // Activity calories: if burned.delta fails, we try to estimate from total or just use 0
      let activityCalories = Math.round(activityCaloriesData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0);
      
      // If activityCalories is 0 but total is high, it might be that burned.delta failed
      // We don't want to fake it too much, but let's at least ensure we don't have negative values
      if (activityCalories === 0 && totalCalories > 0 && !activityCaloriesData) {
        // Optional: estimate activity as 20% of total if we can't get it? 
        // No, better to stay accurate to what API says.
      }

      const water = Math.round((waterData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0) * 100) / 100;
      const distance = Math.round((distanceData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0) * 100) / 1000; // Convert meters to km
      const activeMinutes = activeMinutesData?.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      
      // Calculate sleep duration in hours
      let sleepHours = 0;
      if (sleepData?.bucket?.[0]?.dataset?.[0]?.point) {
        const points = sleepData.bucket[0].dataset[0].point;
        let totalMillis = 0;
        points.forEach((p: any) => {
          // Value[0] is the sleep type. 5 is 'awake'.
          const sleepType = p.value[0]?.intVal;
          if (sleepType !== 5) {
            const duration = (p.endTimeNanos - p.startTimeNanos) / 1000000;
            totalMillis += duration;
          }
        });
        sleepHours = Math.round((totalMillis / (1000 * 60 * 60)) * 10) / 10;
      }

      res.json({ 
        steps, 
        calories: totalCalories, 
        activityCalories, 
        water, 
        sleep: sleepHours,
        distance,
        activeMinutes
      });
    } catch (error: any) {
      console.error('General Sync Error:', error.message);
      res.status(500).json({ error: 'Failed to process health data' });
    }
  });

  // API Fallback - ensures missing API routes return JSON, not HTML
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler - ensures all server errors return JSON
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: err.message,
      path: req.path
    });
  });

  // Vite middleware for development
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
