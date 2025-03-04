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
                   Analyze the code issues and provide solutions in a structured format.
                   Return your response as a JSON object with specific sections.`
        },
        {
          role: "user",
          content: `Analyze this GitHub issue and provide a solution in JSON format:
          
          Repository: ${issueData.repoName}
          Primary Language: ${issueData.primaryLanguage}
          
          Issue Title: ${issueData.title}
          
          Issue Description: 
          ${issueData.description}`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false,
      top_p: 0.95,
      presence_penalty: 0,
      frequency_penalty: 0,
      response_format: {
        type: "json_object",
        schema: {
          type: "object",
          properties: {
            analysis: {
              type: "string",
              description: "Brief analysis of the issue"
            },
            solution: {
              type: "array",
              items: {
                type: "string"
              },
              description: "List of specific solution steps"
            },
            code_changes: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Suggested code modifications"
            },
            testing: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Testing suggestions"
            }
          }
        }
      }
    };

    console.log('Issue data received:', {
      title: issueData.title,
      description: issueData.description.substring(0, 100) + '...',
      repo: issueData.repoName,
      language: issueData.primaryLanguage
    });

    // Only proceed with API call if we have valid data
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('API Response:', responseData);

    if (!response.ok) {
      throw new Error(`API Error: ${responseData.error?.message || JSON.stringify(responseData)}`);
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
}); 