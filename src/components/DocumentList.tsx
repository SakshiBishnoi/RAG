import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Icon } from '@chakra-ui/react';
import { DeleteIcon, InfoIcon } from '@chakra-ui/icons';
import { FiShare2 } from 'react-icons/fi';
import ConceptGraph from './ConceptGraph';
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
      <Box flex="1" overflowY="auto" mb={16}>
        <Text 
          fontSize={{ base: "md", sm: "lg" }} 
          fontWeight="500" 
          mb={{ base: 2, sm: 4 }}
        >
          Documents ({documents.length}/5)
        </Text>
        <VStack spacing={{ base: 2, sm: 3 }} align="stretch">
          {documents.map(doc => (
            <MotionBox
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              p={{ base: 2, sm: 3 }}
              className="document-item"
              bg={doc.processed ? 'white' : 'blue.50'}
              borderRadius="xl"
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
                mb={doc.processed ? 0 : 2}
                gap={2}
              >
                <VStack 
                  align="start" 
                  spacing={{ base: 0.5, sm: 1 }} 
                  flex={1}
                >
                  <Text 
                    fontWeight="500" 
                    fontSize={{ base: "xs", sm: "sm" }}
                    noOfLines={1}
                    title={doc.name}
                    className="document-name"
                  >
                    {doc.name}
                  </Text>
                  <Text 
                    fontSize={{ base: "2xs", sm: "xs" }} 
                    color="gray.500"
                  >
                    {new Date(doc.timestamp).toLocaleDateString()}
                  </Text>
                </VStack>
                <IconButton
                  aria-label="Delete document"
                  icon={<DeleteIcon />}
                  size={{ base: "xs", sm: "sm" }}
                  variant="ghost"
                  colorScheme="red"
                  borderRadius="full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="delete-button"
                />
              </Flex>
              {!doc.processed && (
                <Progress 
                  size="xs"
                  isIndeterminate 
                  colorScheme="blue"
                  borderRadius="full"
                  bg="blue.100"
                />
              )}
            </MotionBox>
          ))}
        </VStack>
      </Box>

      <Box position="absolute" bottom={4} left={0} right={0} textAlign="center" bg="white" zIndex={1} px={4}>
        <Button
          onClick={() => setIsGraphModalOpen(true)}
          colorScheme="blue"
          size="lg"
          borderRadius="full"
          shadow="lg"
          leftIcon={<Icon as={FiShare2} />}
          width="90%"
        >
          Knowledge Graph
        </Button>
      </Box>
    </Box>
  );
};

export default DocumentList;