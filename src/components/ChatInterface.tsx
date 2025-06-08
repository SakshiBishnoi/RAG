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
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import '../styles/ChatInterface.css';
import { generateResponse, generateHypotheticalDocument, rerankChunksWithLLM, compressChunkWithLLM } from '../utils/api';
// retrieveRelevantChunks and loadSentenceEncoder will now come from props via services
import { RelevantChunk } from '../services/VectorStoreService'; // Updated import path for RelevantChunk
import { FileDocument } from '../App';
import ReactMarkdown from 'react-markdown';
import { VectorStoreService } from '../services/VectorStoreService'; // Import service
import * as use from '@tensorflow-models/universal-sentence-encoder'; // For sentenceEncoder prop type

const MotionBox = motion(Box);

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: string[];
  summary?: string;
  keyPoints?: string[];
}

interface ChatInterfaceProps {
  documents: FileDocument[];
  currentLLMModel: 'gemini' | 'deepseek';
  vectorStore: VectorStoreService | null;
  sentenceEncoder: use.UniversalSentenceEncoder | null;
  isAppInitialized: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  documents: allDocsMetadata,
  currentLLMModel,
  vectorStore,
  sentenceEncoder,
  isAppInitialized
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // General loading for LLM response
  const [isGeneratingHyDE, setIsGeneratingHyDE] = useState(false);
  const [isReranking, setIsReranking] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false); // Specific loading for compression step
  const [isDocumentChat, setIsDocumentChat] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
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

      let queryForRetrieval: string | number[] = userMessage.content;
      let chunksForResponse: RelevantChunk[] = []; // Holds chunks after re-ranking
      let finalContextChunks: RelevantChunk[] = []; // Holds chunks after compression, passed to generateResponse

      if (isDocumentChat) {
        const activeDocIds = allDocsMetadata.filter(doc => doc.processed).map(doc => doc.id);

        if (activeDocIds.length === 0) {
          toast({
            title: 'No processed documents',
            description: 'Please upload and process documents first to use document chat mode.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
          setIsLoading(false);
          setMessages(prev => prev.filter(msg => msg.timestamp !== userMessage.timestamp));
          return;
        }

        // HyDE Step
        setIsGeneratingHyDE(true);
        try {
          if (!sentenceEncoder) {
            throw new Error("Sentence encoder not available for HyDE.");
          }
          const hypotheticalDocument = await generateHypotheticalDocument(userMessage.content, currentLLMModel);

          if (hypotheticalDocument) {
            const hydeEmbeddingTensor = await sentenceEncoder.embed(hypotheticalDocument);
            queryForRetrieval = Array.from(await hydeEmbeddingTensor.dataSync());
            hydeEmbeddingTensor.dispose();
            console.log("HyDE: Used hypothetical document embedding for retrieval.");
          }
        } catch (hydeError) {
          console.warn("HyDE generation or embedding failed, falling back to original query:", hydeError);
          toast({
            title: 'HyDE Enhancement Failed',
            description: `Could not generate hypothetical document. Falling back to standard search. Error: ${hydeError instanceof Error ? hydeError.message : String(hydeError)}`,
            status: 'warning',
            duration: 4000,
            isClosable: true,
          });
          // queryForRetrieval remains userMessage.content (original query)
        } finally {
          setIsGeneratingHyDE(false);
        }
        // End of HyDE Step

        if (!vectorStore) {
          throw new Error("Vector store not available for chunk retrieval.");
        }
        let retrievedChunks = await vectorStore.retrieveRelevantChunks(queryForRetrieval, activeDocIds, 15);

        if (retrievedChunks.length > 0) {
          setIsReranking(true);
          try {
            // Rerank the retrieved chunks
            chunksForResponse = await rerankChunksWithLLM(
              userMessage.content, // Original user query for relevance assessment
              retrievedChunks,
              currentLLMModel, // Use the currently selected LLM for reranking
              5 // Target count of chunks after reranking
            );
            console.log("Reranked Chunks:", chunksForResponse);
            if (chunksForResponse.length === 0 && retrievedChunks.length > 0) {
                // This means reranking filtered out all initially retrieved chunks
                toast({
                    title: 'Re-ranking Filtered All Chunks',
                    description: 'Initial retrieval found potential matches, but re-ranking determined none were sufficiently relevant. You may want to try a broader query.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
            }
          } catch (rerankError) {
            console.warn("Re-ranking failed, using initially retrieved chunks (up to 5):", rerankError);
            toast({
              title: 'Re-ranking Failed',
              description: `Could not re-rank chunks. Using initial search results. Error: ${rerankError instanceof Error ? rerankError.message : String(rerankError)}`,
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
            // Fallback to top 5 of initially retrieved chunks if reranking fails
            chunksForResponse = retrievedChunks.slice(0, 5);
          } finally {
            setIsReranking(false);
          }
        } else {
            chunksForResponse = []; // No chunks from initial retrieval if retrievedChunks was empty
        }

        // Contextual Compression Step
        // finalContextChunks is already declared in the outer scope
        if (chunksForResponse.length > 0) {
          setIsCompressing(true);
          try {
            const compressionPromises = chunksForResponse.map(chunk =>
              compressChunkWithLLM(userMessage.content, chunk, currentLLMModel)
            );
            const compressedResults = await Promise.allSettled(compressionPromises);

            compressedResults.forEach((result, index) => {
              if (result.status === 'fulfilled' && result.value) {
                finalContextChunks.push({
                  ...chunksForResponse[index], // Keep original chunk metadata (docId, docName, chunkIndex, original similarity)
                  text: result.value, // Replace text with compressed version
                });
              } else if (result.status === 'fulfilled' && !result.value) {
                // LLM responded "NONE" or empty, so this chunk is not relevant after compression
                console.log(`Chunk ${chunksForResponse[index].docId}-${chunksForResponse[index].chunkIndex} deemed not relevant after compression.`);
              } else if (result.status === 'rejected') {
                // Compression failed for this chunk, log error, and optionally keep original if desired
                console.warn(`Compression failed for chunk ${chunksForResponse[index].docId}-${chunksForResponse[index].chunkIndex}, considering keeping original: `, result.reason);
                // For now, we'll just exclude it if compression fails.
                // Alternatively, to be more robust to individual compression failures:
                // finalContextChunks.push(chunksForResponse[index]); // Keep original chunk
              }
            });

            if (finalContextChunks.length === 0 && chunksForResponse.length > 0) {
                toast({
                    title: 'Contextual Compression Filtered All Chunks',
                    description: 'Re-ranked chunks were further refined, but no essential information was extracted for the query. Try a different query.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
            }
             console.log("Final Context Chunks (after compression):", finalContextChunks);

          } catch (compressionError) { // Should not happen if individual promises handle errors
            console.error("Error during overall compression step:", compressionError);
            // Fallback to using uncompressed (but reranked) chunks
            finalContextChunks = chunksForResponse;
          } finally {
            setIsCompressing(false);
          }
        } else {
            finalContextChunks = chunksForResponse; // chunksForResponse is already [] if no chunks after reranking
        }
        // End of Contextual Compression Step


        if (finalContextChunks.length === 0) {
          toast({
            title: 'No relevant content found',
            description: 'Could not find relevant sections in your documents for this query. Try rephrasing or checking your documents.',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
          // generateResponse will be called anyway, and it can handle empty chunksForResponse
        }
      }
      // End of isDocumentChat specific logic for retrieval

      // General call to generateResponse, works for both document and general chat modes
      // as finalContextChunks will be empty if not isDocumentChat or if no chunks were found/kept.
      const response = await generateResponse({
        message: userMessage.content,
        isDocumentMode: isDocumentChat,
        relevantChunks: finalContextChunks, // Use final (potentially compressed) chunks, will be [] if not doc chat
        previousMessages: messages.filter(msg => msg.timestamp !== userMessage.timestamp),
        analyzeSummary: true,
        extractKeyPoints: true,
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
      // Remove the potentially failed user message if an error occurs.
      setMessages(prev => prev.filter(msg => msg.timestamp !== userMessage.timestamp));
    } finally {
      setIsLoading(false);
      setIsGeneratingHyDE(false);
      setIsReranking(false);    // Ensure all loading states are reset
      setIsCompressing(false);  // Ensure all loading states are reset
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
        {isGeneratingHyDE ? "Enhancing query..." : (isReranking ? "Re-ranking results..." : (isCompressing ? "Compressing context..." : (isDocumentChat ? 'Document-Focused Chat' : 'General Chat')))}
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
          isDisabled={isGeneratingHyDE || isLoading || isReranking || isCompressing} // Disable while processing
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
              className={`message ${message.type === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              {message.type === 'user' ? (
                <Text fontSize={{ base: 'sm', md: 'md' }}>{message.content}</Text>
              ) : (
                <Box>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {message.citations && message.citations.length > 0 && (
                    <Box mt={2} fontSize="sm" color="gray.600">
                      <Text fontWeight="500">Sources:</Text>
                      <UnorderedList>
                        {message.citations.map((citation, idx) => (
                          <ListItem key={idx}>{citation}</ListItem>
                        ))}
                      </UnorderedList>
                    </Box>
                  )}
                  {message.summary && (
                    <Box mt={2} p={2} bg="blue.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="500" color="blue.700">Summary:</Text>
                      <Text fontSize="sm" color="blue.600">{message.summary}</Text>
                    </Box>
                  )}
                  {message.keyPoints && message.keyPoints.length > 0 && (
                    <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="500">Key Points:</Text>
                      <UnorderedList fontSize="sm">
                        {message.keyPoints.map((point, idx) => (
                          <ListItem key={idx}>{point}</ListItem>
                        ))}
                      </UnorderedList>
                    </Box>
                  )}
                </Box>
              )}
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
            isLoading={isLoading || !isAppInitialized || isGeneratingHyDE || isReranking || isCompressing} // More comprehensive isLoading
            disabled={!isAppInitialized} // Disable if app isn't ready
          >
            {isAppInitialized ? 'Send' : 'Initializing...'}
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

export default ChatInterface;