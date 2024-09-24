const { MessageMedia, Poll } = require("whatsapp-web.js");
const {
  storeBirthday,
  checkBirthdaysToday,
  listBirthdaysInMonth,
} = require("./supabase");
require("dotenv").config();
const fitnessgroupID = process.env.FITNESS_GROUP_ID;
const gcGroupID = process.env.GC_GROUP_ID;

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessageWithTyping(msg, message, reply, mentions = []) {
  const chat = await msg.getChat();
  try {
    await chat.sendStateTyping();
    let typingDuration = randomNumber(2, 3) * 1000;
    await delay(typingDuration);

    const messageOptions = {};
    if (mentions.length > 0) {
      messageOptions.mentions = mentions;
    }

    if (reply) {
      await msg.reply(message, null, messageOptions);
    } else await chat.sendMessage(message, messageOptions);
    await chat.clearState();
  } catch (error) {
    console.error("Error sending message with typing status:", error);
  }
}

//Help Menu
async function showBotHelp(client, msg) {
  const helpMessage = `Available commands:
    !help - Show this help message
    !admins - Tag admins only
    !birthday DD-MM-YYYY - Add or update your birthday
    !birthday list (1-12) - List of upcoming birthdays in this month
    - (optional - enter number to get birthdays from a particular month)
    !pin - Reply to pin a message (admins only)
    !unpin - Reply to unpin a message (admins only)`;

  await sendMessageWithTyping(msg, helpMessage, true);
  // await msg.reply(helpMessage)
}

//Code to check all group names and its ID
function getAllGroups(client) {
  console.log("Getting all groups");
  client.getChats().then((chats) => {
    const groups = chats.filter((chat) => chat.isGroup);
    console.log("Groups:");
    groups.forEach((group) => {
      console.log(`${group.name} - ${group.id._serialized}`);
    });
  });
}

//Get all group admins
async function getGroupAdmins(chat) {
  const participants = await chat.participants;
  const admins = participants.filter(
    (participant) => participant.isAdmin || participant.isSuperAdmin
  );
  return admins.map((admin) => admin.id._serialized);
}

//Send welcome message to new users
async function sendWelcomeMessage(notification, client) {
  const groupId = notification.id.remote;
  const user = notification.recipientIds[0];

  const gcwelcomeMessage = `*Newbies Bot*: Welcome @${user.replace(
    "@c.us",
    ""
  )}! We're glad to have you in this group. Please give us your introduction and your hobbies.
  Type !help to access bot commands`;

  const fitnessWelcomeMessage = `*Newbies Bot*: Welcome @${user.replace(
    "@c.us",
    ""
  )}! We're glad to have you in this group. Please give us your introduction and your fitness goals.
  Type !help to access bot commands`;

  const techWelcomeMessage = `*Newbies Bot*: Welcome @${user.replace(
    "@c.us",
    ""
  )}! We're glad to have you in this group. Please give us your introduction and your tech stack. If not tech, please share the tools that you use in your day-to-day work.`;

  if (groupId === gcGroupID)
    await client.sendMessage(gcGroupID, gcwelcomeMessage, {
      mentions: [user],
    });
  if (groupId === fitnessgroupID)
    await client.sendMessage(fitnessgroupID, fitnessWelcomeMessage, {
      mentions: [user],
    });
}

// Daily poll on fitness group
async function sendDailyPoll(client) {
  const fitnessPoll = new Poll("Completed Daily Challenge?", [
    "Yes",
    "No, but went to the gym",
    "No, but played sports",
    "No",
    "Did my own daily challenge (pls share)",
  ]);

  const media = MessageMedia.fromFilePath("weekly_exercise_plan.pdf");
  await client.sendMessage(fitnessgroupID, media, {
    caption:
      "From *Fitness Bot* : Greetings! Its time for your daily fitness routine. Remember to stretch and warm up before you start!",
  });

  await client.sendMessage(fitnessgroupID, fitnessPoll);
}

// ################# Tag functions #################

// Tag Admins
async function tagAdminsOnly(msg) {
  const chat = await msg.getChat();
  let mentions = [];
  let text = "Notification to Admins: ";
  if (chat.isGroup) {
    const admins = await getGroupAdmins(chat);
    for (let admin of admins) {
      mentions.push(admin);
      text += `@${admin} `.replace("@c.us", "");
    }

    setTimeout(async () => {
      await chat.sendStateTyping();
      let typingDuration = randomNumber(1.2, 3) * 1000;
      await delay(typingDuration);
      await chat.sendMessage(text, { mentions });
      await chat.clearState();
    }, 500);
  }
}

// ################# Pin Message ##############
async function pinMessage(client, msg) {
  try {
    const chat = await msg.getChat();

    if (chat.isGroup) {
      const admins = await getGroupAdmins(chat);
      const isAdmin = admins.includes(msg.author);
      const quotedMessage = await msg.getQuotedMessage();

      if (!quotedMessage){
        await sendMessageWithTyping(
          msg,
          "Reply to a message with !pin to pin the message.",
          true
        );
      return;
      }
      if (!isAdmin) {
        await sendMessageWithTyping(
          msg,
          "You need to be a group admin to perform this action.",
          true
        );
        return;
      } else {
        const duration = 86400 * 7; // duration in seconds for 24 hours * 7 days
        const result = await quotedMessage.pin(duration);
        console.log(result)
        if (!result) {
          await sendMessageWithTyping(msg, "Failed to pin the message.", true, {
            mentions: [msg.author],
          });
        }
      }
    } else {
      await sendMessageWithTyping(
        msg,
        "This action can only be performed in group chats.",
        true
      );
    }
  } catch (error) {
    console.error("Error trying to pin the message:", error);
  }
}

async function unpinMessage(client, msg) {
  try {
    const chat = await msg.getChat();

    if (chat.isGroup) {
      const admins = await getGroupAdmins(chat);
      const isAdmin = admins.includes(msg.author);
      const pinnedMsg = await msg.getQuotedMessage();

      if (!pinnedMsg) {
        await sendMessageWithTyping(
          msg,
          "Reply to a message with !unpin to unpin the message.",
          true
        );
      }

      if (!isAdmin) {
        await sendMessageWithTyping(
          msg,
          "You need to be a group admin to perform this action.",
          true
        );
        return;
      } else {
        
          if (pinnedMsg) {
          const result = await pinnedMsg.unpin();
          
        }
      }
    } else {
      await sendMessageWithTyping(
        msg,
        "This action can only be performed in group chats.",
        true
      );
    }
  } catch (error) {
    console.error("Error trying to unpin the message:", error);
    await sendMessageWithTyping(
      msg,
      "An error occurred while attempting to unpin the message.",
      true
    );
  }
}

//Tag everyone (admin operation only)
// async function tagEveryone(msg) {
//   const chat = await msg.getChat();

//   if (chat.isGroup) {
//       const admins = await getGroupAdmins(chat);
//       const isAdmin = admins.includes(msg.author);

//       if (!isAdmin) {
//           await msg.reply("You need to be a group admin to perform this action.");
//           return;
//       }
//   }

//   let mentions = [];
//   let messages = [];

//   const batchSize = 80;
//   for (let i = 0; i < chat.participants.length; i += batchSize) {
//       let batch = chat.participants.slice(i, i + batchSize);
//       let text = "";
//       let batchMentions = [];

//       for (let participant of batch) {
//           batchMentions.push(`${participant.id.user}@c.us`);
//           text += `@${participant.id.user} `;
//       }

//       messages.push({ text, mentions: batchMentions });
//   }

//   for (let message of messages) {
//       try {
//           await chat.sendStateTyping();
//           let typingDuration = randomNumber(1.5, 3) * 1000;
//           await delay(typingDuration);
//           await chat.sendMessage(message.text, { mentions: message.mentions });
//           await chat.clearState();

//           await delay(500); // Adjust delay time as needed
//       } catch (error) {
//           console.error("Error sending message with mentions:", error);
//           return;
//       }
//   }
// }

// ################ BIRTHDAY FUNCTIONS #################

function isValidDate(dateString) {
  const regex = /^(\d{2})-(\d{2})-(\d{4})$/;

  const match = dateString.match(regex);
  if (!match) return false;

  const [, day, month, year] = match.map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

async function addBirthday(msg, client) {
  
  const birthday = msg.body.split(" ")[1];

    if (!birthday) {
      sendMessageWithTyping(msg,"Usage: !birthday DD-MM-YYYY",true);
        return;
    }

    if (!isValidDate(birthday)) {
      sendMessageWithTyping(msg,"Please enter a valid date in the format: DD-MM-YYYY",true);
    } else {
      const [day, month, year] = birthday.split("-");
      const formattedBirthday = `${year}-${month.padStart(
        2,
        "0"
      )}-${day.padStart(2, "0")}`;
      console.log(`Birthday: ${formattedBirthday}`);

      await storeBirthday(msg.author, formattedBirthday).then(() => {
        sendMessageWithTyping(msg,`@${msg.author.replace("@c.us","")} Your Birthday has been set successfully!`,false,[msg.author]);

        // client.sendMessage(msg.from,
        //   `@${msg.author.replace("@c.us","")} Your Birthday has been set successfully!`,
        //   {mentions: [msg.author]}
        // );
      });
    }
}

async function sendBirthdayWish(client) {
  
    const birthdays = await checkBirthdaysToday();

    console.log(birthdays);

  if (birthdays.length) {
    let text = "";
    let mentions = [];

    for (let b of birthdays) {
      mentions.push(b);
      text += `@${b} `.replace('@c.us',"");
    }

      const birthdayMessage = `🎉 *Birthday Alert* \n Today we celebrate: ${text}! Happy Birthday! Party hard!!! 🎂🥳`;

      client.sendMessage(gcGroupID, birthdayMessage,{mentions});
  }
}

function formatDate(inputDate) {
  const date = new Date(inputDate);

  const day = date.getDate();
  const month = date.getMonth();

  return `${day} ${months[month]}`;
}

async function listBirthdays(msg, client) {
  
  const month = msg.body.split(" ")[2];
  let bdays;
  let mentions = []
  let text = ''
  let birthdayListMessage;
  if(!month) bdays = await listBirthdaysInMonth()
  else bdays = await listBirthdaysInMonth(month);

  for (let {user_id, birthday} of bdays) {
      mentions.push(user_id);
      text += `@${user_id} : ${formatDate(birthday)} \n`.replace('@c.us',"");
  }

  if(!month) birthdayListMessage = `🎂 Upcoming Birthdays 🎉 \n ${text.length>0 ? text:"No one else this month"}`;
  else birthdayListMessage = `🎂 Birthdays in *${months[month-1]}*: \n ${text}`;

  sendMessageWithTyping(msg,birthdayListMessage,false,mentions);
  //client.sendMessage(msg.from,birthdayListMessage,{mentions});
}

module.exports = {
  getAllGroups,
  sendDailyPoll,
  getGroupAdmins,
  tagAdminsOnly,
  sendWelcomeMessage,
  addBirthday,
  sendBirthdayWish,
  listBirthdays,
  isValidDate,
  showBotHelp,
  pinMessage,
  unpinMessage,
};
