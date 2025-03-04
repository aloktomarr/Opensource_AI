// Mock data for testing
const mockSuggestions = {
  "bug": [
    "Check if the error occurs in the latest version",
    "Try reproducing the issue in a different browser",
    "Look for similar issues in the closed issues"
  ],
  "feature": [
    "Review existing feature requests",
    "Check if this aligns with project roadmap",
    "Consider backward compatibility"
  ],
  "documentation": [
    "Update README.md",
    "Add code examples",
    "Include troubleshooting steps"
  ]
};

function createSuggestionsPopup(suggestions, isError = false) {
  const popup = document.createElement('div');
  popup.className = 'ai-suggestions-popup';
  popup.dataset.state = 'expanded';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'popup-header';
  
  const title = document.createElement('h3');
  title.textContent = isError ? 'Error' : 'AI Suggestions';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'popup-buttons';

  const minimizeButton = document.createElement('button');
  minimizeButton.innerHTML = '−';
  minimizeButton.className = 'minimize-button';
  minimizeButton.title = 'Minimize';
  minimizeButton.onclick = () => togglePopupState(popup);
  
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.className = 'close-button';
  closeButton.title = 'Close';
  closeButton.onclick = () => popup.remove();
  
  buttonContainer.appendChild(minimizeButton);
  buttonContainer.appendChild(closeButton);
  header.appendChild(title);
  header.appendChild(buttonContainer);
  popup.appendChild(header);

  const content = document.createElement('div');
  content.className = 'popup-content';

  if (isError) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = suggestions.join('\n');
    content.appendChild(errorMessage);
  } else {
    suggestions.forEach((suggestion, index) => {
      if (suggestion.startsWith('📊') || suggestion.startsWith('🛠️') || 
          suggestion.startsWith('💻') || suggestion.startsWith('🧪')) {
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.textContent = suggestion;
        sectionHeader.style.animationDelay = `${index * 0.1}s`;
        content.appendChild(sectionHeader);
      } else if (suggestion.startsWith('•')) {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.style.animationDelay = `${index * 0.1}s`;
        
        const bullet = document.createElement('span');
        bullet.className = 'bullet';
        bullet.textContent = '•';
        
        const text = document.createElement('span');
        text.className = 'suggestion-text';
        text.textContent = suggestion.substring(2);
        
        item.appendChild(bullet);
        item.appendChild(text);
        content.appendChild(item);
      } else if (suggestion.trim() !== '') {
        const text = document.createElement('div');
        text.className = 'suggestion-text';
        text.textContent = suggestion;
        text.style.padding = '0 12px';
        content.appendChild(text);
      }
    });
  }
  
  popup.appendChild(content);
  makeDraggable(popup);
  return popup;
}

function togglePopupState(popup) {
  const currentState = popup.dataset.state;
  const content = popup.querySelector('.popup-content');
  const minimizeButton = popup.querySelector('.minimize-button');
  
  if (currentState === 'expanded') {
    // Minimize
    popup.dataset.state = 'minimized';
    content.style.display = 'none';
    minimizeButton.innerHTML = '+';
    minimizeButton.title = 'Expand';
    popup.classList.add('minimized');
  } else {
    // Expand
    popup.dataset.state = 'expanded';
    content.style.display = 'block';
    minimizeButton.innerHTML = '−';
    minimizeButton.title = 'Minimize';
    popup.classList.remove('minimized');
  }
}

function makeDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  element.querySelector('.popup-header').onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

async function waitForElement(selector, timeout = 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

async function getRepositoryInfo() {
  const pathParts = window.location.pathname.split('/');
  const repoName = `${pathParts[1]}/${pathParts[2]}`;
  
  // Wait for language element to be available
  const languageElement = await waitForElement('[itemprop="programmingLanguage"]');
  const primaryLanguage = languageElement ? languageElement.textContent.trim() : 'Unknown';
  
  return {
    repoName,
    primaryLanguage
  };
}

async function analyzePage() {
  try {
    // Wait for issue elements to be available
    const titleElement = await waitForElement('[data-testid="issue-header"]');
    const bodyElement = await waitForElement('[data-testid="markdown-body"]');

    if (!titleElement || !bodyElement) {
      throw new Error('Could not find issue elements. Please make sure you are on a GitHub issue page.');
    }

    const title = titleElement.textContent.trim();
    const description = bodyElement.textContent.trim();

    // Remove existing popup if any
    const existingPopup = document.querySelector('.ai-suggestions-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create and show loading popup
    const loadingPopup = createLoadingPopup();
    document.body.appendChild(loadingPopup);

    // Get repository context
    const repoInfo = await getRepositoryInfo();
    
    // Send data to background script for analysis
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeIssue',
      data: {
        title: title || 'No title provided',
        description: description || 'No description provided',
        ...repoInfo
      }
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Parse suggestions from AI response
    const suggestions = response.suggestions
      .split('\n')
      .filter(line => line.trim().length > 0);

    // Remove loading popup and show suggestions
    loadingPopup.remove();
    const popup = createSuggestionsPopup(suggestions);
    document.body.appendChild(popup);
  } catch (error) {
    console.error('Error in analyzePage:', error);
    // Show error in popup
    const errorPopup = createSuggestionsPopup([
      'Error analyzing issue.',
      'Please try again later.',
      `Details: ${error.message}`
    ], true);
    document.body.appendChild(errorPopup);
  }
}

function createLoadingPopup() {
  const popup = document.createElement('div');
  popup.className = 'ai-suggestions-popup';
  
  const header = document.createElement('div');
  header.className = 'popup-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Analyzing Issue...';
  
  header.appendChild(title);
  popup.appendChild(header);

  const loader = document.createElement('div');
  loader.className = 'loader';
  popup.appendChild(loader);
  
  return popup;
}

// Wait for page load and then run analysis
if (window.location.pathname.includes('/issues/')) {
  // Wait for DOM content to be loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', analyzePage);
  } else {
    analyzePage();
  }

  // Also handle dynamic navigation (GitHub's SPA navigation)
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      if (currentPath.includes('/issues/')) {
        analyzePage();
      }
    }
  }, 1000);
} 