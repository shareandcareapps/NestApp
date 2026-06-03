// core/database/index.js
// CORE FILE — DO NOT MODIFY STRUCTURE
// This is the single connection point to Supabase
// Every feature uses this — never create another Supabase connection

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://evdtdsvbaxneywahuxgw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wwRWRTsAwMIg9FdAzvei-A_I-fXt-Rz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);