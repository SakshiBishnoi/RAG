import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Text, useToast, Progress, Flex, Icon, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiUploadCloud } from 'react-icons/fi';
import { FileDocument } from '../App'; // Assuming FileDocument is exported from App.tsx

const MotionBox = motion(Box);
const MAX_DOCS_COUNT = 5;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

interface DocumentUploadProps {
  allDocuments: FileDocument[];
  onAddInitialDoc: (doc: FileDocument) => void;
  onProcessFile: (file: File, tempDocId: string) => Promise<void>;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  allDocuments,
  onAddInitialDoc,
  onProcessFile,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalSize, setTotalSize] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const currentSize = allDocuments.reduce((acc, doc) => acc + doc.size, 0);
    setTotalSize(currentSize);
  }, [allDocuments]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (allDocuments.length + files.length > MAX_DOCS_COUNT) {
      toast({
        title: 'Upload limit exceeded',
        description: `You can only upload up to ${MAX_DOCS_COUNT} documents. You have ${allDocuments.length}, trying to add ${files.length}.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Clear the file input so the same files can be re-selected if needed after correction
      if (event.target) {
        event.target.value = '';
      }
      return;
    }

    let newFilesTotalSize = 0;
    for (let i = 0; i < files.length; i++) {
        newFilesTotalSize += files[i].size;
    }
    if (totalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
        toast({
            title: 'Storage limit exceeded',
            description: `Uploading these files would exceed the ${MAX_TOTAL_SIZE / (1024*1024)}MB storage limit.`,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
        if (event.target) {
            event.target.value = '';
        }
        return;
    }

    setIsProcessing(true);
    const processingPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempDocId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9) + '-' + file.name;

      const tempFileDocument: FileDocument = {
        id: tempDocId,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: new Date().toISOString(),
        processed: false,
        numChunks: 0,
      };

      onAddInitialDoc(tempFileDocument);
      processingPromises.push(onProcessFile(file, tempDocId));
    }

    try {
        await Promise.all(processingPromises);
    } catch (error) {
        console.error("Error in one or more onProcessFile calls during Promise.all:", error);
        toast({
            title: "Upload Error",
            description: "There was an issue initiating the processing for some files. Check console for details.",
            status: "error",
            isClosable: true,
        });
    }

    // Clear the file input after processing initiation
    if (event.target) {
        event.target.value = '';
    }
    setIsProcessing(false);
  }, [allDocuments, onAddInitialDoc, onProcessFile, toast, totalSize]);

  return (
    <MotionBox
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      bg="white"
      borderRadius="xl"
      p={4}
      shadow="sm"
    >
      <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={4}>
        <VStack spacing={3} align="start" flex={1}>
          <Flex align="center" gap={3}>
            <Icon
              as={FiUploadCloud}
              w={6}
              h={6}
              color={isProcessing ? 'blue.500' : 'gray.400'}
            />
            <Text fontSize="lg" fontWeight="500">
              Upload Documents
            </Text>
          </Flex>
          <Box w="100%">
            <Flex justify="space-between" mb={1.5} fontSize="sm" color="gray.600">
              <Text>{(totalSize / (1024 * 1024)).toFixed(1)} MB used</Text>
              <Text>{(MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0)} MB total</Text>
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
        </VStack>
        <Box>
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.md,.docx" // Expanded accept list
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
            disabled={isProcessing || allDocuments.length >= MAX_DOCS_COUNT}
          />
          <Button
            as="label"
            htmlFor="file-upload"
            leftIcon={<FiUploadCloud />}
            size="md"
            variant="solid"
            px={6}
            isDisabled={isProcessing || allDocuments.length >= MAX_DOCS_COUNT}
            cursor={(isProcessing || allDocuments.length >= MAX_DOCS_COUNT) ? 'not-allowed' : 'pointer'}
            minW={{ base: 'full', md: 'auto' }}
          >
            {isProcessing ? 'Processing...' : (allDocuments.length >= MAX_DOCS_COUNT ? `Limit ${MAX_DOCS_COUNT} Docs` : 'Choose Files')}
          </Button>
        </Box>
      </Flex>
    </MotionBox>
  );
};

export default DocumentUpload;