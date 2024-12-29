import React from 'react';
import { Box, Button, Text, useToast, VStack } from '@chakra-ui/react';
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

const DocumentUpload: React.FC = () => {
  const toast = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check if total uploads would exceed 5
    const existingDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
    if (existingDocs.length + files.length > 5) {
      toast({
        title: 'Upload limit exceeded',
        description: 'You can only upload up to 5 documents',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const totalFiles = files.length;
    let processedFiles = 0;

    toast({
      title: 'Processing documents',
      description: `Processing ${totalFiles} document(s)...`,
      status: 'info',
      duration: null,
      isClosable: true,
    });

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // First, create a document entry with processed: false
        const tempDoc: FileDocument = {
          id: Date.now().toString(),
          name: file.name,
          type: file.type,
          size: file.size,
          content: '',
          timestamp: new Date().toISOString(),
          processed: false
        };

        // Add the unprocessed document to storage
        const currentDocs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
        localStorage.setItem('uploadedDocuments', JSON.stringify([...currentDocs, tempDoc]));
        window.dispatchEvent(new Event('documentsUpdated'));

        // Process the document
        const processedDoc = await processPDFDocument(file);
        
        // Update the document with processed content
        const updatedDoc: FileDocument = {
          ...tempDoc,
          content: processedDoc.chunks.join('\n'),
          processed: true
        };

        // Update storage with processed document
        const docs = JSON.parse(localStorage.getItem('uploadedDocuments') || '[]') as FileDocument[];
        const updatedDocs = docs.map(doc => 
          doc.id === tempDoc.id ? updatedDoc : doc
        );
        localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
        window.dispatchEvent(new Event('documentsUpdated'));

        toast({
          title: 'Document processed',
          description: `${file.name} is ready for querying! Feel free to ask me anything about it.`,
          status: 'success',
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: 'Error processing document',
          description: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: 'error',
          duration: 5000,
        });
      }
    }
  };

  return (
    <Box p={4} borderWidth={2} borderRadius="lg" borderStyle="dashed">
      <VStack spacing={4}>
        <Text fontSize="lg">Upload Documents (Max 5)</Text>
        <input
          type="file"
          multiple
          accept=".txt,.pdf,.docx"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <Button as="label" htmlFor="file-upload" colorScheme="blue">
          Choose Files
        </Button>
      </VStack>
    </Box>
  );
};

export default DocumentUpload; 