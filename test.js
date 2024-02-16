const axios = require('axios')

async function getWBNBOHLCVData() {
    try {
        const chain = 'arbitrum'
        const poolAddress = '0x92c63d0e701CAAe670C9415d91C474F686298f00'
        const timeframe = 'hour'
        const aggregate = 4
        const token = 'base' //base or quote
        const limit = 6

        const response = await axios.get(`https://api.geckoterminal.com/api/v2/api/networks/${chain}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&token=${token}`)

        const dataArray = response.data.data.attributes.ohlcv_list

        let max = Number.MIN_VALUE
        let min = Number.MAX_VALUE

        dataArray.forEach(arr => {
            const open = arr[1]
            const high = arr[2]
            const low = arr[3]
            const close = arr[4]

            const upperShadow = high - Math.max(open, close)
            const lowerShadow = Math.min(open, close) - low
            const body = Math.abs(open - close)

            if (upperShadow >= 3 * body || lowerShadow >= 3 * body) {
                max = Math.max(max, Math.max(open, close))
                min = Math.min(min, Math.min(open, close))
            } else {
                max = Math.max(max, high)
                min = Math.min(min, low)
            }
        });

        const valatility = (max - min) / min * 100

        console.log(`Max: ${max}, Min: ${min}`)
        console.log(`Valatility: ${valatility}%`)
    } catch (error) {
        console.error('error', error);
    }
}
getWBNBOHLCVData();