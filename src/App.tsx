import React from 'react';
import { ChakraProvider, Box, VStack, Container, extendTheme } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';

const theme = extendTheme({});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="gray.50">
        <Container maxW="container.xl" py={8}>
          <VStack spacing={6} align="stretch">
            <DocumentUpload />
            <Box display="flex" gap={4} minH="600px">
              <DocumentList />
              <ChatInterface />
            </Box>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
