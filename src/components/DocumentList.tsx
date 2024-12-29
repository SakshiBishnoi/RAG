import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  timestamp: string;
  processed: boolean;
}

const DocumentList: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

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
    <Box>
      <Text fontSize="lg" fontWeight="500" mb={4}>
        Documents ({documents.length}/5)
      </Text>
      <VStack spacing={3} align="stretch">
        {documents.map(doc => (
          <MotionBox
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            p={3}
            bg={doc.processed ? 'white' : 'blue.50'}
            borderRadius="xl"
            borderWidth={1}
            borderColor={doc.processed ? 'gray.100' : 'blue.200'}
            position="relative"
            overflow="hidden"
          >
            <Flex justify="space-between" align="center" mb={doc.processed ? 0 : 2}>
              <VStack align="start" spacing={1} flex={1} mr={2}>
                <Text 
                  fontWeight="500" 
                  fontSize="sm" 
                  noOfLines={1}
                  title={doc.name}
                >
                  {doc.name}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {new Date(doc.timestamp).toLocaleDateString()}
                </Text>
              </VStack>
              <IconButton
                aria-label="Delete document"
                icon={<DeleteIcon />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                borderRadius="full"
                onClick={() => handleDelete(doc.id)}
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
  );
};

export default DocumentList; 