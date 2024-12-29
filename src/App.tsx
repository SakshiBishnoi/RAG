import React from 'react';
import { ChakraProvider, Box, Container, extendTheme } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#f8f9fa',
        color: '#202124',
        overflow: 'hidden',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'full',
      },
      variants: {
        solid: {
          bg: '#1a73e8',
          color: 'white',
          _hover: {
            bg: '#1557b0',
            transform: 'translateY(-1px)',
            boxShadow: 'sm',
          },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'white',
            borderRadius: 'full',
            _hover: { bg: 'white' },
            _focus: { bg: 'white', borderColor: '#1a73e8' },
          },
        },
      },
    },
    Toast: {
      baseStyle: {
        borderRadius: 'xl',
      },
    },
  },
  toastOptions: {
    defaultOptions: {
      position: 'top-right',
      duration: 3000,
    },
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Box h="100vh" bg="#f8f9fa" p={4}>
        <Container 
          maxW="1440px" 
          h="100%" 
          display="flex" 
          flexDirection="column" 
          gap={4}
        >
          <Box flexShrink={0}>
            <DocumentUpload />
          </Box>
          <Box 
            flex={1} 
            display="grid" 
            gridTemplateColumns={{ base: "1fr", md: "300px 1fr" }}
            gap={4}
            minH={0}
          >
            <Box 
              overflowY="auto" 
              borderRadius="2xl" 
              bg="white" 
              p={4}
              shadow="sm"
              css={{
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { background: '#f1f3f4' },
                '&::-webkit-scrollbar-thumb': { 
                  background: '#dadce0',
                  borderRadius: '4px',
                },
              }}
            >
              <DocumentList />
            </Box>
            <Box>
              <ChatInterface />
            </Box>
          </Box>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
