import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, extendTheme, Text, Select } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
// import { ProcessedDocument } from './utils/documentProcessor'; // Type from here is less relevant now for App's main state
import { clearDocumentFromInMemoryStore } from './utils/documentProcessor'; // For deletion
import { setCurrentModel, getCurrentModel } from './utils/modelConfig';

// Define FileDocument interface, similar to DocumentUpload.tsx's local one
export interface FileDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  timestamp: string;
  processed: boolean;
  summary?: string;
  numChunks?: number;
  previewContent?: string;
  fullTextLength?: number;
  processingErrors?: string[]; // Added to reflect processing errors
  // content: string; // This was in DocumentUpload's tempDoc, ensure consistency or handle if needed
}

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
  const [documents, setDocuments] = useState<FileDocument[]>([]);
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(getCurrentModel());

  // Load documents from localStorage on initial mount
  useEffect(() => {
    const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
    setDocuments(storedDocs);
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value as 'gemini' | 'deepseek';
    setSelectedModel(model);
    setCurrentModel(model);
  };

  // Functions to manage document metadata
  const addDocumentMetadata = (doc: FileDocument) => {
    setDocuments(prevDocs => {
      const newDocs = [...prevDocs, doc];
      localStorage.setItem('uploadedDocuments', JSON.stringify(newDocs));
      return newDocs;
    });
  };

  const updateDocumentMetadata = (docId: string, updates: Partial<FileDocument>) => {
    setDocuments(prevDocs => {
      const newDocs = prevDocs.map(d => d.id === docId ? { ...d, ...updates } : d);
      localStorage.setItem('uploadedDocuments', JSON.stringify(newDocs));
      return newDocs;
    });
  };

  const deleteDocumentMetadata = (docId: string) => {
    clearDocumentFromInMemoryStore(docId); // Clear from in-memory stores
    setDocuments(prevDocs => {
      const newDocs = prevDocs.filter(d => d.id !== docId);
      localStorage.setItem('uploadedDocuments', JSON.stringify(newDocs));
      return newDocs;
    });
  };

  // Calculate statistics
  const totalDocuments = documents.length;
  const totalChunks = documents.reduce((acc, doc) => acc + (doc.processed && doc.numChunks ? doc.numChunks : 0), 0);
  const averageChunksPerDocument = totalDocuments > 0 ? parseFloat((totalChunks / totalDocuments).toFixed(1)) : 0;


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
              <DocumentUpload
                allDocuments={documents}
                onAddDocument={addDocumentMetadata}
                onUpdateDocument={updateDocumentMetadata}
              />
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
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm">Total Documents:</Text>
                  <Text fontSize="sm" fontWeight="500">{totalDocuments}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Total Chunks (Processed):</Text>
                  <Text fontSize="sm" fontWeight="500">{totalChunks}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Avg. Chunks/Document:</Text>
                  <Text fontSize="sm" fontWeight="500">{averageChunksPerDocument}</Text>
                </HStack>
              </VStack>
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
              <DocumentList
                documents={documents}
                onDeleteDocument={deleteDocumentMetadata}
              />
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
              <ChatInterface documents={documents} />
            </Box>
          </Box>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;
