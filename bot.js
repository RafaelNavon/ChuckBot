require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

const AZURE_TRANSLATION_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/';

const bot = new TelegramBot(TELEGRAM_TOKEN, {polling:true}); 

let userLanguages = {};

bot.onText(/set language (.+)/, async(msg, match) => {
    const chatId = msg.chat.id;
    const language = match[i].toLowerCase();
    userLanguages[chatId] = language;
    bot.sendMessage(chatId, 'No problem');
});

bot.onText(/(\d+)/, async(msg, match) => {
    const chatId = msg.chat.id;
    const jokeNumber = parseInt(match[i]);

    if(jokeNumber < 1 || jokeNumber > 101) {
        return bot.sendMessage(chatId, 'Please provide a number between: 1 and 101');
    }

    try {
        const joke = await getJoke(jokeNumber);
        if(userLanguages[chatId] && userLanguages[chatId] !== 'english') {
            const translatedJoke = await translateText(joke, userLanguages[chatId]);
            return bot.sendMessage(chatId, `${jokeNumber}. ${translatedJoke}`);
        }
        else {
            return bot.sendMessage(chatId, `${jokeNumber}. ${joke}`);
        }
    }
    catch (error) {
        console.error(error);
        return bot.sendMessage(chatId, 'Error retrieving the joke.');
    }
});

async function getJoke(number) {
    const url = 'https://parade.com/968666/parade/chuck-norris-jokes/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const jokesList = $('.listicle-slide p').toArray();
    return $(jokesList[number - 1]).text().trim();
}

async function translateText(text, targetLanguage) {
    const options = {
        method: 'post',
        baseURL: AZURE_TRANSLATION_ENDPOINT,
        url: `&to=${targetLanguage}`,
        headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SUBSCRIPTION_KEY,
            'Content-type': 'application/json'
        },
        data: [{ 'Text': text }]
    };
    const response = await axios(options);
    return response.data[0].translations[0].text;
}

bot.startPolling();