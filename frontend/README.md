# Multi AI Agent For lounge Booking

This is a minimal viable product (MVP) React 18 chat app that directly communicates with AI APIs using Vercel's Multi Agent AI SDK. It is a lightweight client-side app without any backend or streaming functionality.

## Features

- Built with React 18  
- Uses Vercel Multi Agent AI SDK to generate responses from AI models  
- Supports multiple AI models selectable via a dropdown  
- Sends messages and receives responses in a single batch (no streaming)  
- Basic tool integration for scheduling, availability checking, and cart addition (via SDK tools)  
- Simple UI with input and message display  
- Not optimized or abstracted yet — MVP for client evaluation only  

## Installation

```bash
npm install

Usage

Start the development server:

npm run dev

The app will open locally, and you can interact with the AI by typing messages and selecting the AI model from the dropdown.
Notes

    There is no backend — all communication happens directly between the React app and AI APIs.

    This app is not streaming responses; it waits for the full response before updating the UI.

    The system instruction and other configurations should be updated according to your context and use case.

    This code is a starting point and lacks advanced error handling, optimization, and architectural abstractions.

    Designed as an MVP prototype to validate concepts with the client.

Next Steps for Improvement

    Add streaming response support for better user experience

    Implement backend proxy or middleware if needed for security and rate limiting

    Improve state management and code modularity

    Add more robust error handling and retries

    Abstract SDK usage into reusable hooks or services

    Enhance UI/UX for production readiness

Author

Nikhil Rao
