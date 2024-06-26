import { ReactNode, createContext, useContext, useState } from "react";
import { Node, Edge } from "reactflow";
import { nodesTopologicalSort, convertFlowToJson } from "../utils/flowUtils";
import { FlowEvent, SocketContext } from "./SocketProvider";
import { useTranslation } from "react-i18next";
import { toastErrorMessage } from "../utils/toastUtils";
import {
  createErrorMessageForMissingFields,
  getNodeInError,
} from "../utils/flowChecker";
import { createUniqNodeId } from "../utils/nodeUtils";
import { NodeAppearance } from "../components/nodes/types/node";

export type NodeDimensions = {
  width?: number | null;
  height?: number | null;
};

interface NodeContextType {
  runNode: (nodeName: string) => boolean;
  runAllNodes: () => void;
  hasParent: (id: string) => boolean;
  getIncomingEdges: (id: string) => Edge[] | undefined;
  getEdgeIndex: (id: string) => Edge | undefined;
  showOnlyOutput?: boolean;
  isRunning: boolean;
  currentNodesRunning: string[];
  errorCount: number;
  onUpdateNodeData: (nodeId: string, data: any) => void;
  onUpdateNodes: (nodesUpdated: Node[], edgesUpdated: Edge[]) => void;
  getNodeDimensions: (nodeId: string) => NodeDimensions | undefined;
  duplicateNode: (nodeId: string) => void;
  clearNodeOutput: (nodeId: string) => void;
  clearAllOutput: () => void;
  updateNodeAppearance: (nodeId: string, appearance: NodeAppearance) => void;
  removeNode: (nodeId: string) => void;
  removeAll: () => void;
  findNode: (nodeId: string) => Node | undefined;
  nodes: Node[];
  edges: Edge[];
  currentNodeIdSelected: string;
  setCurrentNodeIdSelected: (id: string) => void;
}

const DUPLICATED_NODE_OFFSET = 100;

export const NodeContext = createContext<NodeContextType>({
  runNode: () => false,
  runAllNodes: () => undefined,
  hasParent: () => false,
  getIncomingEdges: () => undefined,
  getEdgeIndex: () => undefined,
  showOnlyOutput: false,
  isRunning: false,
  currentNodesRunning: [],
  errorCount: 0,
  onUpdateNodeData: () => undefined,
  onUpdateNodes: () => undefined,
  getNodeDimensions: () => undefined,
  duplicateNode: () => undefined,
  clearNodeOutput: () => undefined,
  clearAllOutput: () => undefined,
  updateNodeAppearance: () => undefined,
  removeNode: () => undefined,
  removeAll: () => undefined,
  findNode: () => undefined,
  nodes: [],
  edges: [],
  currentNodeIdSelected: "",
  setCurrentNodeIdSelected: () => undefined,
});

export const NodeProvider = ({
  nodes,
  edges,
  showOnlyOutput,
  isRunning,
  currentNodesRunning,
  errorCount,
  onUpdateNodeData,
  onUpdateNodes,
  children,
}: {
  nodes: Node[];
  edges: Edge[];
  showOnlyOutput?: boolean;
  isRunning: boolean;
  currentNodesRunning: string[];
  errorCount: number;
  onUpdateNodeData: (nodeId: string, data: any) => void;
  onUpdateNodes: (nodesUpdated: Node[], edgesUpdated: Edge[]) => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation("flow");
  const { emitEvent } = useContext(SocketContext);
  const [currentNodeIdSelected, setCurrentNodeIdSelected] =
    useState<string>("");

  const runNode = (name: string) => {
    const nodesSorted = nodesTopologicalSort(nodes, edges);
    const flowFile = convertFlowToJson(nodesSorted, edges, false, true);

    const nodesInError = getNodeInError(flowFile, nodesSorted, name);

    if (nodesInError.length > 0) {
      let errorMessage = createErrorMessageForMissingFields(nodesInError, t);
      toastErrorMessage(errorMessage);
      return false;
    }

    const event: FlowEvent = {
      name: "run_node",
      data: {
        jsonFile: JSON.stringify(flowFile),
        nodeName: name,
      },
    };
    return emitEvent(event);
  };

  const runAllNodes = () => {
    const nodesSorted = nodesTopologicalSort(nodes, edges);
    const flowFile = convertFlowToJson(nodesSorted, edges, false, true);

    const nodesInError = getNodeInError(flowFile, nodesSorted);

    if (nodesInError.length > 0) {
      let errorMessage = createErrorMessageForMissingFields(nodesInError, t);
      toastErrorMessage(errorMessage);
      return;
    }

    const event: FlowEvent = {
      name: "process_file",
      data: {
        jsonFile: JSON.stringify(flowFile),
      },
    };
    emitEvent(event);
  };

  const hasParent = (id: string) => {
    return !!edges.find((edge) => edge.target === id);
  };

  const getIncomingEdges = (id: string) => {
    return edges.filter((edge) => edge.target === id);
  };

  const getEdgeIndex = (id: string) => {
    return edges.find((edge) => edge.target === id);
  };

  const getNodeDimensions = (id: string) => {
    const node = nodes.find((node) => node.id === id);
    let dimensions: NodeDimensions = { width: undefined, height: undefined };
    if (!!node) {
      dimensions = { width: node.width, height: node.height };
    }

    return dimensions;
  };

  const duplicateNode = (nodeId: string) => {
    const nodeToDuplicate = nodes.find((node) => node.id === nodeId);
    if (nodeToDuplicate) {
      const newNodeId = createUniqNodeId(nodeToDuplicate.data.processorType);

      const newNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        data: {
          ...nodeToDuplicate.data,
          name: newNodeId,
          isDone: false,
          lastRun: undefined,
        },
        position: {
          x: nodeToDuplicate.position.x + DUPLICATED_NODE_OFFSET,
          y: nodeToDuplicate.position.y + DUPLICATED_NODE_OFFSET,
        },
      };
      const nodesUpdated = [...nodes, newNode];
      const edgesUpdated = [...edges];
      onUpdateNodes(nodesUpdated, edgesUpdated);
    }
  };

  const clearNodeOutput = (nodeId: string) => {
    const nodeToUpdate = nodes.find((node) => node.id === nodeId);
    if (nodeToUpdate) {
      const nodesUpdated = nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              outputData: undefined,
            },
          };
        }
        return node;
      });
      onUpdateNodes(nodesUpdated, edges);
    }
  };

  function clearAllOutput() {
    const nodesCleared = nodes.map((node) => {
      node.data.outputData = undefined;
      node.data.lastRun = undefined;
      return node;
    });
    onUpdateNodes(nodesCleared, edges);
  }

  const removeNode = (nodeId: string) => {
    const nodesUpdated = nodes.filter((node) => node.id !== nodeId);
    const edgesUpdated = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    );
    onUpdateNodes(nodesUpdated, edgesUpdated);
  };

  const removeAll = () => {
    onUpdateNodes([], []);
  };

  const findNode = (nodeId: string) => {
    return nodes.find((node) => node.id === nodeId);
  };

  const updateNodeAppearance = (nodeId: string, appearance: NodeAppearance) => {
    const nodeToUpdate = nodes.find((node) => node.id === nodeId);
    if (nodeToUpdate) {
      const nodesUpdated = nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              appearance: {
                ...node.data.appearance,
                ...appearance,
              },
            },
          };
        }
        return node;
      });
      onUpdateNodes(nodesUpdated, edges);
    }
  };

  return (
    <NodeContext.Provider
      value={{
        runNode,
        runAllNodes,
        hasParent,
        getIncomingEdges,
        getEdgeIndex,
        showOnlyOutput,
        isRunning,
        currentNodesRunning,
        errorCount,
        onUpdateNodeData,
        onUpdateNodes,
        getNodeDimensions,
        duplicateNode,
        clearNodeOutput,
        clearAllOutput,
        updateNodeAppearance,
        removeNode,
        removeAll,
        findNode,
        nodes,
        edges,
        currentNodeIdSelected: currentNodeIdSelected,
        setCurrentNodeIdSelected: setCurrentNodeIdSelected,
      }}
    >
      {children}
    </NodeContext.Provider>
  );
};
