import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing access token' });

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired token' });

  req.userId = data.user.id;
  req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  next();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'study-atlas-api' });
});

app.get('/study-logs', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('study_logs')
    .select('*, materials(name), skills(name), subjects(name)')
    .order('studied_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/study-logs', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('study_logs')
    .insert({ ...req.body, user_id: req.userId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/study-logs/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await req.supabase.from('study_logs').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Study Atlas API running on port ${port}`);
});
