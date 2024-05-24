// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export type MultiLayoutComponentId = 'editor' | 'viewer' | 'customizer' | 'assistant';
export type SingleLayoutComponentId = MultiLayoutComponentId;

export type MessageContent = string | ({
  type: 'text'
  text: string,
} | {
  type: 'image_url',
  image_url: {
    url: string,
    detail?: 'low' | 'auto' | 'high',
  },
})[]

export type ToolCall = {
  id: string,
  type: 'function',
  function: {
    name: string,
    arguments: string,
  }
}

export type Message = ({
  role: 'user' | 'system',
  content: MessageContent,
} | {
  role: 'tool',
  name: string,
  tool_call_id: string,
  content: MessageContent,
} | {
  role: 'assistant',
  content: MessageContent | null,
  tool_calls?: ToolCall[],
})

export interface State {
  params: {
    sourcePath: string,
    source: string,
    features: string[],
  },

  view: {
    logs?: boolean,
    layout: {
      mode: 'single',
      focus: SingleLayoutComponentId,
    } | ({
      mode: 'multi',
    } & { [K in MultiLayoutComponentId]: boolean })
    
    color: string,
    showAxes?: boolean,
    showShadows?: boolean,
    lineNumbers?: boolean,
  }

  assistant: {
    messages: Message[],
    generating_response?: boolean,
    status?: 'Rendering STL' | 'Rendering PNG' | 'Asking Model',
  }

  lastCheckerRun?: {
    logText: string,
    markers: monaco.editor.IMarkerData[]
  }
  rendering?: boolean,
  previewing?: boolean,
  checkingSyntax?: boolean,

  error?: string,
  output?: {
    isPreview: boolean,
    stlFile: File,
    stlFileURL: string,
    elapsedMillis: number,
    formattedElapsedMillis: string,
    formattedStlFileSize: string,
    // path: string,
    // timestamp: number,
    // sizeBytes: number,
    // formattedSize: string,
  },
};

export interface StatePersister {
  set(state: State): void;
}

export {}