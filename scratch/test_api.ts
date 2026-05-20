import * as dotenv from 'dotenv'
dotenv.config()
const key = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || ''

async function run() {
  const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-flash-latest'];
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
    });
    console.log(model, "Status:", res.status)
    if(!res.ok) {
       console.log(model, "Err:", await res.text())
    }
  }
}
run()
