# Opensource_AI

A Chrome extension that enhances open source contribution by providing AI-powered insights for GitHub issues.

## Overview

Opensource_AI is a browser extension that helps developers better understand GitHub issues by sending the issue title and description to an AI service for analysis. This tool is particularly useful for:

- New contributors trying to understand complex issues
- Maintainers triaging large volumes of issues
- Developers looking for quick summaries or technical context

## Features

- **Issue Analysis**: Automatically extracts and analyzes GitHub issue content
- **AI-Powered Insights**: Leverages AI to provide context, suggestions, and explanations
- **Seamless Integration**: Works directly within the GitHub interface
- **Privacy-Focused**: Only processes publicly available issue information

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation
1. Clone this repository:
   ```
   git clone https://github.com/aloktomarr/Opensource_AI.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the cloned repository folder
5. The extension should now appear in your browser toolbar

## Usage

1. Navigate to any GitHub issue page
2. Click the Opensource_AI extension icon in your browser toolbar
3. The extension will analyze the issue and display AI-generated insights
4. Use these insights to better understand the context, complexity, and potential solutions

## Technical Implementation

This extension is built using:
- JavaScript
- Chrome Extension Manifest V3
- Content scripts for GitHub page integration
- Background service workers for API communication
- CSS for styling the interface

## Project Structure
