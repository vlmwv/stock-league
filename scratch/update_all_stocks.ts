
const SUPABASE_URL = 'https://zmqjooidmibqrigziipq.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0';

async function fetchAllAndUpdate() {
  console.log('Fetching all stock codes from DB...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stocks?select=code`, {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  if (!res.ok) {
    console.error('Failed to fetch stock codes');
    return;
  }
  
  const stocks = await res.json();
  const codes = stocks.map(s => s.code).filter(c => /^[0-9]{6}$/.test(c)); // Only Korean stocks
  console.log(`Found ${codes.length} Korean stocks.`);
  
  const batchSize = 50;
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(codes.length / batchSize)}...`);
    
    try {
      const naverRes = await fetch(`https://polling.finance.naver.com/api/realtime/domestic/stock/${batch.join(',')}`);
      if (!naverRes.ok) throw new Error('Naver API error');
      
      const naverData = await naverRes.json();
      const updates = naverData.datas.map(item => {
        if (!item.marketValueFullRaw) return null;
        return {
          code: item.itemCode,
          market_cap: Math.floor(parseInt(item.marketValueFullRaw, 10) / 100000000)
        };
      }).filter(Boolean);
      
      if (updates.length > 0) {
        // We can't do bulk update by different values in REST API easily without multiple requests or a custom RPC.
        // But we can use upsert with onConflict if we have all columns, but here we only want to update market_cap.
        // For simplicity, we'll do them one by one in parallel for this batch, or use a custom RPC if available.
        // Since we don't have an RPC, we'll do parallel PATCH requests for the batch.
        
        await Promise.all(updates.map(async (u) => {
          await fetch(`${SUPABASE_URL}/rest/v1/stocks?code=eq.${u.code}`, {
            method: 'PATCH',
            headers: {
              'apikey': API_KEY,
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ market_cap: u.market_cap })
          });
        }));
        console.log(`Updated ${updates.length} stocks.`);
      }
    } catch (err) {
      console.error(`Error in batch starting at ${i}:`, err.message);
    }
    
    // Slight delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('All done!');
}

fetchAllAndUpdate();
