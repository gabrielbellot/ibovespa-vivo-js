// ALWAYS set the timezone to UTC-3 (Brasília timezone)!

// DEPENDENCIES
const fs = require("fs")
const Twitter = require("twitter")
const Yahoo = require("yahoo-stock-prices")
const moment = require("moment")

// Let's make things easier!
Twitter.prototype.tweet = function tweet(status) {
    this.post('statuses/update', {status: status}, function(error, tweet, response) {
        if (error) {
          console.log("Error while tweeting on account!\nError : " + error)
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
    return
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
    const date = moment()

    console.log("Fetching \""+ config.stockTicker + "\" ticker on Yahoo API!")
    const price = await Yahoo.getCurrentPrice("^BVSP")

    console.log("Fetched price                           : " + price)
    console.log("Last price                              : " + config.lastPrice)
    console.log("Is it different?                        : ", config.lastPrice !== price)
    if (price === config.lastPrice) return

    let difference = Math.abs(price - config.lastPrice)
    console.log("Is the difference higher than 2 points? : ", difference > 2)
    if (difference < 2) return

    config.lastPrice = price
    fs.writeFileSync("./config.json", JSON.stringify(config))

    // Then we can tweet!!!!!!!!!!
    let emoji = config.lastPrice > price ? "📉" : "📈"

    let message = `${emoji} O Índice Bovespa ${config.lastPrice > price ? "caiu" : "subiu"}! ${price} pontos - às ${date.format("HH:mm")}`
    twitterClient.tweet(message)
}, 3 * 60 * 1000)

/*setInterval(() => {
    const now = new Date()

    // 17:30 UTC-3
    if (now.getHours() === 17 && now.getMinutes() === 30) {
        console.log("Announcing stock closing!")

        twitterClient.tweet("")
        return
    }

    // 10:00 UTC-3
    if (now.getHours() === 10 && now.getMinutes() === 0) {
        return
    }
}, 60 * 1000);*/

