const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

const getAllNews = async function() {
  try {
    const response = await axios.get('https://www.tabnews.com.br/api/v1/contents/NewsletterOficial');
    return response.data;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
};

async function getSingleNew(slug) {
  const baseURL = 'https://www.tabnews.com.br/_next/data/N4EUvrdnV1-1yMcfA8HiC/NewsletterOficial/';
  const endpoint = `${slug}.json?username=NewsletterOficial&slug=${slug}`;
  const url = baseURL + endpoint;

  try {
    const response = await axios.get(url);
    const newsInfo = response.data.pageProps.contentFound;
    return {
      "title": `*${newsInfo.title}*`,
      "body": newsInfo.body,
      "source_url": newsInfo.source_url
    };
  } catch (error) {
    throw error;
  }
}

let currentNewsIndex = 0;

client.on('message_create', async msg => {
  if (msg.body == 'new') {
    try {
      const newsData = await getAllNews();

      if (currentNewsIndex < newsData.length) {
        const slug = newsData[currentNewsIndex].slug;
        const newsInfo = await getSingleNew(slug);

        // // Envia o título em uma mensagem
        await client.sendMessage(msg.from, newsInfo.title);

        // Aguarde um breve momento e envie o corpo da notícia em outra mensagem
        setTimeout(async () => {
          await client.sendMessage(msg.from, newsInfo.body);
          await client.sendMessage(msg.from, `_fonte_ : ${newsInfo.source_url}`);
        }, 1000); // Aguarda 1 segundo para evitar mensagens concatenadas

        currentNewsIndex++;
      } else {
        await client.sendMessage(msg.from, "Todas as notícias já foram enviadas.");
      }
    } catch (error) {
      console.error('Error sending news:', error);
    }
  }
});

client.initialize();
