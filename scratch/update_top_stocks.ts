
const stocks = [
  { code: '005930', marketCap: 15872646 },
  { code: '373220', marketCap: 1130220 },
  { code: '034020', marketCap: 873725 },
  { code: '329180', marketCap: 727381 },
  { code: '009150', marketCap: 684941 },
  { code: '207940', marketCap: 679551 }
];

const SUPABASE_URL = 'https://zmqjooidmibqrigziipq.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0';

async function updateAll() {
  for (const stock of stocks) {
    console.log(`Updating ${stock.code}...`);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stocks?code=eq.${stock.code}`, {
      method: 'PATCH',
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ market_cap: stock.marketCap })
    });
    if (res.ok) {
      console.log(`Success for ${stock.code}`);
    } else {
      console.error(`Failed for ${stock.code}:`, await res.text());
    }
  }
}

updateAll();
