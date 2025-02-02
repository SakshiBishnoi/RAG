import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Input, Tag, TagLabel, Text, Textarea, useToast, VStack } from '@chakra-ui/react';
import ForceGraph2D, { GraphData } from 'react-force-graph-2d';
import { ConceptMapper, ConceptNode, ConceptEdge, ResearchNote } from '../utils/conceptMapper';
import { ProcessedDocument } from '../utils/documentProcessor';

interface ConceptGraphProps {
  documents: ProcessedDocument[];
}

const ConceptGraph: React.FC<ConceptGraphProps> = ({ documents }) => {
  const graphRef = useRef<ForceGraph2D>(null);
  const [conceptMapper] = useState(() => new ConceptMapper());
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const toast = useToast();

  useEffect(() => {
    // Initialize concept mapper with documents
    documents.forEach(doc => conceptMapper.addDocument(doc));
    
    // Generate and set graph data
    const graph = conceptMapper.generateConceptGraph();
    // Transform edges to links for ForceGraph2D compatibility
    setGraphData({
      nodes: graph.nodes,
      links: graph.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight
      }))
    });
  }, [documents]);

  const handleNodeClick = (node: ConceptNode) => {
    setSelectedNode(node);
  };

  const handleAddNote = () => {
    if (!selectedNode || !noteContent) return;

    const note: ResearchNote = {
      id: `note-${Date.now()}`,
      documentId: selectedNode.id,
      chunkIndex: 0, // This would need to be determined based on context
      content: noteContent,
      tags: noteTags,
      timestamp: new Date().toISOString(),
      links: []
    };

    conceptMapper.addNote(note);
    const updatedGraph = conceptMapper.generateConceptGraph();
    // Transform edges to links for ForceGraph2D compatibility
    setGraphData({
      nodes: updatedGraph.nodes,
      links: updatedGraph.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight
      }))
    });

    // Reset form
    setNoteContent('');
    setNoteTags([]);
    
    toast({
      title: 'Note added',
      description: 'Your research note has been added successfully',
      status: 'success',
      duration: 3000,
    });
  };

  const handleAddTag = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      setNoteTags([...noteTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNoteTags(noteTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Box p={4} bg="white" borderRadius="xl" shadow="sm">
      <Box height="500px" border="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="label"
          nodeColor={(node: ConceptNode) => node.type === 'document' ? '#4299E1' : node.type === 'topic' ? '#48BB78' : '#ED64A6'}
          nodeRelSize={6}
          linkWidth={(link: any) => link.weight * 2}
          linkColor={() => '#CBD5E0'}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          d3VelocityDecay={0.1}
        />
      </Box>

      {selectedNode && (
        <VStack mt={4} align="stretch" spacing={3}>
          <Text fontWeight="bold">{selectedNode.label}</Text>
          
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a research note..."
            rows={4}
          />

          <Box>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleAddTag}
              placeholder="Add tags (press Enter)"
              size="sm"
              mb={2}
            />
            <Box>
              {noteTags.map(tag => (
                <Tag
                  key={tag}
                  size="sm"
                  borderRadius="full"
                  variant="solid"
                  colorScheme="blue"
                  mr={2}
                  mb={2}
                >
                  <TagLabel>{tag}</TagLabel>
                  <Button
                    size="xs"
                    ml={1}
                    onClick={() => handleRemoveTag(tag)}
                    variant="ghost"
                    colorScheme="blue"
                  >
                    ×
                  </Button>
                </Tag>
              ))}
            </Box>
          </Box>

          <Button
            colorScheme="blue"
            onClick={handleAddNote}
            isDisabled={!noteContent}
          >
            Add Note
          </Button>
        </VStack>
      )}
    </Box>
  );
};

export default ConceptGraph;