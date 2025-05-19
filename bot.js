const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const URL = process.env.WEBHOOK_URL;  // Your Render service URL like https://your-app.onrender.com

if (!TOKEN || !URL) {
  console.error('❌ BOT_TOKEN and WEBHOOK_URL environment variables must be set');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN);
const app = express();

app.use(express.json());

// Set webhook
(async () => {
  try {
    await bot.setWebHook(`${URL}/bot${TOKEN}`);
    console.log(`Webhook set to: ${URL}/bot${TOKEN}`);
  } catch (e) {
    console.error('Failed to set webhook:', e);
  }
})();

// Handle incoming updates
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Video download logic
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const isYouTube = text?.includes("youtube.com") || text?.includes("youtu.be");
  const isFacebook = text?.includes("facebook.com") || text?.includes("fb.watch");

  if (!isYouTube && !isFacebook) return;

  const filename = `video_${Date.now()}.mp4`;
  const filepath = path.join(__dirname, filename);

  bot.sendMessage(chatId, "📥 Downloading your video... Please wait a moment.");

  const command = `yt-dlp -f mp4 -o "${filepath}" "${text}"`;

  exec(command, async (err, stdout, stderr) => {
    if (err || !fs.existsSync(filepath)) {
      console.error(stderr);
      bot.sendMessage(chatId, "❌ Sorry, the video couldn't be downloaded. It may be restricted or blocked.");
      return;
    }

    try {
      await bot.sendVideo(chatId, fs.createReadStream(filepath), {
        caption: "✅ Here's your video. Enjoy!"
      });
    } catch (e) {
      console.error(e);
      bot.sendMessage(chatId, "⚠️ Video downloaded but could not be sent. It might be too large for Telegram.");
    }

    fs.unlink(filepath, () => console.log("🧹 File cleaned up."));
  });
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});
