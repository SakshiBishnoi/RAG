import React, { useEffect, useState } from 'react';
import { Box, VStack, Text, IconButton, Progress, Flex, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton } from '@chakra-ui/react';
import { DeleteIcon, InfoIcon } from '@chakra-ui/icons';
import { motion } from 'framer-motion';
import '../styles/DocumentList.css';
import ReactMarkdown from 'react-markdown';

const MotionBox = motion(Box);

interface Document {
  id: string;
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
    <Box className="document-list-container">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isCentered size="xl">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent
          mx={4}
          borderRadius="2xl"
          p={0}
          bg="white"
          boxShadow="xl"
          maxW={{ base: "90vw", md: "800px" }}
        >
          <ModalHeader
            borderBottom="1px solid"
            borderColor="gray.100"
            py={4}
            px={6}
            fontSize={{ base: "lg", md: "xl" }}
            fontWeight="600"
          >
            {selectedDoc?.name}
          </ModalHeader>
          <ModalCloseButton
            size="lg"
            p={2}
            top={3}
            right={3}
            borderRadius="full"
            _hover={{ bg: "gray.100" }}
          />
          <ModalBody
            py={6}
            px={{ base: 4, md: 6 }}
            maxH="70vh"
            overflowY="auto"
            sx={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
                background: 'gray.50',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'gray.300',
                borderRadius: '24px',
              },
            }}
          >
            {selectedDoc?.summary ? (
              <Box
                fontSize={{ base: "md", md: "lg" }}
                lineHeight="tall"
                color="gray.700"
                className="markdown-content"
                sx={{
                  '& p': {
                    mb: 4,
                    lineHeight: 1.8
                  },
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    fontWeight: 'bold',
                    mb: 3,
                    mt: 4
                  },
                  '& ul, & ol': {
                    pl: 4,
                    mb: 4
                  },
                  '& li': {
                    mb: 2
                  },
                  '& code': {
                    bg: 'gray.100',
                    p: 1,
                    borderRadius: 'md',
                    fontSize: '0.9em'
                  },
                  '& blockquote': {
                    borderLeftWidth: 4,
                    borderLeftColor: 'gray.200',
                    pl: 4,
                    py: 2,
                    my: 4
                  }
                }}
              >
                <ReactMarkdown>{selectedDoc.summary}</ReactMarkdown>
              </Box>
            ) : (
              <Text
                color="gray.500"
                fontSize={{ base: "md", md: "lg" }}
                textAlign="center"
                py={8}
              >
                No summary available for this document.
              </Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentList;