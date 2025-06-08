# CogniCanvas RAG 🧠🎨

CogniCanvas RAG is a highly advanced, client-side Retrieval Augmented Generation application designed to provide intelligent, context-aware answers from your documents. Explore your knowledge like never before!

---

## 📖 Table of Contents (Book Index)

1.  🚀 **Introduction**
    *   What is CogniCanvas RAG?
    *   Problem Solved
    *   Key Appeal / "Cool Factor"
2.  ✨ **Core Features**
    *   Advanced CRAG Capabilities
    *   User-Configurable LLM (OpenRouter Integration)
    *   Flexible API Key Handling
    *   Interactive Chat Interface
    *   Client-Side Processing Power
    *   Document Management & Insights
3.  🧠 **The Advanced CRAG Pipeline (The "Secret Sauce")**
    *   Overview of the Multi-Stage Process `[Illustrative Diagram Suggested]`
    *   3.1. Semantic Chunking: *Beyond Fixed Sizes*
    *   3.2. HyDE (Hypothetical Document Embeddings): *Bridging the Query-Document Gap*
    *   3.3. LLM-based Re-ranking: *Fine-Tuning Relevance*
    *   3.4. LLM-based Contextual Compression: *Maximizing Signal, Minimizing Noise*
    *   3.5. The Role of Advanced TypeScript & Algorithms
4.  🛠️ **Tech Stack & Architecture**
    *   Key Technologies
    *   Client-Side Architecture Overview
    *   Data Flow in the RAG Pipeline `[Detailed Diagram Suggested]`
5.  ⚙️ **Getting Started: Setup & Installation**
    *   Prerequisites
    *   Cloning the Repository
    *   Dependency Installation
    *   Environment Variables (`.env` Setup)
        *   **Important Security Note on Client-Side Keys** ☢️
    *   Running the Development Server
6.  📚 **User Guide**
    *   Uploading and Managing Documents `[GIF Demo Suggested]`
    *   Interacting with the Chat `[GIF Demo Suggested]`
    *   Switching LLM Models
    *   Configuring User-Specific OpenRouter Settings
    *   Understanding "Quick Stats"
7.  🎨 **Enhancing Appeal & Interactivity**
8.  🔮 **Future Enhancements (Roadmap)**
9.  🤝 **Contributing**
10. 📜 **License**

---

## 🚀 1. Introduction

### What is CogniCanvas RAG?

CogniCanvas RAG is a sophisticated, **entirely client-side** application that leverages advanced Retrieval Augmented Generation (RAG) techniques to transform your uploaded documents into an interactive knowledge base. It empowers you to "chat" with your documents, asking complex questions and receiving contextually accurate, AI-generated answers. Built with **React, TypeScript, and modern AI principles**, CogniCanvas RAG runs directly in your browser, offering a private and responsive experience. Think of it as your personal document intelligence assistant!

### Problem Solved

Navigating and extracting precise information from extensive document sets can be a daunting and time-consuming task. CogniCanvas RAG elegantly solves this by:
*   🤖 Automating the intelligent extraction of relevant information.
*   🎯 Providing precise, source-backed answers to your specific queries.
*   🌐 Eliminating the need for server-side infrastructure for core RAG processing (LLM API calls are external).

### Key Appeal / "Cool Factor" ✨

The true magic of CogniCanvas RAG lies in its cutting-edge, multi-stage **CRAG (Contextually-Aware Retrieval Augmented Generation)** pipeline, all operating within your browser:
*   **Deep Contextual Understanding:** Moves far beyond rudimentary keyword searches or basic text splitting.
*   **Dynamic & Adaptive Query Processing:** Employs sophisticated techniques to understand and refine user queries for optimal retrieval.
*   **User-Centric LLM Flexibility:** Puts you in control with options for Google Gemini and user-configurable OpenRouter models.
*   **Enhanced Privacy:** Core document processing, chunking, and embedding generation occur locally. *(Note: LLM API interactions still send query and contextual data to third-party services.)*

---

## ✨ 2. Core Features

CogniCanvas RAG is engineered with a suite of powerful features:

*   **Advanced CRAG Capabilities:**
    *   A multi-stage pipeline (detailed in Section 3) including:
        *   Semantic Chunking
        *   HyDE Query Transformation
        *   LLM-based Re-ranking
        *   LLM-based Contextual Compression
    *   This results in highly relevant, accurate, and concise answers.
*   **User-Configurable LLM (OpenRouter Integration):**
    *   Defaults to Google's Gemini Flash for robust generation.
    *   Seamlessly integrates with OpenRouter.ai, allowing you to use **your own OpenRouter API key** and specify **any model available on their platform** (e.g., GPT-4o, Llama 3, Claude 3, etc.). This offers unparalleled flexibility and access to a vast range of LLMs.
*   **Flexible API Key Handling:**
    *   Designed to be functional even if only one primary LLM API key (either Gemini via `.env` or a user-supplied OpenRouter key) is available.
    *   Clear UI cues and guidance based on your configured models.
*   **Interactive Chat Interface:**
    *   A modern, intuitive, and responsive chat UI built with Chakra UI.
    *   Supports both document-focused queries ("Strict Mode" ON) and general chat ("Strict Mode" OFF).
    *   Real-time status messages inform you of the ongoing CRAG processes (e.g., "Enhancing query...", "Re-ranking results...", "Compressing context...").
*   **Client-Side Processing Power:**
    *   All PDF parsing, text extraction, advanced semantic chunking, and text embedding generation are performed **directly in your browser** using technologies like `pdfjs-dist` and TensorFlow.js (`@tensorflow-models/universal-sentence-encoder`).
*   **Document Management & Insights:**
    *   Upload and manage multiple PDF documents (up to 5 docs, 50MB total).
    *   View AI-generated document summaries and content previews.
    *   Monitor processing status and potential errors.
    *   "Quick Stats" panel provides an at-a-glance overview of your document library.

---

## 🧠 3. The Advanced CRAG Pipeline (The "Secret Sauce")

CogniCanvas RAG employs a sophisticated, multi-stage pipeline to process your queries and documents, ensuring the most relevant and accurate information is used to generate answers. This Contextually-Aware Retrieval Augmented Generation (CRAG) approach significantly enhances the quality of interactions.

### Overview of the Multi-Stage Process

`[Suggestion: A visual diagram here (e.g., using Mermaid syntax or a linked image) would greatly enhance understanding of the pipeline flow. Example textual flow:]`

1.  **User Query**
2.  **→ [HyDE Generation]** → Hypothetical Document Embedding
3.  **→ [Initial Retrieval from Semantic Chunks]** → Top N (15) Chunks
4.  **→ [LLM Re-ranking]** → Top K (5) Re-ranked Chunks
5.  **→ [LLM Contextual Compression]** → Compressed & Relevant Context Snippets
6.  **→ [Final LLM Answer Generation (with Original Query)]** → Answer to User

When you ask a question in document mode, here's what happens behind the scenes:

1.  **📄 Document Processing (on upload):**
    *   PDFs are parsed, and text is extracted.
    *   **Semantic Chunking:** Text is divided into contextually coherent chunks.
    *   Embeddings are generated for each semantic chunk and stored.
2.  **🤔 Query Enhancement (on query):**
    *   **HyDE (Hypothetical Document Embeddings):** Your query is transformed by an LLM into an "ideal" answer passage, and this passage's embedding is used for initial retrieval.
3.  **🔍 Initial Retrieval:**
    *   The HyDE embedding is used to find the top N (currently 15) most similar semantic chunks from all processed documents.
4.  **🧐 LLM-based Re-ranking:**
    *   Each of the top N chunks is individually assessed by an LLM for its direct relevance to your *original* query.
5.  **✂️ LLM-based Contextual Compression:**
    *   The re-ranked, relevant chunks are further processed by an LLM to extract *only* the most essential sentences or phrases pertaining to your query.
6.  **💬 Answer Generation:**
    *   The final, compressed, and highly relevant context snippets are provided to an LLM along with your original query to synthesize a comprehensive answer.

Let's dive into each advanced stage:

### 3.1. Semantic Chunking: *Beyond Fixed Sizes*

*   **Concept & Benefits:** Instead of arbitrarily splitting text by character count, semantic chunking aims to divide documents into passages that are thematically coherent. This ensures that retrieved chunks contain complete thoughts or ideas, leading to better context for the LLM.
*   **Our Implementation Highlights:**
    *   Documents are first split into individual sentences using a regex-based approach.
    *   Each sentence is embedded using the Universal Sentence Encoder (`@tensorflow-models/universal-sentence-encoder`).
    *   A custom algorithm calculates the cosine similarity between adjacent sentence embeddings.
    *   Chunk boundaries are identified where this similarity drops below a defined threshold (currently `0.4`), indicating a shift in topic.
    *   This results in variable-sized chunks that are more aligned with the document's natural semantic structure.

### 3.2. HyDE (Hypothetical Document Embeddings): *Bridging the Query-Document Gap*

*   **Concept & Benefits:** User queries are often phrased differently from how information is presented in documents. HyDE addresses this by first generating a hypothetical document (or answer passage) that perfectly answers the user's query. The embedding of this hypothetical document is often closer in vector space to relevant actual document chunks.
*   **Our Implementation Highlights:**
    *   The user's original query is sent to an LLM (Gemini or configured OpenRouter model) with a prompt asking it to generate an ideal answer passage.
    *   This generated passage is then embedded using the Universal Sentence Encoder.
    *   This "HyDE embedding" is used for the initial retrieval step, improving the chances of finding truly relevant chunks.

### 3.3. LLM-based Re-ranking: *Fine-Tuning Relevance*

*   **Concept & Benefits:** While the initial retrieval (using HyDE) finds a good set of candidate chunks, some might still be only marginally relevant. Re-ranking uses a more powerful model (an LLM in our case) to scrutinize each retrieved chunk against the original query.
*   **Our Implementation Highlights:**
    *   The top N (currently 15) chunks from the HyDE-based retrieval are taken.
    *   For each chunk, an LLM call is made (concurrently for efficiency using `Promise.allSettled`).
    *   The LLM is prompted to determine if the chunk is "highly relevant" to the original user query, responding with a simple "YES" or "NO".
    *   Only chunks marked "YES" are passed to the next stage, ensuring a higher quality set of context. A fallback mechanism uses the top initially retrieved chunks if re-ranking fails or filters everything.

### 3.4. LLM-based Contextual Compression: *Maximizing Signal, Minimizing Noise*

*   **Concept & Benefits:** Even highly relevant chunks may contain verbose phrasing or information not pertinent to the specific query. Contextual compression aims to distill these chunks down to only the essential information.
*   **Our Implementation Highlights:**
    *   Each re-ranked chunk (those marked "YES") undergoes another LLM processing step (concurrently).
    *   The LLM is prompted to extract *only* the sentences or key phrases from the chunk that are directly essential for answering the original user query. It should respond "NONE" if no part is relevant.
    *   The final context provided to the answer-generating LLM consists of these highly compressed, relevant snippets. This reduces token count, focuses the LLM, and can improve answer faithfulness.

### 3.5. The Role of Advanced TypeScript & Algorithms

Throughout the CRAG pipeline, TypeScript is used to ensure type safety and maintainability of the complex data transformations. Key algorithmic components include:
*   **Semantic Chunking:** Custom logic for sentence similarity analysis and boundary detection.
*   **Vector Similarity:** Cosine similarity calculations (leveraging TensorFlow.js where appropriate for embeddings, and custom math for comparisons).
*   **Concurrent Processing:** Extensive use of `Promise.allSettled` for efficient, parallel execution of LLM calls during re-ranking and contextual compression, crucial for client-side performance.
*   **State Management:** Sophisticated state management in React (`useState`, `useEffect`) to handle the multi-stage processing flow, loading states, and user interactions.

---

## 🛠️ 4. Tech Stack & Architecture

### Key Technologies
*   **Frontend:** React, TypeScript
*   **UI Framework:** Chakra UI
*   **State Management:** React Hooks (`useState`, `useEffect`, `useRef`)
*   **Document Processing:**
    *   PDF Parsing: `pdfjs-dist`
    *   Text Embeddings: `@tensorflow-models/universal-sentence-encoder` (via TensorFlow.js)
    *   Vector Operations: `@tensorflow/tfjs` (for some similarity calculations) & custom math.
*   **LLM Interaction:**
    *   Google Gemini API (via `@google/generative-ai`)
    *   OpenRouter API (via `openai` library configured for OpenRouter endpoint)
*   **Core Algorithms:** Custom TypeScript implementations for semantic chunking, HyDE prompting, LLM-based re-ranking logic, and contextual compression orchestration.

### Client-Side Architecture Overview

CogniCanvas RAG is designed as a single-page application (SPA) that runs entirely in the user's browser. There is no dedicated backend server for RAG processing.

*   **`App.tsx`:** Serves as the main orchestrator, managing global state (like document metadata, API settings), and routing data between components.
*   **Components (`src/components/`):**
    *   `DocumentUpload.tsx`: Handles file uploads and initiates document processing.
    *   `DocumentList.tsx`: Displays uploaded documents and their status.
    *   `ChatInterface.tsx`: Manages the chat UI, user input, and orchestrates the multi-stage CRAG pipeline for generating responses.
    *   `SettingsModal.tsx`: Allows users to configure OpenRouter settings.
*   **Utilities (`src/utils/`):**
    *   `documentProcessor.ts`: Contains all logic for PDF parsing, text extraction, semantic chunking, and embedding generation. It also manages the in-memory store for document chunks and embeddings and includes the `retrieveRelevantChunks` function.
    *   `api.ts`: Handles all communication with LLM APIs (Gemini, OpenRouter), including prompts for HyDE, re-ranking, contextual compression, and final answer generation.
    *   `modelConfig.ts`: Manages the initialization and configuration of LLM clients.

### Data Flow in the RAG Pipeline

Understanding the flow of data is key to understanding CogniCanvas RAG:

1.  **Upload & Process:** User uploads PDF → `DocumentUpload.tsx` → `documentProcessor.ts` (parse, semantic chunk, embed) → Chunks & Embeddings stored in-memory; Metadata in `App.tsx` state & `localStorage`.
2.  **User Query:** User types query in `ChatInterface.tsx`.
3.  **HyDE Generation:** `ChatInterface.tsx` → `api.ts` (`generateHypotheticalDocument`) → LLM → Hypothetical document text.
4.  **HyDE Embedding:** `ChatInterface.tsx` embeds hypothetical document using Universal Sentence Encoder.
5.  **Initial Retrieval:** `ChatInterface.tsx` → `documentProcessor.ts` (`retrieveRelevantChunks` with HyDE embedding) → Top N (15) semantic chunks.
6.  **Re-ranking:** `ChatInterface.tsx` → `api.ts` (`rerankChunksWithLLM`) → Concurrent LLM calls for each of the 15 chunks → Top K (5) re-ranked chunks.
7.  **Contextual Compression:** `ChatInterface.tsx` → `api.ts` (`compressChunkWithLLM`) → Concurrent LLM calls for each of the 5 re-ranked chunks → Compressed text snippets.
8.  **Final Answer Generation:** `ChatInterface.tsx` (with original query & compressed snippets) → `api.ts` (`generateResponse`) → LLM → Final answer displayed in UI.

`[Placeholder for a visual diagram illustrating this multi-stage RAG pipeline. A sequence diagram or data flow diagram would be highly beneficial here.]`

---

## ⚙️ 5. Getting Started: Setup & Installation

Follow these steps to get CogniCanvas RAG running on your local machine.

### Prerequisites
*   Node.js (v18.x or later recommended)
*   npm or yarn

### Cloning the Repository
```bash
git clone https://github.com/SakshiBishnoi/RAG.git
cd RAG
```

### Dependency Installation
Install the project dependencies using your preferred package manager:
```bash
npm install
# or
yarn install
```

### Environment Variables (`.env` Setup)
CogniCanvas RAG requires API keys for Large Language Model (LLM) access.
1.  Create a file named `.env` in the root of the project directory.
2.  Add the following environment variables to this file:

    ```plaintext
    # For Google Gemini API (Optional if only using OpenRouter)
    REACT_APP_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

    # For OpenRouter API (Optional fallback if not using user-configured OpenRouter key)
    # This key can also be used if you don't want users to configure their own initially.
    REACT_APP_OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"

    # Your site URL and name (Optional, used by OpenRouter for ranking)
    REACT_APP_SITE_URL="http://localhost:3000"
    REACT_APP_SITE_NAME="CogniCanvas RAG (Dev)"
    ```
    *   Replace `"YOUR_GEMINI_API_KEY"` with your actual Google AI Studio API key.
    *   Replace `"YOUR_OPENROUTER_API_KEY"` with your actual OpenRouter API key.

#### **Important Security Note on Client-Side Keys** ☢️
The environment variables prefixed with `REACT_APP_` are embedded into the client-side JavaScript bundle during the build process. This means **they are exposed to anyone inspecting your application's code in the browser.**
*   **For Development:** This is acceptable for local development and testing.
*   **For Production:** **DO NOT deploy this application to a public server with your API keys exposed in this manner.** For a production environment, you should implement a backend proxy that securely stores and uses your API keys. The client application would then make requests to your proxy, which in turn communicates with the LLM APIs.

The application allows users to enter their own OpenRouter API key via the settings modal, which is stored in their browser's `localStorage`. This is a more secure option for users deploying or using this application for themselves, as their key isn't hardcoded into any distributed bundle.

### Running the Development Server
Once dependencies are installed and your `.env` file is configured, you can start the development server:
```bash
npm start
# or
yarn start
```
This will typically open the application in your default web browser at `http://localhost:3000`.

---

## 📚 6. User Guide

Here's how to make the most of CogniCanvas RAG:

### Uploading and Managing Documents
`[Suggestion: A short GIF here demonstrating the document upload and list interaction would be very effective.]`
1.  **Upload:** Click the "Choose Files" button in the "Upload Documents" section. You can select one or more PDF files.
    *   There's a limit of 5 documents and a total size limit of 50MB for uploads.
2.  **Processing:** Once files are selected, they will be processed automatically. This involves:
    *   Text extraction.
    *   Semantic chunking (dividing text into meaningful passages).
    *   Generating embeddings for each chunk.
    *   Generating a summary for the document.
    *   You'll see progress indicators during this time.
3.  **Document List:** Processed documents appear in the "Documents" list on the left.
    *   Each item shows the document name, upload date, and size.
    *   Documents being processed will show an indeterminate progress bar.
    *   If processing fails for a document, it will be visually indicated.
4.  **View Details:** Click on a document in the list to open a modal showing:
    *   Its name and timestamp.
    *   The AI-generated summary.
    *   A preview of the extracted content (first 1000 characters).
5.  **Delete:** Click the trash icon next to a document to remove it from the application (this also clears its data from `localStorage` and the in-memory vector store).

### Interacting with the Chat
`[Suggestion: A GIF showcasing the chat interface, model switching, and perhaps the status updates during CRAG processing.]`

#### Document-Focused Chat (Strict Mode ON)
*   This is the default mode, indicated by the "Strict Mode" switch being ON.
*   When you ask a question, CogniCanvas RAG uses its advanced CRAG pipeline (HyDE, Retrieval, Re-ranking, Contextual Compression) to find the most relevant information *from your uploaded documents* and generate an answer based *only* on that context.
*   The UI will show status messages like "Enhancing query...", "Re-ranking results...", and "Compressing context..." during this process.
*   Answers will often include citations (e.g., "Document: [docName], Chunk: [chunkIndex]") indicating where the information was sourced.

#### General Chat (Strict Mode OFF)
*   Toggle the "Strict Mode" switch OFF to enter General Chat.
*   In this mode, the application behaves like a standard chatbot, using the selected LLM's general knowledge to answer your questions.
*   **It will not refer to your uploaded documents.**

### Switching LLM Models
*   Located at the top-right of the application, you'll find a dropdown menu.
*   **Gemini Flash:** Uses the Google Gemini API. Requires `REACT_APP_GEMINI_API_KEY` to be set in your `.env` file. If not configured, this option will be disabled and marked "(Not Configured)".
*   **OpenRouter:** Allows you to use models available via OpenRouter.ai.
    *   If you haven't configured your own OpenRouter key in the settings, this option will attempt to use the `REACT_APP_OPENROUTER_API_KEY` from your `.env` file with a default model (currently `meta-llama/llama-3-8b-instruct:free`).
    *   If no OpenRouter key is configured (neither in settings nor `.env`), selecting this option will prompt you to configure it via the Settings modal.

### Configuring User-Specific OpenRouter Settings
1.  Click the **Settings icon** (⚙️) near the model selector.
2.  In the "OpenRouter Configuration" modal:
    *   **OpenRouter API Key:** Enter your personal OpenRouter API key.
    *   **OpenRouter Model String:** Enter the exact model string for the OpenRouter model you wish to use (e.g., `mistralai/mistral-7b-instruct:free`, `openai/gpt-4o`). You can find model strings on the OpenRouter models page (link provided in the modal).
3.  Click "Save Settings".
    *   Your key and model preference will be saved in your browser's `localStorage`.
    *   The OpenRouter client will be re-initialized with these settings.
    *   Now, when you select "OpenRouter" from the model dropdown, your specified key and model will be used.

### Understanding "Quick Stats"
The "Quick Stats" box (top-right on larger screens) provides a simple overview:
*   **Total Documents:** Number of documents you've successfully processed.
*   **Total Chunks (Processed):** Total number of semantic chunks generated from all processed documents.
*   **Avg. Chunks/Document:** Average number of semantic chunks per processed document.

---

## 🎨 7. Enhancing Appeal & Interactivity

This README aims to be more than just a technical document. We've tried to make it:
*   **Informative:** Providing deep insights into the CRAG pipeline.
*   **Structured:** Using a "book index" style Table of Contents and clear headings.
*   **Visually Engaging (within Markdown limits):** Employing emojis (like 🧠, 🎨, 🚀, ✨, 🛠️, ⚙️, 📚, ☢️, 🔮, 🤝, 📜), bolding, and italics to highlight key information.
*   **Action-Oriented:** Clear setup and usage instructions.
*   **Transparent:** Open about client-side key security and performance considerations.

**Suggestions for Further Visual Appeal (if you're hosting/extending this):**
*   **Project Logo/Banner:** A custom logo at the top.
*   **Diagrams:** As mentioned, visual diagrams for the RAG pipeline and architecture.
*   **GIFs:** Short animated GIFs demonstrating UI interactions.

---

## 🔮 8. Future Enhancements (Roadmap)

While CogniCanvas RAG is already powerful, here are some potential areas for future development:

*   **More Advanced Chunking Options:** Explore adaptive thresholding for semantic chunking or even rule-based splitting for specific document types.
*   **Alternative Embedding Models:** Allow selection or integration of other embedding models.
*   **Sentence Window/Parent Context Retrieval:** Retrieve precise chunks but provide more surrounding context to the LLM.
*   **Performance Optimizations:** For very large documents, investigate Web Workers for offloading intensive processing like bulk sentence embedding.
*   **Backend Proxy for API Keys:** For a production-ready version, a backend proxy is essential for securing API keys.
*   **Enhanced Knowledge Graph Features:** Deeper integration of KG capabilities for relationship-based retrieval.
*   **Improved Sentence Splitter:** Integrate a more robust, possibly library-based, sentence splitter for better handling of diverse text structures.

---

## 🤝 9. Contributing

This project is currently maintained individually. However, if you have ideas, suggestions, or would like to contribute, please feel free to open an issue on the GitHub repository to discuss!

---

## 📜 10. License

This project is licensed under the **MIT License**.

```text
MIT License

Copyright (c) [Current Year] [Project Maintainer Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

This concludes the main content for the README.md!
