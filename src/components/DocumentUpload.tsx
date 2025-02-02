import React, { useState, useEffect } from 'react';
import { Box, Button, Text, useToast, Progress, Flex, Icon, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiUploadCloud } from 'react-icons/fi';
import { processPDFDocument } from '../utils/documentProcessor';

interface FileDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  timestamp: string;
  processed: boolean;
}

const MotionBox = motion(Box);
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

const DocumentUpload: React.FC = () => {
  const [totalSize, setTotalSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  const updateTotalSize = () => {
    const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]');
    const size = docs.reduce((acc: number, doc: FileDocument) => acc + doc.size, 0);
    setTotalSize(size);
  };

  useEffect(() => {
    updateTotalSize();
    window.addEventListener('documentsUpdated', updateTotalSize);
    return () => window.removeEventListener('documentsUpdated', updateTotalSize);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const existingDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
    if (existingDocs.length + files.length > 5) {
      toast({
        title: 'Upload limit exceeded',
        description: 'You can only upload up to 5 documents',
        status: 'error',
      });
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const tempDoc: FileDocument = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: '',
          timestamp: new Date().toISOString(),
          processed: false
        };

        const currentDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
        localStorage.setItem('uploadedDocuments', JSON.stringify([...currentDocs, tempDoc]));
        window.dispatchEvent(new Event('documentsUpdated'));

        const processedDoc = await processPDFDocument(file);
        
        const updatedDoc: FileDocument = {
          ...tempDoc,
          content: processedDoc.chunks.join('\n'),
          processed: true
        };

        const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
        const updatedDocs = docs.map(doc => 
          doc.id === tempDoc.id ? updatedDoc : doc
        );
        localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
        window.dispatchEvent(new Event('documentsUpdated'));

        toast({
          title: 'Document processed',
          description: `${file.name} is ready for querying`,
          status: 'success',
        });
      } catch (error) {
        toast({
          title: 'Error processing document',
          description: `Failed to process ${file.name}`,
          status: 'error',
        });
      }
    }
    setIsProcessing(false);
    updateTotalSize();
  };

  return (
    <MotionBox
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      bg="white"
      borderRadius="2xl"
      p={6}
      shadow="sm"
    >
      <VStack spacing={4} align="center">
        <Icon 
          as={FiUploadCloud} 
          w={8} 
          h={8} 
          color={isProcessing ? "blue.500" : "gray.400"} 
        />
        <Text fontSize="lg" fontWeight="500">
          Upload Documents
        </Text>
        <Box w="100%" maxW="400px">
          <Flex justify="space-between" mb={2}>
            <Text fontSize="sm" color="gray.600">
              {(totalSize / (1024 * 1024)).toFixed(1)} MB used
            </Text>
            <Text fontSize="sm" color="gray.600">
              {(MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0)} MB total
            </Text>
          </Flex>
          <Progress 
            value={(totalSize / MAX_TOTAL_SIZE) * 100} 
            size="sm" 
            colorScheme="blue" 
            borderRadius="full"
            bg="gray.100"
            isIndeterminate={isProcessing}
          />
        </Box>
        <input
          type="file"
          multiple
          accept=".txt,.pdf,.docx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="file-upload"
          disabled={isProcessing}
        />
        <Button
          as="label"
          htmlFor="file-upload"
          leftIcon={<FiUploadCloud />}
          size="lg"
          variant="solid"
          px={8}
          isDisabled={isProcessing}
          cursor={isProcessing ? "not-allowed" : "pointer"}
        >
          {isProcessing ? 'Processing...' : 'Choose Files'}
        </Button>
      </VStack>
    </MotionBox>
  );
};

export default DocumentUpload;