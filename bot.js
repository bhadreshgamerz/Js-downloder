const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN environment variable not set.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Validate video URL
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
      bot.sendMessage(chatId, "❌ Sorry, the video couldn't be downloaded. It may be age-restricted, private, or blocked.");
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
