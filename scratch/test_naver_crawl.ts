async function test() {
  const code = '005930'
  const url = `https://finance.naver.com/item/main.naver?code=${code}`

  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    const html = decoder.decode(buffer)

    const regex = /type=upjong&no=[0-9]+">([^<]+)<\/a>/g
    const matches = [...html.matchAll(regex)]
    
    if (matches.length > 0) {
      console.log('Found industry matches with UTF-8:', matches.map(m => m[1]))
    } else {
      console.log('No industry matches found with UTF-8.')
    }
  } catch (err: any) {
    console.log(`Error: ${err.message}`)
  }
}

test()
