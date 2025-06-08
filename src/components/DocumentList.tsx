import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Icon } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { FiShare2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/DocumentList.css';
import ReactMarkdown from 'react-markdown';
// import { ProcessedDocument, clearDocumentFromInMemoryStore } from '../utils/documentProcessor'; // clearDocumentFromInMemoryStore is now called in App.tsx
import KnowledgeGraph from './KnowledgeGraph';
import { FileDocument } from '../App'; // Import FileDocument from App

const MotionBox = motion(Box);

// Local Document interface can now just be FileDocument if types are consistent
// Or define props based on FileDocument
interface DocumentListProps {
  documents: FileDocument[];
  onDeleteDocument: (docId: string) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onDeleteDocument }) => {
  // const [documents, setDocuments] = useState<FileDocument[]>([]); // Removed, documents come from props
  const [selectedDoc, setSelectedDoc] = useState<FileDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  // Removed useEffect for loading documents and event listener

  const handleDelete = (id: string) => {
    onDeleteDocument(id); // Call the function passed from App.tsx
    // clearDocumentFromInMemoryStore(id); // This is now handled in App.tsx's deleteDocumentMetadata
    // No direct localStorage manipulation or event dispatching
  };

  return (
    <Box className="document-list-container" position="relative" h="100%" display="flex" flexDirection="column">
      <Flex justify="space-between" align="center" mb={4}>
        <Text 
          fontSize={{ base: "md", sm: "lg" }} 
          fontWeight="500" 
        >
          Documents ({documents.length}/5)
        </Text>
        <Button
          onClick={() => setIsGraphModalOpen(true)}
          colorScheme="blue"
          size="sm"
          variant="ghost"
          leftIcon={<Icon as={FiShare2} />}
          isDisabled={true} // Temporarily disabled while graph feature is in development
        >
          Graph View
        </Button>
      </Flex>

      <Box flex="1" overflowY="auto">
        <VStack spacing={2} align="stretch">
          {documents.map(doc => ( // Use documents from props
            <MotionBox
              key={doc.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              p={2.5}
              className="document-item"
              bg={doc.processed ? 'white' : (doc.processingErrors ? 'red.50' : 'blue.50')} // Indicate error state
              borderRadius="lg"
              borderWidth={1}
              borderColor={doc.processed ? 'gray.100' : (doc.processingErrors ? 'red.200' : 'blue.200')}
              position="relative"
              overflow="hidden"
              onClick={() => {
                setSelectedDoc(doc);
                setIsModalOpen(true);
              }}
              cursor="pointer"
              _hover={{
                transform: 'translateY(-1px)',
                boxShadow: 'sm',
                borderColor: 'blue.200'
              }}
            >
              <Flex 
                justify="space-between" 
                align="center" 
                gap={3}
              >
                <Box flex={1} minW={0}>
                  <Text 
                    fontWeight="500" 
                    fontSize="sm"
                    noOfLines={1}
                    title={doc.name}
                    className="document-name"
                    mb={1}
                  >
                    {doc.name}
                  </Text>
                  <Flex 
                    fontSize="xs" 
                    color="gray.500"
                    gap={2}
                    align="center"
                  >
                    <Text>{new Date(doc.timestamp).toLocaleDateString()}</Text>
                    <Text>•</Text>
                    <Text>{(doc.size / 1024).toFixed(1)} KB</Text>
                    {doc.processingErrors && <Text color="red.500">• Error</Text>}
                  </Flex>
                </Box>
                <IconButton
                  aria-label="Delete document"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  borderRadius="full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="delete-button"
                  opacity={0.6}
                  _hover={{ opacity: 1 }}
                />
              </Flex>
              {!doc.processed && !doc.processingErrors && ( // Show progress only if not processed AND no error
                <Progress 
                  size="xs"
                  isIndeterminate 
                  colorScheme="blue"
                  borderRadius="full"
                  bg="blue.100"
                  mt={2}
                />
              )}
            </MotionBox>
          ))}
        </VStack>
      </Box>

      {selectedDoc && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="2xl">
          <ModalOverlay />
          <ModalContent borderRadius="xl">
            <ModalHeader>
              <Text noOfLines={1}>{selectedDoc.name}</Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal" mt={1}>
                {new Date(selectedDoc.timestamp).toLocaleString()}
              </Text>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedDoc.summary && (
                <Box mb={4} p={3} bg="gray.50" borderRadius="lg">
                  <Text fontWeight="500" mb={2}>Summary</Text>
                  <ReactMarkdown>{selectedDoc.summary}</ReactMarkdown>
                </Box>
              )}
              {selectedDoc.processingErrors && (
                 <Box mb={4} p={3} bg="red.50" borderRadius="lg">
                  <Text fontWeight="500" mb={2} color="red.700">Processing Error</Text>
                  <Text color="red.600">{selectedDoc.processingErrors.join(', ')}</Text>
                </Box>
              )}
              <Box>
                <Text fontWeight="500" mb={2}>
                  Content Preview (first 1000 characters)
                  {selectedDoc.fullTextLength && (
                    <Text as="span" fontSize="sm" color="gray.500" ml={2}>
                      (Total length: {selectedDoc.fullTextLength} characters)
                    </Text>
                  )}
                </Text>
                <Box maxH="400px" overflowY="auto" p={3} bg="gray.50" borderRadius="lg">
                  <ReactMarkdown>{selectedDoc.previewContent || "No preview available."}</ReactMarkdown>
                </Box>
              </Box>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      <Modal isOpen={isGraphModalOpen} onClose={() => setIsGraphModalOpen(false)} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Knowledge Graph</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box h="calc(100vh - 120px)" p={4} bg="white" borderRadius="xl" shadow="sm">
              <KnowledgeGraph
                data={{
                  nodes: documents.map(doc => ({
                    id: doc.id,
                    label: doc.name,
                    group: 'document'
                  })),
                  edges: documents.flatMap((doc1, index) => 
                    documents.slice(index + 1).map(doc2 => {
                      let similarity = 0;
                      if (doc1.previewContent && doc2.previewContent) {
                        // Simple content similarity check on previewContent
                        similarity = doc1.previewContent.split(' ')
                          .filter(word => doc2.previewContent && doc2.previewContent.includes(word)).length;
                      }
                      
                      if (similarity > 5) { // Adjusted threshold for preview
                        return {
                          from: doc1.id,
                          to: doc2.id,
                          label: `${similarity} shared terms (preview)`
                        };
                      }
                      return null; // Return null for no edge
                    }).filter(Boolean) // Filter out nulls
                  )
                }}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentList;