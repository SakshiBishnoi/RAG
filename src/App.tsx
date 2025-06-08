import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Container,
  extendTheme,
  Text,
  Select,
  IconButton,
  HStack,
  VStack, // Added VStack
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import DocumentList from './components/DocumentList';
import SettingsModal from './components/SettingsModal'; // Import SettingsModal
import { SettingsIcon } from '@chakra-ui/icons'; // Import SettingsIcon

// Remove direct imports from documentProcessor if they are no longer used by App.tsx directly
import { loadModel as loadSentenceEncoderModel } from './utils/documentProcessor'; // Keep this for loading the model
import { setCurrentModel, getCurrentModel, initializeModels, isGeminiConfigured } from './utils/modelConfig';
import { VectorStoreService } from './services/VectorStoreService';
import { DocumentProcessingService } from './services/DocumentProcessingService';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { generateDocumentSummary } from './utils/api'; // Import for summary generation

// Define FileDocument interface, should align with what App needs to store
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
  processingErrors?: string[];
  processingTimeMs?: number; // Added from service output
  // Summary will be added later by a separate process
  // totalSentences is in metadata from service, can add here if needed for UI
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
  const [openRouterModelString, setOpenRouterModelString] = useState<string>('meta-llama/llama-3-8b-instruct');

  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(true);

  // Refs for services and model
  const vectorStoreServiceRef = useRef<VectorStoreService | null>(null);
  const documentProcessingServiceRef = useRef<DocumentProcessingService | null>(null);
  const sentenceEncoderModelRef = useRef<use.UniversalSentenceEncoder | null>(null);

  const [isAppInitialized, setIsAppInitialized] = useState<boolean>(false);
  const [appInitError, setAppInitError] = useState<string | null>(null);


  // Initialize services and load settings on mount
  useEffect(() => {
    async function initializeApp() {
      try {
        // 1. Load Sentence Encoder Model
        const model = await loadSentenceEncoderModel();
        sentenceEncoderModelRef.current = model;

        // 2. Instantiate VectorStoreService
        vectorStoreServiceRef.current = new VectorStoreService();

        // 3. Instantiate DocumentProcessingService with dependencies
        if (sentenceEncoderModelRef.current && vectorStoreServiceRef.current) {
          documentProcessingServiceRef.current = new DocumentProcessingService(
            vectorStoreServiceRef.current,
            sentenceEncoderModelRef.current
          );
        } else {
          throw new Error("Sentence encoder or vector store failed to initialize.");
        }

        // Load settings from localStorage
        const storedApiKey = localStorage.getItem('openRouterApiKey');
        if (storedApiKey) setOpenRouterApiKey(storedApiKey);
        const storedModelString = localStorage.getItem('openRouterModelString');
        if (storedModelString) setOpenRouterModelString(storedModelString);

        // Initialize LLM clients via modelConfig
        initializeModels({
          geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
          userProvidedOpenRouterApiKey: storedApiKey || '',
          envProvidedOpenRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '',
          userProvidedOpenRouterModel: storedModelString || undefined,
          siteUrl: window.location.href,
          siteName: 'RAG Application Demo',
        });

        setGeminiConfigured(isGeminiConfigured());

        // Load document metadata from localStorage AFTER services are ready
        const storedDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
        setDocuments(storedDocs);

        // Re-populate VectorStore with data from localStorage (if any persisted docs)
        // This assumes FileDocument contains enough info to reconstruct, or we store chunks/embeddings separately
        // For now, we only store metadata. If chunks/embeddings were persisted, this is where they'd be reloaded.
        // Given current VectorStoreService is in-memory only, this step is more about future-proofing
        // if we decided to persist vector data. For now, it will be empty on refresh.

        setAppInitError(null);
      } catch (error: any) {
        console.error("Failed to initialize application services:", error);
        setAppInitError(`Failed to load embedding model or init services: ${error.message}`);
      } finally {
        setIsAppInitialized(true);
      }
    }
    initializeApp();
  }, []); // Empty dependency array, runs once on mount

  // Effect to handle model switching if Gemini is not configured
  useEffect(() => {
    if (!isAppInitialized) return; // Run only after initial setup

    if (!geminiConfigured && selectedModel === 'gemini') {
      if (openRouterApiKey && openRouterApiKey.trim() !== '') {
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
      }
    }
  }, [isAppInitialized, geminiConfigured, selectedModel, openRouterApiKey, toast]);


  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value as 'gemini' | 'deepseek';
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
  }, [isAppInitialized, geminiConfigured, selectedModel, openRouterApiKey, toast]); // Restored isAppInitialized and geminiConfigured


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

    if (documentProcessingServiceRef.current) { // Ensure services are initialized
      initializeModels({ // Re-initialize LLM clients
        geminiApiKey: process.env.REACT_APP_GEMINI_API_KEY || '',
        userProvidedOpenRouterApiKey: apiKey,
        envProvidedOpenRouterApiKey: process.env.REACT_APP_OPENROUTER_API_KEY || '',
        userProvidedOpenRouterModel: modelString,
        siteUrl: window.location.href,
        siteName: 'RAG Application Demo',
      });
      setGeminiConfigured(isGeminiConfigured());

      if (!isGeminiConfigured() && getCurrentModel() === 'gemini') {
        if (apiKey && apiKey.trim() !== '') {
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
    } else {
      toast({
        title: "Error",
        description: "Services not initialized. Cannot save settings.",
        status: "error",
        isClosable: true,
      });
    }

    toast({
      title: 'Settings Saved',
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

  // Document Management Functions using Services
  const addDocumentToStateAndStorage = (doc: FileDocument) => {
    setDocuments(prevDocs => {
      const newDocs = [...prevDocs, doc];
      localStorage.setItem('uploadedDocuments', JSON.stringify(newDocs));
      return newDocs;
    });
  };

  const updateDocumentInStateAndStorage = (docId: string, updates: Partial<FileDocument>) => {
    setDocuments(prevDocs => {
      const newDocs = prevDocs.map(d => d.id === docId ? { ...d, ...updates } : d);
      localStorage.setItem('uploadedDocuments', JSON.stringify(newDocs));
      return newDocs;
    });
  };

  // This function is passed to DocumentUpload as onProcessFile
  const handleProcessNewFile = async (file: File, tempDocId: string) => {
    if (!documentProcessingServiceRef.current) {
      toast({ title: "Error", description: "Document processing service not ready.", status: "error" });
      updateDocumentInStateAndStorage(tempDocId, { processed: false, processingErrors: ["Processing service not available."] });
      return;
    }
    try {
      const result = await documentProcessingServiceRef.current.processPDF(file, tempDocId, file.name);

      // Update the document metadata with results from processing
      // The ID change from tempDocId to result.id (if different) is handled by processPDF returning the final ID
      // For this refactor, we assume tempDocId is the final ID used for storage in VectorStore.
      // If processPDF generates a new ID, that new ID must be used to update the metadata.
      // Let's assume processPDF uses the passed docId.
      updateDocumentInStateAndStorage(tempDocId, {
        processed: result.processingErrors && result.processingErrors.length > 0 ? false : true,
        numChunks: result.numChunks,
        processingErrors: result.processingErrors,
        processingTimeMs: result.processingTimeMs,
        // Generate preview from fullText returned by service
        previewContent: result.fullText.substring(0, 1000),
        fullTextLength: result.fullText.length,
        // Summary will be handled separately
      });

      if (result.processingErrors && result.processingErrors.length > 0) {
         toast({ title: "Processing Issue", description: `Document processed with errors: ${result.processingErrors.join(', ')}`, status: "warning", duration: 7000, isClosable: true });
      } else {
         toast({ title: "Processing Complete", description: `${file.name} processed successfully.`, status: "success" });
      }

      // Attempt to generate summary if processing was generally successful (even with minor page errors)
      // and fullText was extracted.
      if (result.fullText && result.fullText.trim().length > 0) {
        try {
          // Use the currently selected model in App.tsx for summary generation
          const summary = await generateDocumentSummary(result.fullText, selectedModel);
          updateDocumentInStateAndStorage(tempDocId, { summary });
        } catch (summaryError: any) {
          console.error(`Failed to generate summary for ${file.name}:`, summaryError);
          updateDocumentInStateAndStorage(tempDocId, {
            summary: "Summary generation failed.",
            processingErrors: [...(result.processingErrors || []), `Summary generation failed: ${summaryError.message}`]
          });
          toast({ title: "Summary Failed", description: `Could not generate summary for ${file.name}.`, status: "warning" });
        }
      } else if (!result.fullText || result.fullText.trim().length === 0) {
        updateDocumentInStateAndStorage(tempDocId, { summary: "No content to summarize." });
      }

    } catch (error: any) {
      console.error("Error processing file in App.tsx:", error);
      updateDocumentInStateAndStorage(tempDocId, { processed: false, processingErrors: [error.message || "Unknown processing error"] });
      toast({ title: "Processing Failed", description: `Error processing ${file.name}: ${error.message}`, status: "error" });
    }
  };


  const deleteDocumentMetadata = (docId: string) => {
    vectorStoreServiceRef.current?.removeDocument(docId); // Use VectorStoreService
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
                onAddInitialDoc={addDocumentToStateAndStorage} // For adding tempDoc
                onProcessFile={handleProcessNewFile} // For actual processing
                // onUpdateDocument is now implicitly handled by onProcessFile updating the state
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
              <ChatInterface
                documents={documents}
                currentLLMModel={selectedModel}
                vectorStore={vectorStoreServiceRef.current}
                sentenceEncoder={sentenceEncoderModelRef.current}
                isAppInitialized={isAppInitialized}
              />
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
