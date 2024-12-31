import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  Switch,
  Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import '../styles/ChatInterface.css';
import { generateResponse } from '../utils/api';

const MotionBox = motion(Box);

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDocumentChat, setIsDocumentChat] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      const userMessage: Message = {
        type: 'user',
        content: inputValue.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      const documents = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      
      if (isDocumentChat && documents.length === 0) {
        throw new Error('Please upload documents first to use document chat mode');
      }

      const response = await generateResponse({
        message: userMessage.content,
        isDocumentMode: isDocumentChat,
        documents: documents,
        previousMessages: messages,
      });

      const assistantMessage: Message = {
        type: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        status: 'error',
        duration: 3000,
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="chat-interface-container">
      <Flex 
        className="chat-header"
        justify="space-between" 
        align="center"
        px={4}
        py={3}
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Text 
          fontSize={{ base: 'sm', md: 'md' }}
          fontWeight="500"
          color="gray.700"
        >
          {isDocumentChat ? 'Document-Focused Chat' : 'General Chat'}
        </Text>
        <HStack spacing={2}>
          <Text 
            fontSize={{ base: 'xs', md: 'sm' }}
            color="gray.500"
          >
            Strict Mode
          </Text>
          <Switch
            colorScheme="blue"
            size={{ base: 'sm', md: 'md' }}
            isChecked={isDocumentChat}
            onChange={(e) => {
              setIsDocumentChat(e.target.checked);
            }}
            className="document-chat-switch"
          />
        </HStack>
      </Flex>

      <Box className="chat-messages">
        <VStack spacing={4} align="stretch">
          {messages.map((message, index) => (
            <MotionBox
              key={`${message.type}-${index}-${message.timestamp.getTime()}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message ${
                message.type === 'user' ? 'message-user' : 'message-assistant'
              }`}
            >
              <Text fontSize={{ base: 'sm', md: 'md' }}>{message.content}</Text>
            </MotionBox>
          ))}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>
      
      <Box className="chat-input-container">
        <HStack spacing={3}>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isDocumentChat ? "Ask about your documents..." : "Ask anything..."}
            size={{ base: 'sm', md: 'md' }}
            variant="filled"
            bg="gray.50"
            _hover={{ bg: 'gray.100' }}
            _focus={{ bg: 'white', borderColor: 'blue.500' }}
          />
          <Button
            onClick={handleSendMessage}
            colorScheme="blue"
            size={{ base: 'sm', md: 'md' }}
            px={6}
            isLoading={isLoading}
          >
            Send
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

export default ChatInterface; 