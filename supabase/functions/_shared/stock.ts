// Edge Function 공용 종목 유틸.
// Deno 런타임은 앱 코드(app/utils/stock.ts)를 import할 수 없어 로직이 복제돼 있었고,
// 그 복제본은 name이 null이면 예외가 나는 문제가 있었다. 여기로 단일화해 드리프트/버그를 방지한다.
// (app/utils/stock.ts의 isEtf와 키워드/동작을 반드시 일치시킬 것.)
export const isEtf = (name: string | null | undefined): boolean => {
  const etfKeywords = [
    'ETF', 'ETN', 'KODEX', 'TIGER', 'KBSTAR', 'ACE', 'SOL', 'ARIRANG',
    'HANARO', 'KOSEF', 'RISE', 'PLUS', 'TIMEFOLIO', 'WOORI', 'HI',
    'UNIPLAT', 'HANA', 'KOSEF'
  ]
  const upperName = (name || '').toUpperCase()
  return etfKeywords.some(keyword => upperName.includes(keyword))
}
