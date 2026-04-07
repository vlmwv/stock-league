import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.NUXT_GEMINI_API_KEY
async function fixAiScores() {
  const supabase = createClient(supabaseUrl!, supabaseKey!)
  const { data: records } = await supabase.from('daily_stocks').select('id, stocks(code, name, sector)').is('ai_score', null).limit(10)
  if (!records) return;
  for (const record of records) {
    const stock = record.stocks as any;
    console.log(`Analyzing ${stock.name}...`);
    
    try {
        const prompt = `주식 '${stock.name}'의 투자 의견을 분석하세요. 반드시 {"summary": "요약", "score": 숫자} 형식으로만 답하세요. 다른 텍스트는 금지입니다.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        })
        const data: any = await response.json();
        
        if (data.error) {
            console.error(`  !! API Error: ${data.error.message}`);
            continue;
        }
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log(`  Raw Response: ${resultText}`);
        // JSON 문자열 정제 (마크다운 코드 블록 등 제거)
        const jsonMatch = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(jsonMatch);
        if (parsed.score !== undefined) {
            await supabase.from('daily_stocks').update({
                ai_score: Number(parsed.score),
                llm_summary: parsed.summary || "분석 완료"
            }).eq('id', record.id);
            console.log(`  -> [SUCCESS] Score: ${parsed.score}`);
        }
    } catch (err: any) {
        console.error(`  !! Error: ${err.message}`);
    }
  }
}
fixAiScores();
