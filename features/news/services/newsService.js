// features/news/services/newsService.js
// NEWS FEATURE — Data layer
// GOLDEN RULE 3: Only this file talks to the news table
// No other feature should ever import this file

import { supabase } from '../../../core/database/index';

// ─── Fetch all news ────────────────────────────
export async function getNews(category = null) {
  let query = supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ─── Fetch single news article ─────────────────
export async function getNewsById(id) {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function assertAdmin(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || data?.role !== 'admin') throw new Error('Unauthorized: admin access required');
}

// ─── Create news article (admin only) ─────────
export async function createNews(article, userId) {
  await assertAdmin(userId);
  const { data, error } = await supabase
    .from('news')
    .insert(article)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Delete news article (admin only) ─────────
export async function deleteNews(id, userId) {
  await assertAdmin(userId);
  const { error } = await supabase
    .from('news')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}