// Helper to populate the remove keyword dropdown
function populateRemoveKeywordDropdown(category) {
  const removeKeywordSelect = document.getElementById("removeKeywordSelect");
  removeKeywordSelect.innerHTML = ""; // Clear existing options

  chrome.storage.sync.get("userDefinedRules", (data) => {
    const userDefinedRules = data.userDefinedRules || {};
    const keywords = userDefinedRules[category] || [];

    if (keywords.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No keywords available";
      option.disabled = true;
      removeKeywordSelect.appendChild(option);
    } else {
      keywords.forEach((keyword) => {
        const option = document.createElement("option");
        option.value = keyword;
        option.textContent = keyword;
        removeKeywordSelect.appendChild(option);
      });
    }
  });
}

function populateCategoryDropdown() {
  const categorySelect = document.getElementById("categorySelect");
  const removeCategorySelect = document.getElementById("removeCategorySelect");

  categorySelect.innerHTML = ""; // Clear existing options
  removeCategorySelect.innerHTML = ""; // Clear existing options

  chrome.storage.sync.get("userDefinedRules", (data) => {
    const userDefinedRules = data.userDefinedRules || {};
    const categories = Object.keys(userDefinedRules);

    if (categories.length === 0) {
      const option = document.createElement("option");
      option.textContent = "No categories available";
      option.disabled = true;
      categorySelect.appendChild(option);
      removeCategorySelect.appendChild(option.cloneNode(true));
    } else {
      categories.forEach((category) => {
        // Add to categorySelect
        const categoryOption = document.createElement("option");
        categoryOption.value = category;
        categoryOption.textContent = category;
        categorySelect.appendChild(categoryOption);

        // Add to removeCategorySelect
        const removeOption = document.createElement("option");
        removeOption.value = category;
        removeOption.textContent = category;
        removeCategorySelect.appendChild(removeOption);
      });
    }
  });
}

// Event listener for category selection to update removeKeyword dropdown
document
  .getElementById("categorySelect")
  .addEventListener("change", (event) => {
    const selectedCategory = event.target.value;
    populateRemoveKeywordDropdown(selectedCategory);
  });

// Populate dropdowns on page load
document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdown();
  // populateRemoveCategoryDropdown();
});
// Event listener for adding a new category
document.getElementById("addCategoryButton").addEventListener("click", () => {
  const newCategory = document.getElementById("newCategoryInput").value.trim();
  if (newCategory) {
    chrome.runtime.sendMessage(
      { action: "addCategory", category: newCategory }, // Updated key here
      (response) => {
        alert("Category added ");
        if (response.success) {
          populateCategoryDropdown(); // Update category dropdown
        }
      }
    );
  } else {
    alert("Please enter a valid category name.");
  }
});

// Function to remove a category
function removeCategory(category) {
  chrome.storage.sync.get("userDefinedRules", (data) => {
    const userDefinedRules = data.userDefinedRules || {};

    if (userDefinedRules[category]) {
      delete userDefinedRules[category]; // Remove the category

      chrome.storage.sync.set({ userDefinedRules }, () => {
        alert(`Category '${category}' removed successfully.`);
        populateCategoryDropdown(); // Update both dropdowns
      });
    } else {
      alert("Category not found!");
    }
  });
}

// Event listener for removing a category
document
  .getElementById("removeCategoryButton")
  .addEventListener("click", () => {
    const category = document.getElementById("removeCategorySelect").value;
    if (category) {
      // Call the removeCategory function
      removeCategory(category);
    } else {
      alert("Please select a category to remove.");
    }
  });
// Organize Tabs
document.getElementById("organizeTabs").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "organizeTabs" }, (response) => {
    if (response.success) {
      alert("Tabs organized into categories!");
    } else {
      alert("Failed to organize tabs.");
    }
  });
});

// Save Tabs
document.getElementById("saveTabs").addEventListener("click", () => {
  chrome.storage.local.get("categories", (data) => {
    console.log("Saved categories:", data.categories);
    alert("Tabs saved for later!");
  });
});

// Cleanup Tabs
document.getElementById("cleanupTabs").addEventListener("click", () => {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.active) {
        chrome.tabs.remove(tab.id);
      }
    });
    alert("Unused tabs closed!");
  });
});

// Search Tabs
document.getElementById("searchButton").addEventListener("click", () => {
  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    chrome.runtime.sendMessage({ action: "searchTab", query }, (response) => {
      const resultElement = document.getElementById("searchResult");
      if (response.success) {
        resultElement.textContent = `Tab found: ${response.tab.title}`;
      } else {
        resultElement.textContent =
          response.message || "No matching tab found.";
      }
    });
  } else {
    alert("Please enter a keyword to search.");
  }
});

// Add Keyword
document.getElementById("addKeyword").addEventListener("click", () => {
  const category = document.getElementById("categorySelect").value;
  const keyword = document.getElementById("keywordInput").value.trim();
  if (keyword) {
    chrome.runtime.sendMessage(
      { action: "addKeyword", category, keyword },
      (response) => {
        alert(response.message);
        if (response.success) {
          populateRemoveKeywordDropdown(category); // Update dropdown
        }
      }
    );
  }
});

// Remove Keyword
document.getElementById("removeKeywordButton").addEventListener("click", () => {
  const category = document.getElementById("categorySelect").value;
  const keyword = document.getElementById("removeKeywordSelect").value;
  if (keyword) {
    chrome.runtime.sendMessage(
      { action: "removeKeyword", category, keyword },
      (response) => {
        alert(response.message);
        if (response.success) {
          populateRemoveKeywordDropdown(category); // Update dropdown
        }
      }
    );
  }
});
