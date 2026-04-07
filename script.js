/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestionSection = document.getElementById("latestQuestionSection");
const latestQuestion = document.getElementById("latestQuestion");
const loadingIndicator = document.getElementById("loadingIndicator");

/* Conversation history starts with a focused system prompt */
const messages = [
  {
    role: "system",
    content:
      "You are a L'Oréal Beauty Advisor focused only on L'Oréal product discovery, beauty education, routines, and recommendations. Support skincare, haircare, makeup, fragrance, and closely related beauty topics. Politely refuse unrelated requests such as homework, coding help, politics, current events, sports, or general knowledge. Do not diagnose skin conditions or pretend to provide medical advice. Give safe, general beauty guidance instead. Ask short follow-up questions when needed, such as skin type, hair type, goals, concerns, or preferences. Keep responses concise, helpful, friendly, and brand-appropriate.",
  },
];

let userName = "";

// Move the loading indicator into the chat flow and give it a bubble layout.
function setupLoadingIndicator() {
  if (!chatWindow || !loadingIndicator) return;

  loadingIndicator.classList.add("msg-row", "assistant", "loading-row");
  loadingIndicator.textContent = "";

  const bubble = document.createElement("div");
  bubble.classList.add("msg", "assistant", "typing-bubble");

  const label = document.createElement("span");
  label.classList.add("typing-text");
  label.textContent = "Typing";

  const dots = document.createElement("span");
  dots.classList.add("typing-dots");

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement("span");
    dot.classList.add("typing-dot");
    dots.appendChild(dot);
  }

  bubble.appendChild(label);
  bubble.appendChild(dots);
  loadingIndicator.appendChild(bubble);
  chatWindow.appendChild(loadingIndicator);
}

setupLoadingIndicator();

// Add text safely and preserve line breaks.
function addTextWithLineBreaks(element, text) {
  const lines = String(text).split("\n");

  lines.forEach(function (line, index) {
    element.appendChild(document.createTextNode(line));
    if (index < lines.length - 1) {
      element.appendChild(document.createElement("br"));
    }
  });
}

// Add a message row and bubble to the chat window.
function addMessage(role, text) {
  const row = document.createElement("div");
  row.classList.add("msg-row");

  if (role === "user") {
    row.classList.add("user");
  } else {
    row.classList.add("assistant");
  }

  const bubble = document.createElement("div");
  bubble.classList.add("msg");

  if (role === "user") {
    bubble.classList.add("user");
  } else {
    // Keep both class names so styling works even if CSS uses either one.
    bubble.classList.add("ai", "assistant");
  }

  addTextWithLineBreaks(bubble, text);
  row.appendChild(bubble);
  chatWindow.appendChild(row);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Show the user's latest question above the chat window.
function updateLatestQuestion(text) {
  if (!latestQuestionSection || !latestQuestion) return;

  latestQuestion.textContent = "";
  latestQuestion.textContent = `Latest question: ${text}`;
  latestQuestionSection.hidden = false;
  latestQuestion.hidden = false;
}

// Show or hide the loading indicator.
function setLoading(isLoading) {
  if (!loadingIndicator) return;
  loadingIndicator.hidden = !isLoading;
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Simple frontend fallback for clearly unrelated topics.
function isClearlyUnrelated(text) {
  const lowerText = text.toLowerCase();

  const unrelatedKeywords = [
    "math",
    "algebra",
    "geometry",
    "homework",
    "javascript",
    "python",
    "coding",
    "programming",
    "bug",
    "sports",
    "score",
    "nba",
    "nfl",
    "soccer",
    "politics",
    "election",
    "president",
    "weather",
    "forecast",
    "temperature",
    "rain",
  ];

  return unrelatedKeywords.some(function (keyword) {
    return lowerText.includes(keyword);
  });
}

// Simple name tracking if the user shares it naturally.
function trackUserName(text) {
  if (userName) return;

  const match = text.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\-']*)/i);
  if (!match) return;

  const firstName = match[1];
  userName =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  messages.push({
    role: "system",
    content: `The user's name is ${userName}. Use their name naturally when helpful.`,
  });
}

// Call the Cloudflare Worker and return the assistant text.
async function getAssistantReply() {
  const response = await fetch("https://loreal-chatbot.bbeecher.workers.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error("Request failed. Please try again.");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* Initial assistant greeting */
const welcomeText =
  "Welcome to L'Oréal Beauty Advisor. I can help with skincare, makeup, haircare, fragrance, and personalized beauty routines. What would you like to explore today?";

addMessage("assistant", welcomeText);
messages.push({ role: "assistant", content: welcomeText });

/* Handle form submit */
chatForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const question = userInput.value.trim();
  if (!question) return;

  updateLatestQuestion(question);
  addMessage("user", question);
  messages.push({ role: "user", content: question });
  trackUserName(question);

  if (isClearlyUnrelated(question)) {
    const unrelatedMessage =
      "I can only help with L'Oréal products, beauty routines, and recommendations. Ask me anything about skincare, makeup, haircare, or fragrance.";
    addMessage("assistant", unrelatedMessage);
    messages.push({ role: "assistant", content: unrelatedMessage });
    userInput.value = "";
    return;
  }

  userInput.value = "";
  setLoading(true);

  try {
    const assistantReply = await getAssistantReply();
    addMessage("assistant", assistantReply);
    messages.push({ role: "assistant", content: assistantReply });
  } catch (error) {
    const fallbackMessage =
      "Sorry, I couldn't get a reply right now. Please try again in a moment.";
    addMessage("assistant", fallbackMessage);
    messages.push({ role: "assistant", content: fallbackMessage });
    console.error(error);
  } finally {
    setLoading(false);
  }
});
