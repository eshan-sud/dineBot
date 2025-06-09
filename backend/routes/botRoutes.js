// backend/routes/botRoutes.js

const express = require("express");
const { BotFrameworkAdapter } = require("botbuilder");
const { RestaurantBot } = require("../bot/bot");
require("dotenv").config();

const router = express.Router();
const bot = new RestaurantBot();

// Adapter setup
const adapter = new BotFrameworkAdapter({
  appId: process.env.MICROSOFT_APP_ID || "",
  appPassword: process.env.MICROSOFT_APP_PASSWORD || "",
});

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`[Bot Error] ${error}`);
  await context.sendActivity("Oops! Something went wrong.");
};

// POST endpoint for messages
router.post("/messages", (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

module.exports = router;
