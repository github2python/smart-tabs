// Listener for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Tab Organizer installed!");
  initializeStorage();
});

// Default domains for each category
const defaultDomains = {
  Work: [
    "slack.com",
    "asana.com",
    "monday.com",
    "zoom.us",
    "trello.com",
    "gitlab.com",
    "github.com",
  ],
  Research: [
    "wikipedia.org",
    "arxiv.org",
    "scholar.google.com",
    "researchgate.net",
    "pubmed.ncbi.nlm.nih.gov",
  ],
  Entertainment: [
    "netflix.com",
    "spotify.com",
    "twitch.tv",
    "vimeo.com",
    "disneyplus.com",
  ],
  Others: [],
};

// Initialize storage with default data if empty
function initializeStorage() {
  chrome.storage.sync.get("userDefinedRules", (data) => {
    if (!data.userDefinedRules) {
      chrome.storage.sync.set({
        userDefinedRules: {
          Work: [],
          Research: [],
          Entertainment: [],
          Others: [],
        },
      });
    }
  });
}

// Load user-defined rules from chrome storage
function loadUserDefinedRules(callback) {
  chrome.storage.sync.get("userDefinedRules", (data) => {
    const userDefinedRules = data.userDefinedRules || {
      Work: [],
      Research: [],
      Entertainment: [],
      Others: [],
    };
    callback(userDefinedRules);
  });
}

// Listener for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "organizeTabs":
      organizeTabs(sendResponse);
      break;
    case "searchTab":
      searchTab(message.query, sendResponse);
      break;
    case "addKeyword":
      addKeyword(message.category, message.keyword, sendResponse);
      break;
    case "removeKeyword":
      removeKeyword(message.category, message.keyword, sendResponse);
      break;
    case "getKeywords":
      getKeywords(message.category, sendResponse);
      break;
    case "addCategory":
      addCategory(message.category, sendResponse);
      break;
    case "removeCategory":
      removeCategory(message.category, sendResponse);
      break;
    case "getCategories":
      getCategories(sendResponse);
      break;
    default:
      sendResponse({ success: false, message: "Unknown action" });
  }
  return true; // Keep the message channel open for async response
});

// Function to organize tabs into groups using Chrome's Tab Groups
function organizeTabs(sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    const categories = {
      Work: [],
      Research: [],
      Entertainment: [],
      Others: [],
    };

    chrome.tabs.query({}, (allTabs) => {
      allTabs.forEach((tab) => {
        let categorized = false;

        const url = new URL(tab.url);
        for (const [category, keywords] of Object.entries(userDefinedRules)) {
          if (
            keywords.some(
              (keyword) =>
                tab.title.toLowerCase().includes(keyword) ||
                url.pathname.toLowerCase().includes(keyword)
            )
          ) {
            categories[category].push(tab.id);
            categorized = true;
            break;
          }
        }

        if (!categorized) {
          for (const [category, domains] of Object.entries(defaultDomains)) {
            if (domains.some((domain) => url.host.includes(domain))) {
              categories[category].push(tab.id);
              categorized = true;
              break;
            }
          }
        }

        if (!categorized) {
          categories.Others.push(tab.id);
        }
      });

      const groupPromises = [];
      for (const category in categories) {
        if (categories[category].length > 0) {
          const tabIds = categories[category];
          groupPromises.push(
            new Promise((resolve) => {
              chrome.tabs.group({ tabIds }, (groupId) => {
                chrome.tabGroups.update(groupId, {
                  title: category,
                  color: getCategoryColor(category),
                });
                resolve();
              });
            })
          );
        }
      }

      Promise.all(groupPromises).then(() => {
        console.log("Tabs grouped:", categories);
        sendResponse({ success: true });
      });
    });
  });
}

// Function to get color for a category
function getCategoryColor(category) {
  const colors = {
    Work: "blue",
    Research: "green",
    Entertainment: "yellow",
    Others: "grey",
  };
  return colors[category] || "grey";
}

// Function to search for a tab by keywords in the URL and activate it
function searchTab(query, sendResponse) {
  chrome.tabs.query({}, (tabs) => {
    const matchingTab = tabs.find((tab) => tab.url.includes(query));
    if (matchingTab) {
      chrome.tabs.update(matchingTab.id, { active: true });
      chrome.windows.update(matchingTab.windowId, { focused: true });
      sendResponse({ success: true, tab: matchingTab });
    } else {
      sendResponse({ success: false, message: "No matching tab found." });
    }
  });
}

// Function to add a user-defined keyword for a specific category
function addKeyword(category, keyword, sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    if (!userDefinedRules[category]) {
      userDefinedRules[category] = [];
    }

    if (!userDefinedRules[category].includes(keyword)) {
      userDefinedRules[category].push(keyword);

      chrome.storage.sync.set({ userDefinedRules }, () => {
        console.log("Keyword added:", keyword);
        sendResponse({ success: true, message: "Keyword added." });
      });
    } else {
      sendResponse({ success: false, message: "Keyword already exists." });
    }
  });
}

// Function to remove a user-defined keyword from a specific category
function removeKeyword(category, keyword, sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    const index = userDefinedRules[category].indexOf(keyword);
    if (index !== -1) {
      userDefinedRules[category].splice(index, 1);
      chrome.storage.sync.set({ userDefinedRules }, () => {
        console.log("Keyword removed:", keyword);
        sendResponse({ success: true, message: "Keyword removed." });
      });
    } else {
      sendResponse({ success: false, message: "Keyword not found." });
    }
  });
}

// Function to get all keywords for a specific category
function getKeywords(category, sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    const keywords = userDefinedRules[category] || [];
    sendResponse({ success: true, keywords });
  });
}

// Function to get all categories
function getCategories(sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    const categories = Object.keys(userDefinedRules);
    sendResponse({ success: true, categories });
  });
}

// Function to add a new category
function addCategory(category, sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    if (!userDefinedRules[category]) {
      userDefinedRules[category] = [];
      chrome.storage.sync.set({ userDefinedRules }, () => {
        getCategories(sendResponse); // Ensure updated categories are sent back
      });
    } else {
      sendResponse({ success: false, message: "Category already exists." });
    }
  });
}

// Function to remove an existing category
function removeCategory(category, sendResponse) {
  loadUserDefinedRules((userDefinedRules) => {
    if (userDefinedRules[category]) {
      delete userDefinedRules[category];
      chrome.storage.sync.set({ userDefinedRules }, () => {
        getCategories(sendResponse); // Ensure updated categories are sent back
      });
    } else {
      sendResponse({ success: false, message: "Category not found." });
    }
  });
}
