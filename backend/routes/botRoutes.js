// backend/routes/botRoutes.js

require("dotenv").config();
const express = require("express");
const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
  TurnContext,
} = require("botbuilder");
const { RestaurantBot } = require("../bot/bot");
const { authenticateToken } = require("../controllers/authController");

const router = express.Router();
const bot = new RestaurantBot();

// Bot authentication config
const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.MICROSOFT_APP_ID || "",
  MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD || "",
  MicrosoftAppType: process.env.MICROSOFT_APP_TYPE || "MultiTenant",
  MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID || "",
});
const botFrameworkAuth = createBotFrameworkAuthenticationFromConfiguration(
  null,
  credentialsFactory
);
// Adaptor setup
const adapter = new CloudAdapter(botFrameworkAuth);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`[Bot Framework Error] ${error}`);
  await context.sendActivity("Oops! Something went wrong.");
};

// Microsoft Bot Framework Endpoint [POST]
router.post("/botframework", async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context);
  });
});

// REST Endpoint [POST]
router.post("/", authenticateToken, async (req, res) => {
  try {
    let { text, userId } = req.body;
    if (!text || !userId) {
      return res.status(400).json({ reply: "Invalid input." });
    }
    let responseText = "🤖 ...";
    const context = new TurnContext(
      { sendActivities: async () => [] },
      {
        type: "message",
        text,
        from: { id: userId },
        conversation: { id: userId },
        recipient: { id: "bot" },
        channelId: "rest",
        serviceUrl: "",
      }
    );
    context.sendActivity = async (message) => {
      responseText = typeof message === "string" ? message : message.text;
      if (bot.userProfile?.isAuthenticated && bot.userProfile?.userId) {
        res.setHeader("x-user-id", bot.userProfile.userId);
      }
    };
    const userProfile = {
      isAuthenticated: true,
      userId: userId,
      token: req.token,
      currentIntent: null,
      stateStack: null,
      contextData: {},
      cart: [],
    };
    await bot.userProfileAccessor.set(context, userProfile);
    await bot.conversationState.saveChanges(context);
    // Run the bot logic manually
    await bot.run(context);
    return res.json({ reply: responseText });
  } catch (error) {
    console.error("[REST Message Error]", error);
    return res
      .status(500)
      .json({ reply: "⚠️ Server error. Please try again." });
  }
});

module.exports = router;
