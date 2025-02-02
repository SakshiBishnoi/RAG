import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Icon } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { FiShare2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import '../styles/DocumentList.css';
import ReactMarkdown from 'react-markdown';
import { ProcessedDocument } from '../utils/documentProcessor';

const MotionBox = motion(Box);

interface Document extends ProcessedDocument {
  name: string;
  type: string;
  size: number;
  timestamp: string;
  processed: boolean;
  summary?: string;
  content: string;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  const loadDocuments = () => {
    const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
    setDocuments(docs);
  };

  useEffect(() => {
    loadDocuments();
    window.addEventListener('documentsUpdated', loadDocuments);
    return () => window.removeEventListener('documentsUpdated', loadDocuments);
  }, []);

  const handleDelete = (id: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
    setDocuments(updatedDocs);
    window.dispatchEvent(new Event('documentsUpdated'));
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
        >
          Graph View
        </Button>
      </Flex>

      <Box flex="1" overflowY="auto">
        <VStack spacing={2} align="stretch">
          {documents.map(doc => (
            <MotionBox
              key={doc.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              p={2.5}
              className="document-item"
              bg={doc.processed ? 'white' : 'blue.50'}
              borderRadius="lg"
              borderWidth={1}
              borderColor={doc.processed ? 'gray.100' : 'blue.200'}
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
              {!doc.processed && (
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
              <Box>
                <Text fontWeight="500" mb={2}>Content Preview</Text>
                <Box maxH="400px" overflowY="auto" p={3} bg="gray.50" borderRadius="lg">
                  <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
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
            <Box p={4} bg="white" borderRadius="xl" shadow="sm">
              <Text>Graph view coming soon...</Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentList;