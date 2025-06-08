import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  useToast,
  Text, // Added Text import
  Link, // Added Link import
} from '@chakra-ui/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string, modelString: string) => void;
  initialApiKey?: string;
  initialModelString?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialApiKey = '',
  initialModelString = '',
}) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [modelString, setModelString] = useState(initialModelString);
  const toast = useToast();

  // Update state if initial props change (e.g., loaded from localStorage after initial render)
  useEffect(() => {
    setApiKey(initialApiKey);
  }, [initialApiKey]);

  useEffect(() => {
    setModelString(initialModelString);
  }, [initialModelString]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenRouter API Key.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (!modelString.trim()) {
      toast({
        title: 'Model String Required',
        description: 'Please enter the OpenRouter model string (e.g., meta-llama/llama-3-8b-instruct).',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    onSave(apiKey, modelString);
    onClose(); // Close modal after saving
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="xl">
        <ModalHeader>OpenRouter Settings</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">OpenRouter API Key</FormLabel>
              <Input
                type="password"
                placeholder="Enter your OpenRouter API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fontSize="sm"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">OpenRouter Model String</FormLabel>
              <Input
                placeholder="e.g., meta-llama/llama-3-8b-instruct"
                value={modelString}
                onChange={(e) => setModelString(e.target.value)}
                fontSize="sm"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Find model strings on the{' '}
                <Link href="https://openrouter.ai/models" isExternal style={{ textDecoration: 'underline' }} color="blue.500">
                  OpenRouter models page
                </Link>
                .
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} mr={3}>
            Close
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save Settings
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SettingsModal;
