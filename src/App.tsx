import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, extendTheme, Text, Select } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import { ProcessedDocument } from './utils/documentProcessor';
import { setCurrentModel, getCurrentModel } from './utils/modelConfig';

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
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(getCurrentModel());

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value as 'gemini' | 'deepseek';
    setSelectedModel(model);
    setCurrentModel(model);
  };

  useEffect(() => {
    const loadDocuments = () => {
      const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
      setDocuments(docs);
    };

    loadDocuments();
    window.addEventListener('documentsUpdated', loadDocuments);
    return () => window.removeEventListener('documentsUpdated', loadDocuments);
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="#f8f9fa">
        <Container 
          maxW={{ base: "100%", lg: "1600px" }}
          h="100vh"
          p={{ base: 2, sm: 3 }}
          display="flex"
          flexDirection="column"
          gap={3}
        >
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Select 
              value={selectedModel} 
              onChange={handleModelChange}
              width="200px"
              bg="white"
              borderRadius="full"
            >
              <option value="gemini">Gemini</option>
              <option value="deepseek">Deepseek</option>
            </Select>
          </Box>
          <Box 
            display="grid"
            gridTemplateColumns={{
              base: "1fr",
              lg: "repeat(3, 1fr)"
            }}
            gap={3}
          >
            <Box
              gridColumn={{
                base: "1/-1",
                lg: "1/3"
              }}
            >
              <DocumentUpload />
            </Box>
            <Box
              display={{ base: "none", lg: "block" }}
              bg="white"
              p={4}
              borderRadius="xl"
              shadow="sm"
              maxH="160px"
              overflow="hidden"
            >
              <Text fontSize="lg" fontWeight="500" mb={3}>
                Quick Stats
              </Text>
              {/* Add quick stats here */}
            </Box>
          </Box>

          <Box 
            flex={1} 
            display="grid"
            gridTemplateColumns={{
              base: "1fr",
              md: "320px 1fr",
              xl: "360px minmax(0, 1fr)"
            }}
            gap={3}
            minH={0}
            overflow="hidden"
          >
            <Box 
              position="relative"
              h="100%"
              overflowY="auto"
              borderRadius="xl"
              bg="white"
              p={3}
              shadow="sm"
            >
              <DocumentList />
            </Box>
            <Box 
              h="100%"
              display="flex"
              flexDirection="column"
              overflow="hidden"
              borderRadius="xl"
              bg="white"
              shadow="sm"
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
