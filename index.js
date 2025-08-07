const https = require("https");
const express = require("express");
const app = express();

const API_KEY = process.env.YT_API_KEY;  // Use environment variable for security
const CHANNEL_ID = "UCGZs04iz154N0EvMs0yezkw";

const CHECK_INTERVAL = 30; // seconds
const TIME_PER_SUB = 60; // seconds to add per sub

let lastSubCount = null;

function getSubscriberCount() {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${API_KEY}`;

    https.get(url, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          const count = parseInt(data.items[0].statistics.subscriberCount);
          resolve(count);
        } catch (e) {
          reject("Failed to parse response: " + e);
        }
      });
    }).on("error", reject);
  });
}

async function checkSubs() {
  try {
    const currentCount = await getSubscriberCount();

    if (lastSubCount === null) {
      lastSubCount = currentCount;
      console.log(`🚀 Starting with ${currentCount} subs.`);
    } else if (currentCount > lastSubCount) {
      const newSubs = currentCount - lastSubCount;
      console.log(`🎉 ${newSubs} new sub(s)! Add ${TIME_PER_SUB * newSubs} seconds.`);

      // Output for StreamElements overlay
      console.log(`window.postMessage({ user: "YouTube Subscriber", timeToAdd: ${TIME_PER_SUB * newSubs} }, "*");`);

      lastSubCount = currentCount;
    } else {
      console.log(`📉 No new subs. Still at ${currentCount}.`);
    }
  } catch (err) {
    console.error("❌ Error checking subs:", err);
  }
}

setInterval(checkSubs, CHECK_INTERVAL * 1000);

app.get("/", (req, res) => {
  res.send("YouTube Subathon bot is running!");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("App listening on port " + listener.address().port);
});
