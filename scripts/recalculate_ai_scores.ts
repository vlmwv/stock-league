import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.NUXT_GEMINI_API_KEY
async function fixAiScores() {
  const supabase = createClient(supabaseUrl!, supabaseKey!)
  const { data: records } = await supabase.from('daily_stocks').select('id, stocks(code, name, sector)').is('ai_score', null).limit(5)
  if (!records) return;
  for (const record of records) {
    const stock = record.stocks as any;
    console.log(`Analyzing ${stock.name}...`);
    
    try {
        const prompt = `주식 '${stock.name}'의 투자 의견을 JSON({summary: string, score: number})으로 출력하세요.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data: any = await response.json();
        
        // 에러 또는 빈 응답 체크
        if (data.error) {
            console.error(`  !! API Error: ${data.error.message}`);
            continue;
        }
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
            console.warn(`  !! Empty candidate. Data: ${JSON.stringify(data)}`);
            continue;
        }
        const cleanJson = resultText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        await supabase.from('daily_stocks').update({
            ai_score: parsed.score,
            llm_summary: parsed.summary
        }).eq('id', record.id);
        
        console.log(`  -> [SUCCESS] Score: ${parsed.score}`);
    } catch (err: any) {
        console.error(`  !! Error: ${err.message}`);
    }
  }
}
fixAiScores();
