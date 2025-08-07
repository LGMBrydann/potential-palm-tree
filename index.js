const express = require("express");
const http = require("http");
const https = require("https");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Config - set your channel ID here
const CHANNEL_ID = "UCGZs04iz154N0EvMs0yezkw";
const API_KEY = process.env.YT_API_KEY; // Set in Railway environment variables
const CHECK_INTERVAL = 30; // seconds
const TIME_PER_SUB = 60; // seconds to add per new sub

let lastSubCount = null;

// Helper: broadcast data to all connected WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if(client.readyState === WebSocket.OPEN){
      client.send(message);
    }
  });
}

// Get current subscriber count from YouTube API
function getSubscriberCount() {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${API_KEY}`;

    https.get(url, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try {
          const data = JSON.parse(body);
          if(data.items && data.items.length > 0){
            const count = parseInt(data.items[0].statistics.subscriberCount);
            resolve(count);
          } else {
            reject(new Error("No channel data found"));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", reject);
  });
}

// Periodically check for new subs and broadcast time updates
async function checkSubs() {
  try {
    const currentCount = await getSubscriberCount();

    if(lastSubCount === null){
      lastSubCount = currentCount;
      console.log(`Initial subscriber count: ${currentCount}`);
      return;
    }

    if(currentCount > lastSubCount){
      const newSubs = currentCount - lastSubCount;
      const secondsToAdd = TIME_PER_SUB * newSubs;

      console.log(`New subscribers: ${newSubs}. Adding ${secondsToAdd} seconds.`);

      // Broadcast message to overlay clients
      broadcast({
        user: "YouTube Subscriber",
        timeToAdd: secondsToAdd,
      });

      lastSubCount = currentCount;
    } else {
      console.log(`No new subscribers. Count: ${currentCount}`);
    }
  } catch (error) {
    console.error("Error checking subs:", error);
  }
}

// Start periodic checking
setInterval(checkSubs, CHECK_INTERVAL * 1000);

// Basic HTTP route for testing
app.get("/", (req, res) => {
  res.send("Subathon bot with WebSocket is running!");
});

// Start server on Railway port or 3000 locally
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket server connection logs
wss.on("connection", ws => {
  console.log("New WebSocket client connected");
  ws.on("close", () => console.log("WebSocket client disconnected"));
});
