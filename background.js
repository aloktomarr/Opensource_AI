import config from './config.js';

// Remove the hardcoded API key
const DEEPSEEK_API_KEY = config.DEEPSEEK_API_KEY;

async function analyzeIssue(issueData) {
  try {
    // Check if we have valid issue data
    if (!issueData.title || !issueData.description || 
        issueData.title.trim() === '' || issueData.description.trim() === '') {
      return {
        suggestions: [
          "⚠️ Waiting for issue data to load...",
          "Please make sure you're on a valid GitHub issue page.",
          "The issue should have both a title and description."
        ].join('\n')
      };
    }

    // Check if issue data is just the default values
    if (issueData.title === "No title provided" && 
        issueData.description === "No description provided") {
      return {
        suggestions: [
          "⚠️ Issue data not found",
          "Please make sure you're on a valid GitHub issue page.",
          "Waiting for issue content to load..."
        ].join('\n')
      };
    }

    const requestBody = {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an expert programmer analyzing GitHub issues. 
                   Analyze the code issues and provide solutions in a structured JSON format.
                   Include 'analysis', 'solution', 'code_changes', and 'testing' sections.`
        },
        {
          role: "user",
          content: `Analyze this GitHub issue and provide a solution in JSON format:
          
          Repository: ${issueData.repoName}
          Primary Language: ${issueData.primaryLanguage}
          
          Issue Title: ${issueData.title}
          
          Issue Description: 
          ${issueData.description}
          
          Return the response in this JSON format:
          {
            "analysis": "Brief analysis of the issue",
            "solution": ["Step 1", "Step 2", ...],
            "code_changes": ["Change 1", "Change 2", ...],
            "testing": ["Test 1", "Test 2", ...]
          }`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false
    };

    console.log('Making API request...');
    const response = await fetch('https://api.deepseek.com/chat/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('API Response:', responseData);

    if (!response.ok) {
      throw new Error(`API Error: ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    if (!responseData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from API');
    }

    return { suggestions: responseData.choices[0].message.content };
  } catch (error) {
    console.error('Error analyzing issue:', error);
    throw error;
  }
}

// Add a function to test API connection
async function testApiConnection() {
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: "Hello"
          }
        ],
        max_tokens: 5
      })
    });

    if (!response.ok) {
      throw new Error('API connection test failed');
    }
    return true;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

async function getRepositoryContext(repoOwner, repoName) {
  try {
    // Get README content
    const readmeResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/readme`);
    const readmeData = await readmeResponse.json();
    const readme = atob(readmeData.content); // Decode base64

    // Get recent issues
    const issuesResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues?state=all&per_page=5`);
    const recentIssues = await issuesResponse.json();

    // Get repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`);
    const repoInfo = await repoResponse.json();

    return {
      readme,
      recentIssues: recentIssues.map(issue => ({
        title: issue.title,
        state: issue.state,
        labels: issue.labels
      })),
      repoInfo: {
        description: repoInfo.description,
        topics: repoInfo.topics,
        language: repoInfo.language,
        hasIssues: repoInfo.has_issues,
        hasProjects: repoInfo.has_projects,
        contributingGuidelines: repoInfo.has_contributing
      }
    };
  } catch (error) {
    console.error('Error fetching repository context:', error);
    return null;
  }
}

async function getContributionGuidelines(repoOwner, repoName) {
  try {
    // Common contribution guideline filenames
    const guidelineFiles = [
      'CONTRIBUTING.md',
      '.github/CONTRIBUTING.md',
      'docs/CONTRIBUTING.md',
      'CONTRIBUTE.md'
    ];

    for (const file of guidelineFiles) {
      try {
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file}`);
        if (response.ok) {
          const data = await response.json();
          return atob(data.content);
        }
      } catch (e) {
        continue;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching contribution guidelines:', error);
    return null;
  }
}

// Modified message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeIssue') {
    analyzeIssue(request.data)
      .then(response => {
        if (!response.error) {
          try {
            // Only try to parse as JSON if it's an API response
            if (response.suggestions.startsWith('⚠️')) {
              sendResponse({ suggestions: response.suggestions });
              return;
            }

            // Parse JSON response
            const parsedSuggestions = JSON.parse(response.suggestions);
            
            // Format the response for display
            const formattedResponse = [
              '📊 Analysis:',
              parsedSuggestions.analysis,
              '',
              '🛠️ Solution Steps:',
              ...parsedSuggestions.solution.map(s => `• ${s}`),
              '',
              '💻 Code Changes:',
              ...parsedSuggestions.code_changes.map(c => `• ${c}`),
              '',
              '🧪 Testing:',
              ...parsedSuggestions.testing.map(t => `• ${t}`)
            ].join('\n');

            sendResponse({ suggestions: formattedResponse });
          } catch (error) {
            // Fallback to simple formatting if JSON parsing fails
            sendResponse({ suggestions: response.suggestions });
          }
        } else {
          sendResponse({ error: response.error });
        }
      })
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'testConnection') {
    testApiConnection()
      .then(success => sendResponse({ success }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (request.action === 'testAPI') {
    testDeepseekAPI()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Add this function to test the API connection
async function testDeepseekAPI() {
  const testBody = {
    model: "deepseek-chat",
    messages: [
      {
        role: "user",
        content: "Return this as JSON: {\"test\": \"success\"}"
      }
    ],
    temperature: 0.3,
    max_tokens: 100
  };

  try {
    const response = await fetch('https://api.deepseek.com/chat/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(testBody)
    });

    const data = await response.json();
    console.log('API Test Response:', data);
    return data;
  } catch (error) {
    console.error('API Test Failed:', error);
    throw error;
  }
}

const enhancedPrompt = `
Analyze this GitHub issue and provide contribution guidance:

Repository Context:
- Name: ${repoInfo.name}
- Description: ${repoInfo.description}
- Primary Language: ${repoInfo.language}
- Topics: ${repoInfo.topics.join(', ')}

Contributing Guidelines Summary:
${contributingGuidelines ? contributingGuidelines.substring(0, 500) + '...' : 'No explicit guidelines found'}

Recent Similar Issues:
${similarIssues.map(issue => `- ${issue.title} (${issue.state})`).join('\n')}

Current Issue:
Title: ${issueData.title}
Description: ${issueData.description}

Please provide:
1. Issue Analysis
   - Issue type (bug/feature/docs)
   - Complexity assessment
   - Required expertise

2. Contribution Steps
   - Setup requirements
   - Development workflow
   - Testing requirements

3. Related Resources
   - Similar issues/PRs
   - Relevant documentation
   - Helpful community links

4. Best Practices
   - Code style guidelines
   - Commit message format
   - PR submission tips
`; 