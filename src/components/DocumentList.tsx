import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex } from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

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
    <Box w="300px" h="100%" borderWidth={1} borderRadius="lg" p={4} bg="white">
      <Text fontSize="xl" mb={4}>Documents ({documents.length}/5)</Text>
      <VStack spacing={3} align="stretch">
        {documents.map(doc => (
          <Box 
            key={doc.id}
            p={3}
            borderWidth={1}
            borderRadius="md"
            display="flex"
            flexDirection="column"
            bg={doc.processed ? 'green.50' : 'yellow.50'}
          >
            <Flex justifyContent="space-between" alignItems="center" mb={2}>
              <VStack align="start" spacing={1}>
                <Text fontWeight="medium">{doc.name}</Text>
                <Text fontSize="sm" color="gray.500">
                  {new Date(doc.timestamp).toLocaleDateString()}
                </Text>
              </VStack>
              <IconButton
                aria-label="Delete document"
                icon={<DeleteIcon />}
                size="sm"
                onClick={() => handleDelete(doc.id)}
              />
            </Flex>
            {!doc.processed && (
              <Progress size="xs" isIndeterminate colorScheme="blue" />
            )}
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default DocumentList; 