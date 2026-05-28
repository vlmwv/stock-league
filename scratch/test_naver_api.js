async function testNaverApi() {
  const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };

  try {
    console.log('1. 국내 지수 (KOSPI, KOSDAQ) 호출...');
    const domesticUrl = 'https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ';
    const domesticRes = await fetch(domesticUrl, { headers: requestHeaders }).then(r => r.json());

    const kospiRaw = domesticRes?.datas?.find(d => d.itemCode === 'KOSPI');
    const kosdaqRaw = domesticRes?.datas?.find(d => d.itemCode === 'KOSDAQ');

    console.log(`코스피 raw: price=${kospiRaw?.closePriceRaw}, ratio=${kospiRaw?.fluctuationsRatioRaw}`);
    console.log(`코스닥 raw: price=${kosdaqRaw?.closePriceRaw}, ratio=${kosdaqRaw?.fluctuationsRatioRaw}`);

    console.log('\n2. 해외 지수 (.INX, .IXIC, .DJI) 호출...');
    const fetchWorld = async (symbol) => {
      const url = `https://api.stock.naver.com/index/${symbol}/basic`;
      return fetch(url, { headers: requestHeaders }).then(r => r.json());
    };

    const spxRes = await fetchWorld('.INX');
    const nasRes = await fetchWorld('.IXIC');
    const djiRes = await fetchWorld('.DJI');

    console.log(`S&P500 raw: price=${spxRes?.closePrice}, ratio=${spxRes?.fluctuationsRatio}`);
    console.log(`NASDAQ raw: price=${nasRes?.closePrice}, ratio=${nasRes?.fluctuationsRatio}`);
    console.log(`DowJones raw: price=${djiRes?.closePrice}, ratio=${djiRes?.fluctuationsRatio}`);

    console.log('\n3. 데이터 조립 결과:');
    const data = [
      {
        name: 'KOSPI',
        value: kospiRaw?.closePriceRaw ? parseFloat(kospiRaw.closePriceRaw) : 2654.21,
        changeRate: kospiRaw?.fluctuationsRatioRaw ? parseFloat(kospiRaw.fluctuationsRatioRaw) : 1.20
      },
      {
        name: 'KOSDAQ',
        value: kosdaqRaw?.closePriceRaw ? parseFloat(kosdaqRaw.closePriceRaw) : 875.40,
        changeRate: kosdaqRaw?.fluctuationsRatioRaw ? parseFloat(kosdaqRaw.fluctuationsRatioRaw) : -0.40
      },
      {
        name: 'S&P 500',
        value: spxRes?.closePrice ? parseFloat(spxRes.closePrice.replace(/,/g, '')) : 5137.08,
        changeRate: spxRes?.fluctuationsRatio ? parseFloat(spxRes.fluctuationsRatio) : 0.85
      },
      {
        name: 'NASDAQ',
        value: nasRes?.closePrice ? parseFloat(nasRes.closePrice.replace(/,/g, '')) : 16274.94,
        changeRate: nasRes?.fluctuationsRatio ? parseFloat(nasRes.fluctuationsRatio) : 1.14
      },
      {
        name: 'Dow Jones',
        value: djiRes?.closePrice ? parseFloat(djiRes.closePrice.replace(/,/g, '')) : 39087.38,
        changeRate: djiRes?.fluctuationsRatio ? parseFloat(djiRes.fluctuationsRatio) : 0.23
      }
    ];

    console.log(JSON.stringify(data, null, 2));

  } catch (e) {
    console.error('Error testing Naver API:', e.message);
  }
}

testNaverApi();
