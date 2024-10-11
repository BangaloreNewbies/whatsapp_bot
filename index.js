const { Client, LocalAuth, Poll, RemoteAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const job = require("node-schedule");
const {
  sendDailyPoll,
  addBirthday,
  sendBirthdayWish,
  sendWelcomeMessage,
  listBirthdays,
  tagAdminsOnly,
  showBotHelp,
  getAllGroups,
  pinMessage,
  unpinMessage,
  searchSpotify,
  randomNumber,
  sendWaterReminder
} = require("./helperFunctions/helper");
const { SupabaseSessionStore } = require("./helperFunctions/supabase");

const express = require("express");
app = express();

app.use(express.static("public"));

let qrCodeImageUrl = null;
let clientReady = false;

const wwebVersion = "2.2412.54";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer:{
    headless:true,
    //executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],

  }
});

client.initialize();

client.on("qr", (qr) => {
  // qrcode.generate(qr, { small: true });
  qrcode.toDataURL(qr, (err, url) => {
    console.log("QR UPDATES");
    qrCodeImageUrl = url;
  });
});

client.on("auth_failure", () => {
  console.log("Authentication failed, Please login again.");
});

client.on("loading_screen", () => {
  console.log("Loading screen. Please wait...");
});
client.on("disconnected", () => {
  console.log("Disconnected");
});

client.on("ready", () => {
  console.log("Client is ready.");
  clientReady = true;
  // getAllGroups(client);

  const randomMins = randomNumber(0, 59);

  job.scheduleJob(`${randomMins} 10 * * *`, async () => {
    sendDailyPoll(client);
  });

  job.scheduleJob("0 0 * * *", async () => {
    sendBirthdayWish(client);
  });

  job.scheduleJob(`${randomMins} 5-13/4 * * *`, async () => {
    sendWaterReminder(client);
  });
});

client.on("message", async (msg) => {
  if (msg.body === "!help") {
    showBotHelp(client, msg);
  }
  if (msg.body.startsWith("!birthday list")) {
    listBirthdays(msg, client);
  } else if (msg.body.startsWith("!birthday")) {
    addBirthday(msg, client);
  }
  // if (msg.body === "!everyone") {
  //   tagEveryone(msg);
  // }
  if (msg.body === "!admins") {
    tagAdminsOnly(msg);
  }
  if (msg.body === "!pin") {
    pinMessage(client,msg);
  }
  if (msg.body === "!unpin"){
    unpinMessage(client,msg);
  }
  if(msg.body.startsWith("!spotify")){
    searchSpotify(client,msg);
  }
});

client.on("group_join", async (notification) => {
  sendWelcomeMessage(notification, client);
});

// client.on("vote_update", async (vote) => {
//   console.log("vote_update", vote);
// });

app.get("/qr", (req, res) => {
  if (clientReady) {
    return res.json({ message: "Client is already authenticated" });
  }
  if (qrCodeImageUrl) {
    res.json({ qrCode: qrCodeImageUrl });
  } else {
    res.json({ message: "QR code not available. Please wait..." });
  }
});

app.get("/status", (req, res) => {
  res.json({ status: clientReady ? "ready" : "not ready" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running`);
});

const date = new Date();
const time = date.toLocaleTimeString();
console.log(`Current time: ${time}`);
