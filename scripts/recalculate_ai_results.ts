import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

// AI 추천 적중(ai_result) 재집계 스크립트 — "B-30일 수익률" 정의
//
// 적중 정의: 추천 기준가(rec_price = 추천 전일 종가) 대비, 추천일(game_date)로부터
//   30일(달력 기준) 이후 첫 거래일 종가가
//     - 더 높으면  win
//     - 더 낮으면  lose
//     - 같으면     draw
//   아직 30일이 지나지 않았으면 pending (집계 제외)
//   기준가/시세를 구할 수 없으면 ai_result=null (집계 제외)
//
// ai_result는 유저 예측 게임의 status와 무관하게 독립적으로 산정한다.
// stocks.ai_win_count / ai_processed_count 는 daily_stocks 기준으로 재동기화한다.
//
// 실행:  npx tsx scripts/recalculate_ai_results.ts           (DRY 미적용? -> 아래 참고)
//        npx tsx scripts/recalculate_ai_results.ts --apply   (실제 쓰기)
//   기본은 DRY-RUN. --apply 를 줘야 DB에 기록한다.

const APPLY = process.argv.includes('--apply')
const HORIZON_DAYS = 30

const sb = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY!
)

const kstToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date())

const addDays = (d: string, n: number) => {
  const dt = new Date(d + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

async function fetchAll(table: string, cols: string, order: string, filt?: (q: any) => any) {
  let all: any[] = []; let from = 0; const page = 1000
  while (true) {
    let q = sb.from(table).select(cols).order(order, { ascending: true }).range(from, from + page - 1)
    if (filt) q = filt(q)
    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < page) break
    from += page
  }
  return all
}

async function main() {
  console.log(`[recalculate_ai_results] KST 오늘=${kstToday}, 지평=${HORIZON_DAYS}일, 모드=${APPLY ? 'APPLY(쓰기)' : 'DRY-RUN'}`)

  const ds = await fetchAll('daily_stocks', 'id, stock_id, game_date, ai_result', 'game_date')
  const minDate = ds.length ? ds[0].game_date : kstToday

  // 시세 이력: 기준가(전일 종가) 계산을 위해 game_date 최소값보다 12일 이전부터 조회
  const prices = await fetchAll(
    'stock_price_history', 'stock_id, price_date, close_price', 'price_date',
    q => q.gte('price_date', addDays(minDate, -12))
  )
  const byStock = new Map<number, { date: string, close: number }[]>()
  for (const p of prices) {
    if (p.close_price == null) continue
    if (!byStock.has(p.stock_id)) byStock.set(p.stock_id, [])
    byStock.get(p.stock_id)!.push({ date: p.price_date, close: Number(p.close_price) })
  }
  for (const arr of byStock.values()) arr.sort((a, b) => (a.date < b.date ? -1 : 1))

  // 추천 기준가: game_date 이전 최신 종가, 없으면 game_date 당일 종가
  const recPrice = (sid: number, gd: string): number | null => {
    const arr = byStock.get(sid) || []
    let prev: number | null = null; let same: number | null = null
    for (const r of arr) {
      if (r.date < gd) prev = r.close
      if (r.date === gd) same = r.close
    }
    return prev ?? same ?? null
  }
  // game_date + HORIZON_DAYS 이후 첫 거래일 종가
  const horizonClose = (sid: number, gd: string): { date: string, close: number } | null => {
    const tgt = addDays(gd, HORIZON_DAYS)
    const arr = byStock.get(sid) || []
    for (const r of arr) if (r.date >= tgt) return r
    return null
  }

  type R = 'win' | 'lose' | 'draw' | 'pending' | null
  const computed: { id: number, stock_id: number, result: R, prev: R }[] = []
  for (const d of ds) {
    const rp = recPrice(d.stock_id, d.game_date)
    let result: R
    if (rp == null || rp <= 0) {
      result = null // 기준가 없음 → 판정 불가
    } else {
      const hc = horizonClose(d.stock_id, d.game_date)
      if (!hc || hc.date > kstToday) {
        result = 'pending' // 30일 미경과
      } else if (hc.close > rp) result = 'win'
      else if (hc.close < rp) result = 'lose'
      else result = 'draw'
    }
    computed.push({ id: d.id, stock_id: d.stock_id, result, prev: d.ai_result ?? null })
  }

  // 분포 / 변경 건수
  const dist: Record<string, number> = {}
  let changed = 0
  for (const c of computed) {
    const k = String(c.result)
    dist[k] = (dist[k] || 0) + 1
    if (c.result !== c.prev) changed++
  }
  // 종목별 집계
  const perStock = new Map<number, { win: number, proc: number }>()
  for (const c of computed) {
    const ps = perStock.get(c.stock_id) || { win: 0, proc: 0 }
    if (c.result === 'win') { ps.win++; ps.proc++ }
    else if (c.result === 'lose' || c.result === 'draw') { ps.proc++ }
    perStock.set(c.stock_id, ps)
  }
  const totWin = Array.from(perStock.values()).reduce((s, p) => s + p.win, 0)
  const totProc = Array.from(perStock.values()).reduce((s, p) => s + p.proc, 0)

  console.log('daily_stocks 총:', ds.length, '/ 새 ai_result 분포:', dist)
  console.log('변경되는 행 수:', changed)
  console.log(`새 전역 적중률 = ${totProc ? (totWin / totProc * 100).toFixed(1) + '%' : 'N/A'} (${totWin}/${totProc})`)

  if (!APPLY) {
    console.log('\nDRY-RUN 종료. 실제 적용하려면 --apply 플래그를 붙여 다시 실행하세요.')
    return
  }

  // 1) daily_stocks.ai_result 업데이트 (변경된 행만, 결과값 그룹별 일괄 update)
  const groups = new Map<string, number[]>()
  for (const c of computed) {
    if (c.result === c.prev) continue
    const key = String(c.result)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c.id)
  }
  for (const [key, ids] of groups) {
    const value = key === 'null' ? null : key
    // .in 청크(1000개 단위)
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      const { error } = await sb.from('daily_stocks').update({ ai_result: value }).in('id', chunk)
      if (error) throw error
    }
    console.log(`  ai_result=${key} 로 ${ids.length}행 업데이트`)
  }

  // 2) stocks 집계 재동기화 (현재값과 다른 종목만 update)
  const stocksRows = await fetchAll('stocks', 'id, ai_win_count, ai_processed_count', 'id')
  let stockUpdates = 0
  for (const s of stocksRows) {
    const ps = perStock.get(s.id) || { win: 0, proc: 0 }
    if ((s.ai_win_count || 0) === ps.win && (s.ai_processed_count || 0) === ps.proc) continue
    const { error } = await sb.from('stocks')
      .update({ ai_win_count: ps.win, ai_processed_count: ps.proc })
      .eq('id', s.id)
    if (error) throw error
    stockUpdates++
  }
  console.log(`  stocks 집계 갱신: ${stockUpdates}개 종목`)
  console.log('\n[완료] 재집계 적용됨.')
}

main().catch(e => { console.error(e); process.exit(1) })
