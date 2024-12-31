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
    Switch: {
      baseStyle: {
        track: {
          bg: 'gray.200',
          _checked: {
            bg: '#1a73e8',
          }
        },
        thumb: {
          bg: 'white',
        }
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
      <Box minH="100vh" bg="#f8f9fa">
        <Container 
          maxW={{ base: "100%", lg: "1440px" }}
          h="100vh"
          p={{ base: 2, sm: 4 }}
          display="flex"
          flexDirection="column"
        >
          <Box flexShrink={0} mb={{ base: 2, md: 4 }}>
            <DocumentUpload />
          </Box>
          <Box 
            flex={1} 
            display="grid"
            gridTemplateColumns={{
              base: "1fr",
              md: "300px 1fr",
              xl: "350px 1fr"
            }}
            gridTemplateRows="1fr"
            gap={{ base: 3, md: 4 }}
            minH={0}
            overflow="hidden"
          >
            <Box 
              position="relative"
              h="100%"
              overflowY="auto"
              borderRadius="xl"
              bg="white"
              p={{ base: 2, sm: 4 }}
              shadow="sm"
            >
              <DocumentList />
            </Box>
            <Box 
              h="100%"
              display="flex"
              flexDirection="column"
              overflow="hidden"
            >
              <ChatInterface />
            </Box>
          </Box>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
