# Context Compaction Feature Plan for CLI Agent

## Phase 1: Requirements & Strategy
*   **Define Constraints & Thresholds:** Determine the maximum token limit for the context window and the threshold that triggers compaction (e.g., 80% of max token capacity).
*   **Choose a Compaction Strategy:** Decide on the primary method for context reduction. Potential strategies include:
    *   *Sliding Window / Truncation:* Discard the oldest messages (excluding the system prompt). This is the fastest and cheapest method.
    *   *Summarization:* Use a background LLM call to summarize older conversation turns into a dense block of text, retaining key facts while discarding verbose dialogue.
    *   *Hybrid:* Retain the system prompt, summarize the oldest $N$ messages, and keep the most recent $M$ messages verbatim.
*   **Select Tokenization Tooling:** Choose a lightweight token-counting library (e.g., `tiktoken` for OpenAI models) that matches your agent's primary models.

## Phase 2: Design & Architecture
*   **Configuration Updates:** Introduce new settings to your agent's configuration file/flags:
    *   `--enable-compaction` (boolean)
    *   `--compaction-strategy` (enum: truncate, summarize, hybrid)
    *   `--max-context-tokens` (integer)
*   **State Management Refactoring:** Ensure the context manager (which holds the conversation history) is decoupled enough to allow seamless modification/mutation of the message array before dispatching to the API.

## Phase 3: Implementation
*   **Step 1: Implement Token Counting:** Create a utility function that counts the total tokens of the current conversation payload. Hook this in right before the agent sends a request.
*   **Step 2: Build the Trigger Mechanism:** Add logic that compares the current token count against the `max-context-tokens` threshold.
*   **Step 3: Develop Compaction Logic:**
    *   *If Truncation:* Safely remove indices from the message list, ensuring system prompts or pinned contextual data are never deleted.
    *   *If Summarization:* Create a hidden, internal LLM request instructing the model to "Summarize the following conversation history strictly retaining facts, code snippets, and user preferences." Replace the old messages with the new summary message.
*   **Step 4: User Experience (UX):** Add CLI logging or visual indicators (e.g., `[System: Context compacted to save tokens]`) so the user understands why the agent might have momentarily paused or shifted state.

## Phase 4: Testing & Validation
*   **Unit Tests:** 
    *   Test the token counter against known text samples.
    *   Test the compaction array manipulation (e.g., ensuring system prompts aren't dropped).
*   **Integration Tests:** Write a script that feeds dummy text into the CLI agent in a loop to intentionally breach the token limit and verify that compaction successfully prevents API `context_length_exceeded` errors.
*   **Quality Assurance:** Conduct manual testing to ensure that the agent still remembers the core topic and instructions after a summarization-based compaction occurs.

## Phase 5: Documentation & Rollout
*   **Documentation:** Update the `README.md` to explain the new feature, how it helps with API costs and limits, and how users can configure it.
*   **Release:** Roll out the feature. Consider keeping summarization-based compaction as an opt-in feature initially, while making simple truncation the default fallback behavior.# Context Compaction Feature Plan for CLI Agent

## Phase 1: Requirements & Strategy
*   **Define Constraints & Thresholds:** Determine the maximum token limit for the context window and the threshold that triggers compaction (e.g., 80% of max token capacity).
*   **Choose a Compaction Strategy:** Decide on the primary method for context reduction. Potential strategies include:
    *   *Sliding Window / Truncation:* Discard the oldest messages (excluding the system prompt). This is the fastest and cheapest method.
    *   *Summarization:* Use a background LLM call to summarize older conversation turns into a dense block of text, retaining key facts while discarding verbose dialogue.
    *   *Hybrid:* Retain the system prompt, summarize the oldest $N$ messages, and keep the most recent $M$ messages verbatim.
*   **Select Tokenization Tooling:** Choose a lightweight token-counting library (e.g., `tiktoken` for OpenAI models) that matches your agent's primary models.

## Phase 2: Design & Architecture
*   **Configuration Updates:** Introduce new settings to your agent's configuration file/flags:
    *   `--enable-compaction` (boolean)
    *   `--compaction-strategy` (enum: truncate, summarize, hybrid)
    *   `--max-context-tokens` (integer)
*   **State Management Refactoring:** Ensure the context manager (which holds the conversation history) is decoupled enough to allow seamless modification/mutation of the message array before dispatching to the API.

## Phase 3: Implementation
*   **Step 1: Implement Token Counting:** Create a utility function that counts the total tokens of the current conversation payload. Hook this in right before the agent sends a request.
*   **Step 2: Build the Trigger Mechanism:** Add logic that compares the current token count against the `max-context-tokens` threshold.
*   **Step 3: Develop Compaction Logic:**
    *   *If Truncation:* Safely remove indices from the message list, ensuring system prompts or pinned contextual data are never deleted.
    *   *If Summarization:* Create a hidden, internal LLM request instructing the model to "Summarize the following conversation history strictly retaining facts, code snippets, and user preferences." Replace the old messages with the new summary message.
*   **Step 4: User Experience (UX):** Add CLI logging or visual indicators (e.g., `[System: Context compacted to save tokens]`) so the user understands why the agent might have momentarily paused or shifted state.

## Phase 4: Testing & Validation
*   **Unit Tests:** 
    *   Test the token counter against known text samples.
    *   Test the compaction array manipulation (e.g., ensuring system prompts aren't dropped).
*   **Integration Tests:** Write a script that feeds dummy text into the CLI agent in a loop to intentionally breach the token limit and verify that compaction successfully prevents API `context_length_exceeded` errors.
*   **Quality Assurance:** Conduct manual testing to ensure that the agent still remembers the core topic and instructions after a summarization-based compaction occurs.

## Phase 5: Documentation & Rollout
*   **Documentation:** Update the `README.md` to explain the new feature, how it helps with API costs and limits, and how users can configure it.
*   **Release:** Roll out the feature. Consider keeping summarization-based compaction as an opt-in feature initially, while making simple truncation the default fallback behavior.