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

function createSuggestionsPopup(suggestions) {
  const popup = document.createElement('div');
  popup.className = 'ai-suggestions-popup';
  popup.dataset.state = 'expanded'; // Track popup state
  
  // Add header div for title and close button
  const header = document.createElement('div');
  header.className = 'popup-header';
  
  const title = document.createElement('h3');
  title.textContent = 'AI Suggestions';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'popup-buttons';

  // Add minimize button
  const minimizeButton = document.createElement('button');
  minimizeButton.innerHTML = '−';
  minimizeButton.className = 'minimize-button';
  minimizeButton.title = 'Minimize';
  minimizeButton.onclick = () => togglePopupState(popup);
  
  // Add close button
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

  // Create content container
  const content = document.createElement('div');
  content.className = 'popup-content';

  // Create sections for different types of suggestions
  suggestions.forEach((suggestion, index) => {
    if (suggestion.startsWith('📊') || suggestion.startsWith('🛠️') || 
        suggestion.startsWith('💻') || suggestion.startsWith('🧪')) {
      // Create section header
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'section-header';
      sectionHeader.textContent = suggestion;
      content.appendChild(sectionHeader);
    } else if (suggestion.startsWith('•')) {
      // Create animated list item
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
      // Regular text
      const text = document.createElement('div');
      text.className = 'suggestion-text';
      text.textContent = suggestion;
      content.appendChild(text);
    }
  });
  
  popup.appendChild(content);

  // Make popup draggable
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

async function waitForElement(selector, timeout = 10000) {
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
  let loadingPopup = null;  // Declare once at the top
  try {
    console.log('Starting analysis...');
    
    // Wait for issue elements to be available
    console.log('Waiting for title element...');
    const titleElement = await waitForElement('[data-testid="issue-header"]');
    console.log('Waiting for body element...');
    const bodyElement = await waitForElement('[data-testid="markdown-body"]');

    if (!titleElement || !bodyElement) {
      throw new Error('Could not find issue elements. Please make sure you are on a GitHub issue page.');
    }

    console.log('Elements found, extracting content...');
    const title = titleElement.textContent.trim();
    const description = bodyElement.textContent.trim();

    console.log('Title:', title.substring(0, 50) + '...');
    console.log('Description:', description.substring(0, 50) + '...');

    // Remove existing popup if any
    const existingPopup = document.querySelector('.ai-suggestions-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create and show loading popup
    loadingPopup = createLoadingPopup();  // Use existing variable
    document.body.appendChild(loadingPopup);

    // Get repository context
    console.log('Getting repository info...');
    const repoInfo = await getRepositoryInfo();
    console.log('Repository info:', repoInfo);
    
    // Send data to background script for analysis
    console.log('Sending message to background script...');
    const response = await chrome.runtime.sendMessage({
      action: 'analyzeIssue',
      data: {
        title: title || 'No title provided',
        description: description || 'No description provided',
        ...repoInfo
      }
    });

    console.log('Received response:', response);

    if (response.error) {
      throw new Error(response.error);
    }

    // Remove loading popup
    if (loadingPopup) {
      loadingPopup.remove();
    }

    // Changed: Handle response.suggestions directly
    if (typeof response.suggestions === 'string') {
      const suggestions = response.suggestions
        .split('\n')
        .filter(line => line.trim().length > 0);

      const popup = createSuggestionsPopup(suggestions);
      document.body.appendChild(popup);
    } else {
      throw new Error('Invalid response format from API');
    }

  } catch (error) {
    console.error('Error in analyzePage:', error);
    // Show error in popup
    if (loadingPopup) {
      loadingPopup.remove();
    }
    const errorPopup = createSuggestionsPopup([
      'Error analyzing issue.',
      'Please try again later.',
      `Details: ${error.message}`
    ]);
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