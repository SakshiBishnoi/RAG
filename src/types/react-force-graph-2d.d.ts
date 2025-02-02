declare module 'react-force-graph-2d' {
  import { Component } from 'react';

  export interface GraphData {
    nodes: Array<{
      id: string;
      [key: string]: any;
    }>;
    links: Array<{
      source: string;
      target: string;
      [key: string]: any;
    }>;
  }

  export interface ForceGraphProps {
    graphData: GraphData;
    nodeLabel?: string | ((node: any) => string);
    nodeColor?: string | ((node: any) => string);
    nodeRelSize?: number;
    linkWidth?: number | ((link: any) => number);
    linkColor?: string | ((link: any) => string);
    onNodeClick?: (node: any) => void;
    cooldownTicks?: number;
    d3VelocityDecay?: number;
    ref?: any;
  }

  export default class ForceGraph2D extends Component<ForceGraphProps> {}
}