import type { Edge } from '@xyflow/react';
import { createContext } from 'react';
export type Dimension = {
  width: number;
  height: number;
};
export type PreviewContextValue = {
  tables: {
    [key: string]: Dimension;
  };
  refs: Edge[]
  setTable: (id: string, node: Dimension) => void;
};
export const PreviewContext = createContext<PreviewContextValue>({
  tables: {},
  setTable: () => {},
  refs: []
});
