import * as dotenv from 'dotenv'
dotenv.config()
const key = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || ''
// Since I don't have the key locally, I can't test it directly unless I use the Supabase Edge function.
// Let me write an edge function modification that logs finishReason!
