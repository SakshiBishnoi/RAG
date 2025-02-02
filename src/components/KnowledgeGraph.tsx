import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { Box } from '@chakra-ui/react';

interface KnowledgeGraphProps {
  data: {
    nodes: Array<{
      id: string;
      label: string;
      group?: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      label?: string;
    }>;
  };
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (graphRef.current && data.nodes.length > 0) {
      const container = graphRef.current;

      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 12,
            color: '#4A5568'
          },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          width: 2,
          color: { color: '#CBD5E0' },
          font: {
            size: 10,
            color: '#718096',
            align: 'middle'
          },
          arrows: {
            to: { enabled: true, scaleFactor: 0.5 }
          }
        },
        physics: {
          stabilization: {
            enabled: true,
            iterations: 100
          },
          barnesHut: {
            gravitationalConstant: -2000,
            springConstant: 0.04
          }
        },
        interaction: {
          dragNodes: true,
          dragView: true,
          zoomView: true,
          hover: true
        }
      };

      networkRef.current = new Network(container, data, options);

      return () => {
        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    }
  }, [data]);

  return (
    <Box
      ref={graphRef}
      w="100%"
      h="100%"
      minH="500px"
      bg="white"
      borderRadius="xl"
      overflow="hidden"
    />
  );
};

export default KnowledgeGraph;