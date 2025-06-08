import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, extendTheme, Text, Select } from '@chakra-ui/react';
import { ChakraProvider, Box, Container, extendTheme, Text, Select, IconButton, HStack, useDisclosure, useToast } from '@chakra-ui/react'; // Added IconButton, HStack, useDisclosure, useToast
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import SettingsModal from './components/SettingsModal'; // Import SettingsModal
import { SettingsIcon } from '@chakra-ui/icons'; // Import SettingsIcon

import { clearDocumentFromInMemoryStore } from './utils/documentProcessor'; // For deletion
import { setCurrentModel, getCurrentModel, initializeModels, isGeminiConfigured } from './utils/modelConfig'; // Import isGeminiConfigured
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
  const initialDefaultModel = getCurrentModel(); // Default is 'gemini' from modelConfig
  const [selectedModel, setSelectedModel] = useState<'gemini' | 'deepseek'>(initialDefaultModel);
  const { isOpen: isSettingsModalOpen, onOpen: onSettingsModalOpen, onClose: onSettingsModalClose } = useDisclosure();
  const toast = useToast();

  // State for OpenRouter settings
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>('');
  const [openRouterModelString, setOpenRouterModelString] = useState<string>('meta-llama/llama-3-8b-instruct'); // Default model

  // State for Gemini configuration status
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(true); // Assume configured until checked

  // Load documents and settings from localStorage on initial mount
  useEffect(() => {
    const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
    setDocuments(storedDocs);

    const storedApiKey = localStorage.getItem('openRouterApiKey');
    if (storedApiKey) setOpenRouterApiKey(storedApiKey);

    const storedModelString = localStorage.getItem('openRouterModelString');
    if (storedModelString) setOpenRouterModelString(storedModelString);

    // Initialize models (especially if OpenRouter key might come from localStorage)
    // This might need adjustment if DeepSeek is OpenRouter based and needs the key immediately
    // For now, assume Gemini is default and OpenRouter (DeepSeek) can be configured.
    // A more robust approach would be to initialize/re-initialize in handleSaveSettings.
    // Initialize models with keys from .env and potentially from localStorage
    initializeModels({
      geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || '', // Ensure it's always a string
      userProvidedOpenRouterApiKey: storedApiKey || '', // Pass stored user key
      envProvidedOpenRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '', // Pass env key as fallback
      userProvidedOpenRouterModel: storedModelString || undefined, // Pass stored user model
      siteUrl: window.location.href,
      siteName: 'RAG Application Demo', // Example site name
    });

    const geminiIsReady = isGeminiConfigured();
    setGeminiConfigured(geminiIsReady);

    if (!geminiIsReady && selectedModel === 'gemini') {
      if (openRouterApiKey && openRouterApiKey.trim() !== '') { // Check if OpenRouter is configured
        setSelectedModel('deepseek');
        setCurrentModel('deepseek');
        toast({
          title: "Gemini Not Configured",
          description: "Gemini API key is missing. Switched to OpenRouter as it is configured.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "No Models Configured",
          description: "Neither Gemini nor OpenRouter is configured. Please set API keys in Settings or environment variables.",
          status: "error",
          duration: 7000,
          isClosable: true,
        });
        // Optionally, open settings modal here too: onSettingsModalOpen();
      }
    }
  }, [selectedModel, openRouterApiKey, toast]); // Add selectedModel, openRouterApiKey, toast to dependency array

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value as 'gemini' | 'deepseek';
    setSelectedModel(model);
    setCurrentModel(model);
    if (model === 'deepseek' && !openRouterApiKey) {
      toast({
        title: "OpenRouter API Key Missing",
        description: "Please configure your OpenRouter API key in settings to use DeepSeek models.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
      onSettingsModalOpen(); // Prompt user to enter settings
    }
  };

  const handleSaveSettings = (apiKey: string, modelString: string) => {
    setOpenRouterApiKey(apiKey);
    setOpenRouterModelString(modelString);
    localStorage.setItem('openRouterApiKey', apiKey);
    localStorage.setItem('openRouterModelString', modelString);

    // Re-initialize models with the new key/settings
    // This is crucial if the user updates the key for OpenRouter (DeepSeek)
    initializeModels({
      geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
      userProvidedOpenRouterApiKey: apiKey, // The new key from settings
      envProvidedOpenRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '',
      userProvidedOpenRouterModel: modelString, // The new model from settings
      siteUrl: window.location.href,
      siteName: 'RAG Application Demo',
    });

    // Update configuration status after saving
    setGeminiConfigured(isGeminiConfigured());

    // If Gemini was selected but is not configured after save (e.g. key removed), and OpenRouter is, switch.
    if (!isGeminiConfigured() && getCurrentModel() === 'gemini') {
      if (apiKey && apiKey.trim() !== '') { // Use the apiKey from the save handler
         setSelectedModel('deepseek');
         setCurrentModel('deepseek');
         toast({
            title: "Switched to OpenRouter",
            description: "Gemini is no longer configured. Switched to OpenRouter.",
            status: "info",
            isClosable: true,
         });
      } else {
         toast({
            title: "Gemini Not Configured",
            description: "Gemini is no longer configured, and OpenRouter is also not set up. Please configure a model.",
            status: "error",
            isClosable: true,
         });
      }
    }


    toast({
      title: 'Settings Saved',
      description: 'OpenRouter configuration updated.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
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
          <HStack justifyContent="flex-end" mb={0} spacing={2}>
            <Select 
              value={selectedModel} 
              onChange={handleModelChange}
              width="200px"
              size="sm"
              bg="white"
              borderRadius="full"
              boxShadow="sm"
            >
              <option value="gemini" disabled={!geminiConfigured}>
                Gemini Flash {geminiConfigured ? "" : "(Not Configured)"}
              </option>
              <option value="deepseek">OpenRouter</option>
            </Select>
            <IconButton
              aria-label="Open Settings"
              icon={<SettingsIcon />}
              onClick={onSettingsModalOpen}
              size="sm"
              isRound
              bg="white"
              boxShadow="sm"
            />
          </HStack>
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
              <ChatInterface documents={documents} currentLLMModel={selectedModel} />
            </Box>
          </Box>
        </Container>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={onSettingsModalClose}
          onSave={handleSaveSettings}
          initialApiKey={openRouterApiKey}
          initialModelString={openRouterModelString}
        />
      </Box>
    </ChakraProvider>
  );
}

export default App;
