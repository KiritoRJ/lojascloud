import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lawcmqsjhwuhogsukhbf.supabase.co';
// A chave anon é segura para ser exposta no lado do cliente
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhd2NtcXNqaHd1aG9nc3VrYmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxMjY5OTQsImV4cCI6MjAzMzcwMjk5NH0.Fp6D8Gf1v_h3a3r1Y1Jfg3Yq5W2hYg4a5sPjnsW3M_4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
