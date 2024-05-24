// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import defaultScad from './default-scad';
import { Message, State } from './app-state';
import { SYSTEM_MESSAGE } from '../components/AssistantPanel';

export const defaultSourcePath = '/playground.scad';
export const defaultModelColor = '#f9d72c';
  
export const blankProjectState: State = {
  params: {
    sourcePath: defaultSourcePath,
    source: '',
    features: [],
  },
  view: {
    color: defaultModelColor,
    layout: {
      mode: 'single',
      focus: 'editor'
    }
  },
  assistant: {
    messages: [
      SYSTEM_MESSAGE,
    ]
  }
};

export function createInitialState(fs: any, state: State | null) {

  type Mode = State['view']['layout']['mode'];
  const mode: Mode = window.matchMedia("(min-width: 768px)").matches 
    ? 'multi' : 'single';

  const initialState: State = {
    params: {
      sourcePath: defaultSourcePath,
      source: defaultScad,
      features: [],
    },
    view: {
      layout: {
        mode: 'multi',
        editor: true,
        viewer: true,
        customizer: false,
        assistant: true,
      } as any,

      color: defaultModelColor,
    },
    ...(state ?? {}),

    assistant: {
      messages: [
        SYSTEM_MESSAGE,
        // {
        //   "role": "user",
        //   "content": "a cube",
        // },
        // {
        //   "role": "assistant",
        //   "content": null,
        //   "tool_calls": [
        //     {
        //       "id": "call_m4d0KY8ySP00aMfMXxcuK6Is",
        //       "type": "function",
        //       "function": {
        //         "name": "render_openscad_to_image",
        //         "arguments": "{\n    \"source\": \"cube([10, 10, 10]);\"\n}"
        //       }
        //     }
        //   ]
        // }
      ]
    },

    // ...(state ?? {})
  };

  if (initialState.view.layout.mode != mode) {
    if (mode === 'multi' && initialState.view.layout.mode === 'single') {
      initialState.view.layout = {
        mode,
        editor: true,
        viewer: true,
        customizer: initialState.view.layout.focus == 'customizer',
        assistant: initialState.view.layout.focus == 'assistant'
      }
    } else if (mode === 'single' && initialState.view.layout.mode === 'multi') {
      initialState.view.layout = {
        mode,
        focus: initialState.view.layout.viewer ? 'viewer'
          : initialState.view.layout.customizer ? 'customizer'
          : 'editor'
      }
    }
  }

  initialState.view.showAxes ??= true
  initialState.view.showShadows ??= true

  fs.writeFile(initialState.params.sourcePath, initialState.params.source);
  if (initialState.params.sourcePath !== defaultSourcePath) {
    fs.writeFile(defaultSourcePath, defaultScad);
  }
  
  const defaultFeatures = ['manifold', 'fast-csg', 'lazy-union'];
  defaultFeatures.forEach(f => {
    if (initialState.params.features.indexOf(f) < 0)
    initialState.params.features.push(f);
  });

  return initialState;
}

