import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
// @ts-ignore
import axios from 'axios';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

// Google Fit OAuth Configuration
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

// Helper to get redirect URI
const getRedirectUri = (req: express.Request) => {
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
  return `${origin}/auth/google/callback`;
};

// 1. Get Google Auth URL
app.get('/api/auth/google/url', (req, res) => {
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
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

    // In a real app, you'd store the refresh token in a database linked to the user.
    // For this demo, we'll send it back to the client to store in Firestore.
    
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

// 3. Sync Health Data from Google Fit
app.post('/api/health/sync', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  try {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTimeMillis = startOfDay.getTime();
    const endTimeMillis = now;

    // Fetch Steps
    const stepsResponse = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{ dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps' }],
        bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
        startTimeMillis,
        endTimeMillis
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Fetch Calories
    const caloriesResponse = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{ dataSourceId: 'derived:com.google.calories.burned.delta:com.google.android.gms:merge_calories_burned' }],
        bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
        startTimeMillis,
        endTimeMillis
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Fetch Water
    const waterResponse = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{ dataTypeName: 'com.google.hydration' }],
        bucketByTime: { durationMillis: endTimeMillis - startTimeMillis },
        startTimeMillis,
        endTimeMillis
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // Process data
    const steps = stepsResponse.data.bucket[0]?.dataset[0]?.point[0]?.value[0]?.intVal || 0;
    const calories = Math.round(caloriesResponse.data.bucket[0]?.dataset[0]?.point[0]?.value[0]?.fpVal || 0);
    const water = Math.round((waterResponse.data.bucket[0]?.dataset[0]?.point[0]?.value[0]?.fpVal || 0) * 100) / 100;

    res.json({ steps, calories, water });
  } catch (error: any) {
    console.error('Sync Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Vite middleware for development
async function startServer() {
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
