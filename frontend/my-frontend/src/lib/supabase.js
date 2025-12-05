import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Kiểm tra xem biến có tồn tại không (để debug)
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Thiếu supabaseUrl hoặc supabaseKey')
}

export const supabase = createClient(supabaseUrl, supabaseKey)