import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  VStack, 
  Input, 
  Button, 
  Text,
  Flex,
  Spinner,
  useToast,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend } from 'react-icons/fi';

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

// Update to use the correct Gemini 2.0 Flash model
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const [useDocuments, setUseDocuments] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let prompt;
      
      if (useDocuments) {
        // Document-based chat (existing logic)
        const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
        const context = docs.map((doc: FileDocument) => doc.content).join('\n\n');
        prompt = `
          Context from uploaded documents:
          ${context}

          User question: ${input.trim()}

          Please provide a detailed and helpful response based on the context above. 
          If the answer cannot be found in the context, please say so clearly.
          Format the response in a clear and structured way.
        `;
      } else {
        // Normal chat mode
        prompt = `
          User: ${input.trim()}
          
          Please provide a helpful response. You can be more conversational and less strict.
        `;
      }

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      const botMessage: Message = {
        id: Date.now().toString(),
        text: response || "I couldn't generate a response. Please try again.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate response. Please try again.',
        status: 'error',
        duration: 3000,
      });
      console.error('Error generating response:', error);
    } finally {
      setLoading(false);
    }
  };

  // Define markdown components with proper typing
  const markdownComponents: Partial<Components> = {
    p: ({ children }) => (
      <Text mb={2}>
        {children as React.ReactNode}
      </Text>
    ),
    ul: ({ children }) => (
      <Box as="ul" pl={4} mb={2}>
        {children as React.ReactNode}
      </Box>
    ),
    li: ({ children }) => (
      <Box as="li" mb={1}>
        {children as React.ReactNode}
      </Box>
    ),
  };

  return (
    <Box 
      h="calc(100vh - 200px)"
      maxH="800px"
      bg="white"
      borderRadius="2xl"
      shadow="sm"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Messages Container */}
      <Box 
        flex="1"
        overflowY="auto"
        px={6}
        py={4}
        css={{
          '&::-webkit-scrollbar': {
            width: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f3f4',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#dadce0',
            borderRadius: '4px',
          },
        }}
      >
        <VStack spacing={4} align="stretch">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Flex justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}>
                  <Box
                    maxW="80%"
                    bg={message.sender === 'user' ? 'blue.500' : 'gray.100'}
                    color={message.sender === 'user' ? 'white' : 'gray.800'}
                    px={4}
                    py={3}
                    borderRadius="2xl"
                    fontSize="sm"
                  >
                    <ReactMarkdown components={markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  </Box>
                </Flex>
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && (
            <Flex justify="center">
              <Spinner size="sm" color="blue.500" />
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input Container */}
      <Box 
        p={4} 
        borderTop="1px solid" 
        borderColor="gray.100"
        bg="white"
      >
        <Flex direction="column" gap={3}>
          <FormControl display="flex" alignItems="center" justifyContent="flex-end">
            <FormLabel htmlFor="doc-chat" mb="0" fontSize="sm" color="gray.600">
              Document Chat
            </FormLabel>
            <Switch
              id="doc-chat"
              colorScheme="blue"
              isChecked={useDocuments}
              onChange={(e) => setUseDocuments(e.target.checked)}
            />
          </FormControl>
          <Flex gap={3}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={useDocuments ? "Ask about your documents..." : "Type your message..."}
              size="lg"
              variant="filled"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              size="lg"
              variant="solid"
              isDisabled={!input.trim() || loading}
              leftIcon={<FiSend />}
            >
              Send
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
};

export default ChatInterface; 