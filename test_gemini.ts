const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];

for (const model of models) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
    });
    const data = await res.json();
    console.log(`Model ${model}: `, res.status, data.error ? data.error.message : 'OK');
  } catch (e) {
    console.log(`Model ${model} Failed: `, e.message);
  }
}
