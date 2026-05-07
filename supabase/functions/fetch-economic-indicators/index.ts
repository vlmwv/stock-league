import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function fetchInvestingData(timeFilter: string, currentTab: string) {
  const url = 'https://kr.investing.com/economic-calendar/Service/getCalendarFilteredData'
  
  const bodyParams = new URLSearchParams()
  bodyParams.append('country[]', '5') // US
  bodyParams.append('country[]', '11') // KR
  bodyParams.append('importance[]', '2') // Medium
  bodyParams.append('importance[]', '3') // High
  bodyParams.append('timeZone', '88') // Seoul KST
  bodyParams.append('timeFilter', timeFilter)
  bodyParams.append('currentTab', currentTab)
  bodyParams.append('submitFilters', '1')
  bodyParams.append('limit_from', '0')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://kr.investing.com/economic-calendar/'
    },
    body: bodyParams.toString()
  })

  if (!response.ok) {
    throw new Error(`Investing.com returned status ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

function parseHtml(htmlStr: string) {
  const html = `<table><tbody>${htmlStr}</tbody></table>`
  const $ = cheerio.load(html)
  const events: any[] = []

  $('tr.js-event-item').each((i, el) => {
    const currency = $(el).find('td.flagCur').text().trim()
    const country = currency.includes('USD') ? 'US' : currency.includes('KRW') ? 'KR' : 'US'
    
    const actTd = $(el).find('td.act')
    const actual = actTd.text().trim()
    let impact = 'neutral'
    if (actTd.hasClass('greenFont')) impact = 'positive'
    else if (actTd.hasClass('redFont')) impact = 'negative'

    const eventName = $(el).find('td.event').text().trim()
    const forecast = $(el).find('td.fore').text().trim()
    const previous = $(el).find('td.prev').text().trim()

    const timestamp = $(el).attr('data-event-datetime')
    
    // 중요도 파싱 (bull1, bull2, bull3)
    let importance = 1
    const sentimentTd = $(el).find('td.sentiment')
    const bullImg = sentimentTd.attr('data-img_key') || ''
    
    if (bullImg.includes('bull3')) importance = 3
    else if (bullImg.includes('bull2')) importance = 2
    else if (bullImg.includes('bull1')) importance = 1
    else {
      // data-img_key가 없는 경우 class 기반 아이콘 확인
      if (sentimentTd.find('i.grayFullBullishIcon, i.orangeFullBullishIcon').length >= 3) importance = 3
      else if (sentimentTd.find('i.grayFullBullishIcon, i.orangeFullBullishIcon').length === 2) importance = 2
      else importance = 1
    }

    if (eventName && timestamp) {
      events.push({
        event_name: eventName,
        event_at: new Date(timestamp.replace(/\//g, '-').replace(' ', 'T') + '+09:00').toISOString(),
        country,
        importance,
        actual: actual === '' ? null : actual,
        forecast: forecast === '' ? null : forecast,
        previous: previous === '' ? null : previous,
        impact: impact
      })
    }
  })

  return events
}

Deno.serve(async (req) => {
  try {
    let mode = 'fetch'
    try {
      const body = await req.json()
      if (body.mode) mode = body.mode
    } catch (e) {
      // ignore
    }

    if (mode === 'auto-update') {
      console.log('Running auto-update for economic indicators (Investing.com)...')
      
      // 이번 주 및 다음 주 일정 가져오기
      const [thisWeekHtml, nextWeekHtml] = await Promise.all([
        fetchInvestingData('timeOnly', 'thisWeek'),
        fetchInvestingData('timeOnly', 'nextWeek')
      ])
      
      const thisWeekEvents = parseHtml(thisWeekHtml)
      const nextWeekEvents = parseHtml(nextWeekHtml)
      
      // 중복 제거 (event_name + event_at 기준)
      const eventMap = new Map()
      const allEvents = [...thisWeekEvents, ...nextWeekEvents]
      allEvents.forEach(e => {
        const key = `${e.event_name}_${e.event_at}`
        eventMap.set(key, e)
      })
      const events = Array.from(eventMap.values())
      
      if (events.length === 0) {
        return new Response(JSON.stringify({ message: "No data parsed from Investing.com" }), { status: 200 })
      }

      // Upsert into DB
      const { error: updateError } = await supabase
        .from('economic_indicators')
        .upsert(events, { onConflict: 'event_name, event_at' })

      if (updateError) throw updateError

      return new Response(JSON.stringify({ 
        message: `Auto-update completed. Upserted ${events.length} items.`,
        updated_count: events.length 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    // Default: Return the list of indicators from the DB
    const { data, error } = await supabase
      .from('economic_indicators')
      .select('*')
      .order('event_at', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
