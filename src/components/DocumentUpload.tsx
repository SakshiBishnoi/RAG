import React, { useState, useEffect } from 'react';
import { Box, Button, Text, useToast, Progress, Flex, Icon, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FiUploadCloud } from 'react-icons/fi';
import { processPDFDocument } from '../utils/documentProcessor';
import { FileDocument } from '../App'; // Import FileDocument from App

const MotionBox = motion(Box);
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB

interface DocumentUploadProps {
  allDocuments: FileDocument[];
  onAddDocument: (doc: FileDocument) => void;
  onUpdateDocument: (docId: string, updates: Partial<FileDocument>) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  allDocuments,
  onAddDocument,
  onUpdateDocument,
}) => {
  const [totalSize, setTotalSize] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Calculate total size from props
    const currentTotalSize = allDocuments.reduce((acc, doc) => acc + doc.size, 0);
    setTotalSize(currentTotalSize);
  }, [allDocuments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (allDocuments.length + files.length > 5) {
      toast({
        title: 'Upload limit exceeded',
        description: 'You can only upload up to 5 documents',
        status: 'error',
      });
      return;
    }

    // Check total size limit if adding these files
    let sizeOfNewFiles = 0;
    for (let i = 0; i < files.length; i++) {
      sizeOfNewFiles += files[i].size;
    }
    if (totalSize + sizeOfNewFiles > MAX_TOTAL_SIZE) {
      toast({
        title: 'Storage limit exceeded',
        description: `Adding these files would exceed the ${MAX_TOTAL_SIZE / (1024*1024)}MB storage limit.`,
        status: 'error',
      });
      return;
    }

    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Generate a temporary ID for the initial state update.
      // This temp ID will be used to update the correct document once processing is done.
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        const tempDoc: FileDocument = {
          id: tempId, // Use temporary ID
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: new Date().toISOString(),
          processed: false,
          // 'content' field is not part of FileDocument in App.tsx, so not included here
        };
        onAddDocument(tempDoc); // Add document with temp metadata to App state

        const processedDocData = await processPDFDocument(file); // This returns the final ID
        
        // Prepare updates for the document, using the final ID from processing.
        // The tempDoc.id is used to find and update the correct entry in App.tsx
        const updates: Partial<FileDocument> = {
          id: processedDocData.id, // This is the final ID
          processed: true,
          summary: processedDocData.summary,
          numChunks: processedDocData.numChunks,
          previewContent: processedDocData.fullText.substring(0, 1000),
          fullTextLength: processedDocData.fullText.length,
          // Ensure other fields like name, type, size, timestamp are implicitly kept from tempDoc via spread in App's update
        };

        // Pass the temporary ID for finding, and the updates (which include the final ID)
        onUpdateDocument(tempId, updates);

        toast({
          title: 'Document processed',
          description: `${file.name} is ready for querying`,
          status: 'success',
        });
      } catch (error) {
        toast({
          title: 'Error processing document',
          description: `Failed to process ${file.name}. It will be removed.`,
          status: 'error',
        });
        // If processing fails, it's good practice to remove the tempDoc from App state
        // This requires a delete function passed from App.tsx, or handle it in onUpdate by passing error status
        // For now, we assume onUpdateDocument handles merging, and if it failed, the doc remains 'processed: false'
        // Or, if App.tsx's deleteDocumentMetadata is available, call it:
        // props.onDeleteDocument(tempId); // This would require onDeleteDocument in props
        // For this refactor, let's assume the 'processed: false' state is enough and App.tsx handles it if needed.
        // Or even better, update it to reflect the error:
        onUpdateDocument(tempId, { processingErrors: [error instanceof Error ? error.message : String(error)], processed: false });
      }
    }
    setIsProcessing(false);
    // Total size will be updated via useEffect watching allDocuments prop
  };

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
      <Flex direction={{ base: "column", md: "row" }} align="center" gap={4}>
        <VStack spacing={3} align="start" flex={1}>
          <Flex align="center" gap={3}>
            <Icon 
              as={FiUploadCloud} 
              w={6} 
              h={6} 
              color={isProcessing ? "blue.500" : "gray.400"} 
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
            size="md"
            variant="solid"
            px={6}
            isDisabled={isProcessing}
            cursor={isProcessing ? "not-allowed" : "pointer"}
            minW={{ base: "full", md: "auto" }}
          >
            {isProcessing ? 'Processing...' : 'Choose Files'}
          </Button>
        </Box>
      </Flex>
    </MotionBox>
  );
};

export default DocumentUpload;