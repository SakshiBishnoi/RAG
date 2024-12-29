# RAG-Powered Document Assistant

## Overview

The RAG-Powered Document Assistant is a full-stack application designed to facilitate document processing and interaction using advanced AI capabilities. This application leverages Google's Gemini API for natural language processing and integrates with a vector database for efficient document retrieval and management.

## Why This Project?

In today's digital age, managing and extracting information from documents can be a daunting task. This project aims to simplify the process of document handling by providing a user-friendly interface that allows users to upload, query, and interact with their documents seamlessly. By utilizing state-of-the-art AI technology, users can obtain relevant information quickly and efficiently.

## What Does It Do?

The RAG-Powered Document Assistant offers the following core functionalities:

1. **Document Processing**: Users can upload various document formats (PDF, TXT, DOCX) and the application will process these documents to extract meaningful content.
2. **Chat Interface**: A responsive chat interface allows users to interact with the AI, asking questions and receiving answers based on the uploaded documents.
3. **RAG Pipeline**: The application implements a Retrieval-Augmented Generation (RAG) pipeline that retrieves relevant document chunks and generates context-aware responses.
4. **Advanced Features**: Additional features include document summarization, source highlighting, confidence scoring, and conversation export.

## How Does It Work?

The application is built using the following technologies:

- **Frontend**: React with TypeScript for a dynamic user interface.
- **Backend**: Node.js/Express or Python/FastAPI for handling API requests and document processing.
- **Vector Database**: Pinecone or Weaviate for storing and retrieving document embeddings.
- **LLM**: Google's Gemini API for generating responses based on user queries and document context.
- **UI Framework**: Chakra UI for responsive and accessible design.

## Installation Instructions

To set up the RAG-Powered Document Assistant on your local machine, follow these steps:

1. **Clone the Repository**:
   Open your terminal and run the following command to clone the repository:
   ```bash
   git clone https://github.com/SakshiBishnoi/RAG.git
   ```

2. **Navigate to the Project Directory**:
   ```bash
   cd rag-document-assistant
   ```

3. **Install Dependencies**:
   Use npm to install the required dependencies:
   ```bash
   npm install
   ```

4. **Set Up Environment Variables**:
   Create a `.env` file in the root of the project and add your API keys and other necessary configurations. For example:
   ```
   REACT_APP_GEMINI_API_KEY=your_api_key_here
   ```

5. **Run the Application**:
   Start the development server:
   ```bash
   npm start
   ```
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

## Learn More

For more information on how to use the application, refer to the documentation provided within the app or check out the following resources:

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React Documentation](https://reactjs.org/)

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.