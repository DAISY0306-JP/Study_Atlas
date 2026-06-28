import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'study-atlas-api' });
});

app.get('/study-logs', async (req, res) => {
  const { user_id } = req.query;

  const query = supabase
    .from('study_logs')
    .select('*, materials(name), skills(name), subjects(name)')
    .order('studied_at', { ascending: false });

  if (user_id) query.eq('user_id', user_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/study-logs', async (req, res) => {
  const { data, error } = await supabase
    .from('study_logs')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/study-logs/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('study_logs').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Study Atlas API running on port ${port}`);
});
