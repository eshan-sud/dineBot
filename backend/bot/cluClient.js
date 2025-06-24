// backend/bot/cluClient.js

const {
  ConversationAnalysisClient,
} = require("@azure/ai-language-conversations");
const { AzureKeyCredential } = require("@azure/core-auth");

const endpoint = process.env.AZURE_ENDPOINT;
const apiKey = process.env.AZURE_KEY;

if (!endpoint || !apiKey) {
  throw new Error("Missing Azure CLU endpoint or key in .env");
}
const cluClient = new ConversationAnalysisClient(
  endpoint,
  new AzureKeyCredential(apiKey)
);
console.log("Azure CLU Client connected");

exports.getIntentAndEntities = async (text) => {
  const result = await cluClient.analyzeConversation({
    kind: "Conversation",
    analysisInput: {
      conversationItem: {
        id: "1",
        participantId: "1",
        text: text,
      },
    },
    parameters: {
      projectName: project_name,
      deploymentName: deployment_name,
      stringIndexType: "TextElement_V8",
    },
  });
  const prediction = result.result.prediction;
  return {
    topIntent: prediction.topIntent,
    entities: prediction.entities,
  };
};
