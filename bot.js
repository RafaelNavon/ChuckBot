require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const puppeteerExtra = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const azureKey = process.env.AZURE_TRANSLATOR_KEY;
const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;

puppeteerExtra.use(Stealth());

const bot = new TelegramBot(token, { polling: true });
let userLanguage = 'en'; // default language

bot.onText(/set language (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const lang = match[1];
  userLanguage = lang;

  let responseMessage = 'No problem';

  if (userLanguage !== 'en') {
    responseMessage = await translateText(responseMessage, userLanguage);
  }

  bot.sendMessage(chatId, responseMessage, { reply_to_message_id: msg.message_id });
});

bot.onText(/^(\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const jokeNumber = match[1];

  if (jokeNumber < 1 || jokeNumber > 101) {
    bot.sendMessage(chatId, 'Please send a number between 1 and 101.');
    return;
  }

  try {
    let joke = await scrapeJoke(jokeNumber);
    if (!joke) {
      bot.sendMessage(chatId, 'Failed to retrieve the joke. Please try another number.');
      return;
    }

    if (userLanguage !== 'en') {
      joke = await translateText(joke, userLanguage);
    }

    bot.sendMessage(chatId, `${jokeNumber}. ${joke}`);
  } catch (error) {
    console.error('Error while processing joke:', error.message);
    bot.sendMessage(chatId, 'An error occurred. Please try again later.');
  }
});

async function scrapeJoke(jokeNumber) {
  const browser = await puppeteerExtra.launch({ headless: false, devtools: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const delay = duration => new Promise(res => setTimeout(res, duration));


  await page.setViewport({ width: 1366, height: 768 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  const response = await page.goto('https://parade.com/968666/parade/chuck-norris-jokes/', { waitUntil: 'domcontentloaded' });
  await delay(60000); // wait for 60 seconds to manually solve CAPTCHA
  if (response.status() !== 200) {
    throw new Error(`Failed to load page, status: ${response.status()}`);
  }

  await page.waitForSelector('.m-detail--body > ol > li');

  const joke = await page.evaluate((jokeNum) => {
    const element = document.querySelector(`.m-detail--body > ol > li:nth-child(${jokeNum})`);
    return element ? element.innerText.trim() : null;
  }, jokeNumber);

  await browser.close();

  return joke;
}

async function translateText(joke, language) {
  try {
    const response = await axios({
      baseURL: azureEndpoint,
      url: '/translate',
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Region': 'southeastasia',
      },
      params: {
        'api-version': '3.0',
        'to': language,
      },
      data: [{
        'text': joke
      }],
      responseType: 'json',
    });

    return response.data[0].translations[0].text;
  } catch (error) {
    console.error('Azure translation error:', error.message);
    throw error;
  }
}

console.log('Bot started...');









// const axios = require('axios');
// const cheerio = require('cheerio');

// const URL = 'https://parade.com/968666/parade/chuck-norris-jokes/';

// axios.get(URL).then(response => {
//     const $ = cheerio.load(response.data);
    
//     // Extract jokes
//     const jokesList = $('div.m-detail--body ol li');
    
//     jokesList.each((index, element) => {
//         console.log(`${index + 1}. ${$(element).text().trim()}`);
//     });

// }).catch(error => {
//     console.error("Error fetching the URL:", error);
// });
