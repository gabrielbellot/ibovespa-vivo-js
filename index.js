// ALWAYS set the timezone to UTC-3 (Brasília timezone)!

// DEPENDENCIES
const fs = require("fs")
const Twitter = require("twitter")
const Yahoo = require("yahoo-finance2").default
const moment = require("moment")
const Axios = require("axios")

// Let's make things easier!
Twitter.prototype.tweet = function tweet(status) {
    this.post('statuses/update', {status: status}, function(error, tweet, response) {
        if (error) {
          console.log("Error while tweeting on account!\nError : " + error)
          return
        }

        console.log("Tweeted " + status + " on account successfully")
    });
}

console.logCopy = console.log.bind(console)
console.log = function(...args) {
    this.logCopy('[' + moment().format("DD/MM/YYYY HH:mm:ss.SSS") + ']', ...args)
}

if(!fs.existsSync("./config.json")) {
    console.log("Looks like it's the first time you're running the application!")

    fs.writeFileSync("./config.json", JSON.stringify({
        stockTicker: "Stock ticker (for Ibovespa, use ^BVSP)",
        twitter: {
            consumerKey:"Twitter consumer KEY",
            consumerSecret:"Twitter consumer SECRET",
            accessToken:"Twitter access TOKEN",
            accessSecret:"Twitter access SECRET"
        },
        lastPrice: 0
    }))

    console.log("Created file ./config.json! Consider filling it's data to start the bot!")
    process.exit(1)
}

const config = require("./config.json")

const twitterClient = new Twitter({
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token_key: config.twitter.accessToken,
    access_token_secret: config.twitter.accessSecret
})

console.log("Logged on successfully on client!!!")

// Each 3 minutes (3 * 60 * 1000, 180000ms), check the API 
setInterval(async () => {
    let now = moment()

    console.log("Fetching \""+ config.stockTicker + "\" ticker on Yahoo API!")
    let ticker = await Yahoo.quote(config.stockTicker)

    let price = ticker.regularMarketPrice
    let change = ticker.regularMarketChange.toFixed(2)
    let changePercent = ticker.regularMarketChangePercent.toFixed(2)

    console.log("Market state                            : " + ticker.marketState)
    if (ticker.marketState === "CLOSED")
        return

    console.log("Fetched price                           : " + price)
    console.log("Last price                              : " + config.lastPrice)
    console.log("Is it different?                        : ", config.lastPrice !== price)
    if (price === config.lastPrice) return

    let difference = Math.abs(price - config.lastPrice)
    console.log("Is the difference higher than 2 points? : ", difference > 2)
    if (difference < 2) return

    if (Math.abs(changePercent) < 0.05)
        return

    // Then we can tweet!!!!!!!!!!
    let emoji = ""
    if (change > 0) {
        emoji = "📈"
    } else {
        emoji = "📉"
    }
    
    config.lastPrice = price
    fs.writeFileSync("./config.json", JSON.stringify(config))

    let message = `💸 ${price} pontos - às ${now.format("HH:mm")}\n\n${emoji} Variação: ${change} pontos (${changePercent}%)`
    twitterClient.tweet(message)
}, 5 * 60 * 1000)

setInterval(async () => {
    const now = moment()
    console.log(`${now.format("HH:mm")} - checking if it's opening/closure...`)

    if (!(await isBusinessDay(now)))
        return

    // 10:00 UTC-3
    if (now.hours() === 10 && now.minutes() === 0) {
        console.log("10:00 AM - Announcing stocks opening!")

        let ticker = await Yahoo.quote("^BVSP")
        let price = ticker.regularMarketPrice

        let message = `🕙 Abertura de Mercado - Bolsa de Valores de São Paulo - ${now.format("DD/MM/YYYY")}\n\n💸 ${price} pontos ás 10:00\n🌞 Tenham um ótimo dia, investidores!`
        twitterClient.tweet(message)
    }

    // 18:30 UTC-3
    if (now.hours() === 18 && now.minutes() === 30) {
        console.log("6:30 PM - Announcing stocks closing!")

        let ticker = await Yahoo.quote("^BVSP")
        let price = ticker.regularMarketPrice
        let change = ticker.regularMarketChange.toFixed(2)
        let changePercent = ticker.regularMarketChangePercent.toFixed(2)  
        
        let emoji = ""
        if (change > 0) {
            emoji = "📈"
        } else {
            emoji = "📉"
        }
        
        let message = `🕡 Fechamento de Mercado - Bolsa de Valores de São Paulo - ${now.format("DD/MM/YYYY")}\n\n${emoji} ${price} pontos - (${changePercent}%)\n🕙 Abertura: ${ticker.regularMarketOpen.toFixed(2)} pontos\n📊 Mín-Máx diária: ${ticker.regularMarketDayLow.toFixed(2)}-${ticker.regularMarketDayHigh.toFixed(2)} pontos`
        twitterClient.tweet(message)
    }
}, 60000);

async function isBusinessDay(today) {
    if (today.day() == 0 || today.day() == 7)
        return false

    if (!fs.existsSync(`./${today.year()}.json`)) {
        let holidayDates = await Axios.get("https://brasilapi.com.br/api/feriados/v1/" + today.year())

        fs.writeFileSync(`./${today.year()}.json`, JSON.stringify(holidayDates.data))
    }

    const currentYearHolidays = require(`./${today.year()}.json`)
    currentYearHolidays.includes()
    currentYearHolidays.forEach((holiday) => {
        let holidayDate = new Date(holiday.date)

        if (holidayDate.getDate() === today.date() && holidayDate.getMonth() === today.month()) {
            return false
        }
    })

    return true
}

