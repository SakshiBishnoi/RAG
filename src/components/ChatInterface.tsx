import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  Input, 
  Button, 
  Text,
  Flex,
} from '@chakra-ui/react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

interface FileDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  timestamp: string;
  processed: boolean;
}

// Initialize the Gemini API with environment variable
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Missing Gemini API key in environment variables');
}
const genAI = new GoogleGenerativeAI(API_KEY || '');

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: "Hello! I'm your AI assistant. You can ask me general questions, or upload documents and I'll help you understand them better.",
    sender: 'bot',
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const documents = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
      const processedDocuments = documents.filter(doc => doc.processed);

      let prompt = '';

      if (processedDocuments.length > 0) {
        // Create a more conversational prompt
        prompt = `You are a helpful assistant. The user has uploaded a document. Here is a brief overview of the document: ${processedDocuments[0].content.slice(0, 200)}... 
        
        The user asked: "${input}". Please respond in a friendly and conversational manner, providing relevant information from the document.`;
      } else {
        prompt = `You are a helpful assistant. The user asked: "${input}". Please respond in a friendly and conversational manner.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `${text} \n\n If you have more questions about this document, feel free to ask!`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error instanceof Error ? error.message : 'Sorry, I encountered an error processing your request.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <Box flex={1} borderWidth={1} borderRadius="lg" bg="white">
      <VStack h="100%" spacing={0}>
        <Box 
          flex={1} 
          w="100%" 
          p={4} 
          overflowY="auto" 
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'gray.200',
              borderRadius: '24px',
            },
          }}
        >
          {messages.map(message => (
            <Flex
              key={message.id}
              justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
              mb={4}
            >
              <Box
                maxW="70%"
                bg={message.sender === 'user' ? 'blue.500' : 'gray.100'}
                color={message.sender === 'user' ? 'white' : 'black'}
                p={3}
                borderRadius="lg"
              >
                <Text>{message.text}</Text>
              </Box>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Box p={4} w="100%" borderTopWidth={1}>
          <Flex>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              mr={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <Button colorScheme="blue" onClick={handleSend}>
              Send
            </Button>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
};

export default ChatInterface; 