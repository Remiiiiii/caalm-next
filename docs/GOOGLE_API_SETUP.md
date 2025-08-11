# Google Gemini API Setup for Contract Analysis

## Overview

The contract analysis feature has been updated to use Google Gemini AI instead of OpenAI. This provides more reliable and cost-effective AI-powered contract analysis.

## Required Environment Variable

Add the following environment variable to your `.env.local` file:

```bash
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

## How to Get a Google Gemini API Key

1. **Visit Google AI Studio**

   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account

2. **Create API Key**

   - Click "Create API Key"
   - Choose "Create API Key in new project" or select an existing project
   - Copy the generated API key

3. **Set Environment Variable**
   - Create or edit `.env.local` in your project root
   - Add: `GOOGLE_API_KEY=your_api_key_here`
   - Restart your development server

## Verification

After setting up the API key:

1. Restart your development server: `npm run dev`
2. Try analyzing a contract document
3. Check the console for successful AI analysis responses

## Features

The updated contract analyzer provides:

- **Comprehensive Analysis**: Key terms, dates, financial info, parties
- **Risk Assessment**: Identified risks with severity levels
- **Opportunity Analysis**: Business opportunities and impact assessment
- **Compliance Review**: Regulatory and legal requirements
- **Performance Metrics**: Contract performance indicators
- **AI-Powered Recommendations**: Actionable insights and priorities

## Error Handling

If you see "Google Gemini API key is required for contract analysis":

1. Verify `GOOGLE_API_KEY` is set in `.env.local`
2. Ensure the API key is valid and has proper permissions
3. Check that the development server has been restarted

## Fallback Mode

If AI analysis fails, the system will automatically fall back to basic analysis using contract metadata and extracted information.

## Support

For issues with Google Gemini API:

- Check [Google AI Studio Documentation](https://ai.google.dev/docs)
- Verify API key permissions and quotas
- Ensure your account has access to Gemini models
