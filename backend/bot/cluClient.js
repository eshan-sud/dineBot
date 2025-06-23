// backend/bot/cluClient.js

const {
  ConversationAnalysisClient,
} = require("@azure/ai-language-conversations");
const { AzureKeyCredential } = require("@azure/core-auth");
require("dotenv").config();

const cluClient = new ConversationAnalysisClient(
  process.env.AZURE_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_KEY)
);

module.exports = cluClient;
