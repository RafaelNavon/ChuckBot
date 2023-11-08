require('dotenv').config();
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const zenRowsApiKey = process.env.ZENROWS_API_KEY; // Ensure this is set in your .env file
const azureKey = process.env.AZURE_TRANSLATOR_KEY;
const azureEndpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;

const bot = new TelegramBot(token, { polling: true });
let userLanguage = 'en'; // default language

bot.onText(/set language (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  userLanguage = match[1];

  let responseMessage = 'Language set to ' + userLanguage;

  if (userLanguage !== 'en') {
    responseMessage = await translateText(responseMessage, userLanguage);
  }

  bot.sendMessage(chatId, responseMessage, { reply_to_message_id: msg.message_id });
});

bot.onText(/^(\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const jokeNumber = parseInt(match[1], 10);

  if (jokeNumber < 1 || jokeNumber > 101) {
    bot.sendMessage(chatId, 'Please send a number between 1 and 101.');
    return;
  }

  try {
    let joke = await scrapeJoke(jokeNumber);
    if (joke === "Joke number is out of range.") {
      bot.sendMessage(chatId, joke);
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
  // The parameters provided by ZenRows should be used here.
  const url = 'https://parade.com/968666/parade/chuck-norris-jokes/';
  const apiKey = zenRowsApiKey; // Replace with your actual ZenRows API key from your .env file

  try {
    const response = await axios({
      url: 'https://api.zenrows.com/v1/',
      method: 'GET',
      params: {
        'url': url,
        'apikey': apiKey,
        'js_render': 'true'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Failed to retrieve jokes, status code: ${response.status}`);
    }

    // Process the returned HTML here to extract the jokes.
    // The exact method will depend on the structure of the HTML.
    // Assuming the HTML structure is similar to what we've seen before,
    // we could use a library like Cheerio to parse it (Cheerio must be installed first with npm install cheerio):
    const cheerio = require('cheerio');
    const $ = cheerio.load(response.data);
    const jokes = $('.m-detail--body > ol > li').toArray().map(item => $(item).text());
    const joke = jokes[jokeNumber - 1];
    return joke || "Joke number is out of range.";

  } catch (error) {
    console.error('Error during web scraping:', error.message);
    return null; // In case of an error, return null for joke
  }
}

async function translateText(text, language) {
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
        'text': text
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
