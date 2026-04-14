# Agent 007 🕵️‍♂️

**Yet another AI agent coding harness.**

Agent 007 is an interactive AI assistant designed to help you with coding tasks. It leverages Google's Gemini models to understand your codebase, execute tools, and assist you in development.

## Features

- 🤖 **Interactive CLI**: Engage in a dialogue with the agent to solve coding problems.
- 🛠️ **Tool Execution**: The agent can read/write files, search code (grep, find), and run commands (with your approval).
- 🔍 **Project Awareness**: Scans your project to understand the language, framework, and structure for better assistance.
- 🧠 **Context Compaction**: Automatically manages chat history to stay within model context limits.
- 🔄 **Session Management**: Persists session data for continuity.
- 🎯 **Planning Agent**: (In Progress) Can create and execute plans for complex tasks.

## Installation

You can install it from npm (if published):

```bash
npm install @kalenkevich/agent_007 -g
```

Or run it directly from the source:

1. Clone the repository:
   ```bash
   git clone https://github.com/kalenkevich/agent_007.git
   cd agent_007
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

Set your Gemini API key as an environment variable:

```bash
export GEMINI_API_KEY="your-api-key"
```

_(Alternatively, it will look for `GOOGLE_API_KEY`)_

Run the agent:

```bash
# If installed globally
agent007

# Or from the repository root
npm start
```

## Development

### Scripts

- `npm run build`: Compiles TypeScript source code.
- `npm start`: Runs the agent in debug mode.
- `npm test`: Runs all tests (unit, integration, e2e).
- `npm run test:unit`: Runs only unit tests.
- `npm run test:integration`: Runs integration tests.
- `npm run test:e2e`: Runs end-to-end tests.

## License

ISC
