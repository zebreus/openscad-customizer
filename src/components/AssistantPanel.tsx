// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CSSProperties, forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { FSContext, ModelContext } from './contexts';
import { StlViewer} from "react-stl-viewer";
import { ColorPicker } from 'primereact/colorpicker';
import { defaultModelColor } from '../state/initial-state';
import { Message, MessageContent, ToolCall } from '../state/app-state';
import { raw_render } from '../runner/actions';
import { spawnOpenSCAD } from '../runner/openscad-runner';
import { Model } from '../state/model';
import { render } from '@testing-library/react';

export const SYSTEM_MESSAGE: Message = {
  "role": "system",
  "content": `
    You are an expert 3D model creator.
    You use OpenSCAD to create 3D models that correspond to the user's description.
    You use a rendering tool to preview your successive attempts at creating a model,
    then you look at the resulting image and you analyze it very critically. If it doesn't realistically look like what
    the user requested, you revise your code and try again, as many times as needed to get an acceptable result.
    Don't ask the user if they're happy when you can see the model is very basic or wrong, just improve it straight away.
  `
}

export function MessageContentView({content}: {content: MessageContent | null}) {
  if (!content) {
    return null;
  } else if (typeof content === 'string') {
    return <>{content}</>
  } else {
    return (
      <div>
        {content.map((item, i) => {
          if (item.type === 'text') {
            return <div key={i}>{item.text}</div>
          } else {
            return <img key={i} src={item.image_url.url} alt='' />
          }
        })}
      </div>
    )
  }
}

// tool call view
export function ToolCallView({tool_call}: {tool_call: ToolCall}) {
  if (tool_call.function.name === 'render_openscad_to_image') {
    return (
      <pre className='tool-call'>{JSON.parse(tool_call.function.arguments).source}</pre>
    )
  }
  return (
    <pre className='tool-call'>
      Tool call: {tool_call.function.name} {JSON.stringify(JSON.parse(tool_call.function.arguments), null, 2)}
    </pre>
  )
}

export function MessageView({message}: {message: Message}) {
  return (
    <div className={`message role-${message.role}`}>
      <MessageContentView content={message.content} />
      {'tool_calls' in message && message.tool_calls?.map((tool_call, i) => <ToolCallView key={i} tool_call={tool_call} />)}
    </div>
  )
}

const OPENAI_API_KEY = "...";
const RENDER_TOOL_NAME = "render_openscad_to_image";

async function complete(messages: Message[]) {
  console.log('MESSAGES', messages);
  const response = await (await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        // "model": "gpt-4o",
        "model": "gpt-4-vision-preview",
        // max_tokens=300,
        // model="gpt-4-vision-preview",
        "messages": messages,
        "tools": [
          {
            "type": "function",
            "function": {
              "name": RENDER_TOOL_NAME,
              "parameters": {
                "type": "object",
                "properties": {
                  "source": {
                    "description": "The OpenSCAD source code to render",
                    "type": "string"
                  }
                }
              }
            }
          }
        ],
      })
    }
  )).json();
  console.log('RESPONSE', response)

  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.choices[0].message;
}

function renderStlToPngDataUri(stlFile: File, color: string = defaultModelColor) {
  return new Promise<string>((resolve, reject) => {
    const rootElement = document.getElementById('temp-renderer') as HTMLElement;
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <StlViewer
            // className='absolute-fill'
            style={{
              width: '400px',
              height: '400px',
              minHeight: '400px',
              maxHeight: '400px',
              zIndex: 0,
              // flex: 1,
              // width: '100%'
            }}
            canvasId='temp-renderer-canvas'
            onFinishLoading={() => {
              const canvas = [...document.getElementById('temp-renderer-canvas')?.getElementsByTagName('canvas')??[]][0] as HTMLCanvasElement;
              setTimeout(() => {
                const dataUri = canvas.toDataURL('image/png');//.split(',')[1];
                // console.log(dataUri);
                rootElement.innerHTML = '';
                resolve(dataUri);
              }, 1000);
            }}
            onError={e => {
              // rootElement.innerHTML = '';
              reject(e);
            }}
            // ref={stlModelRef}
            showAxes={false}
            orbitControls
            shadows={false}
            modelProps={{color}}
            url={URL.createObjectURL(stlFile)}
            />
      </React.StrictMode>
    );
  });
}

export default function AssistantPanel({className, style}: {className?: string, style?: CSSProperties}) {
  const model = useContext(ModelContext);
  if (!model) throw new Error('No model');

  const fs = useContext(FSContext);
  if (!fs) throw new Error('No FS');

  const state = model.state;

  const appendMessage = (message: Message) => {
    model.mutate(m => {
      // m.assistant ??= {messages: []};
      m.assistant.messages.push(message);
    });
  };
  
  async function resume() {
    const messages = state.assistant.messages;
    let responseMessage;
    do {
      //*
      if (messages.length > 0 && messages[messages.length-1].role === 'assistant') {
        responseMessage = messages[messages.length-1];
      } else {
        model!.mutate(m => m.assistant.status = 'Asking Model');
        responseMessage = await complete(messages);
        appendMessage(responseMessage);
        model!.mutate(m => m.assistant.status = undefined);
      }
      //*/
      if (responseMessage.tool_calls) {
        for (const tool_call of responseMessage.tool_calls) {
          if (tool_call.function.name === RENDER_TOOL_NAME) {
            const {source} = JSON.parse(tool_call.function.arguments);

            const sourcePath = `${tool_call.id}.scad`;
            const outPath = sourcePath + '.stl';
            fs!.writeFile(sourcePath, source);

            model!.mutate(m => m.assistant.status = 'Rendering STL');

            const job = spawnOpenSCAD({
              inputs: [[sourcePath, source]],
              args: [
                sourcePath,
                '-o', outPath,
                "--export-format=binstl",
                // '-o', 'out.png', '--render', 'cgal',
                '--enable=manifold', '--enable=lazy-union',
              ],
              outputPaths: [outPath],
            });

            const results = await job;
            if (results.exitCode != 0 || results.error || !results.outputs?.length) {
              appendMessage({
                role: 'tool',
                name: RENDER_TOOL_NAME,
                tool_call_id: tool_call.id,
                content: `Rendering failed: ${JSON.stringify(results.mergedOutputs, null, 2)}`
              });
              model!.mutate(m => m.assistant.status = undefined);
            } else {
              const [[_, content]] = results.outputs;
              const stlFile = new File([new Blob([content], { type: "application/octet-stream" })], outPath);

              model!.mutate(m => m.assistant.status = 'Rendering PNG');
            
              const dataUri = await renderStlToPngDataUri(stlFile);

              appendMessage({
                role: 'tool',
                name: RENDER_TOOL_NAME,
                tool_call_id: tool_call.id,
                content: [{
                  type: "image_url",
                  image_url: {
                    url: dataUri,
                    // "data:image/png;base64," + btoa(imageBytes),
                    // detail:"medium"
                  },
                }]
              });

              model!.mutate(m => m.assistant.status = undefined);
            }
          }
        }
      }
    } while (responseMessage.tool_calls);
  }

  const [input, setInput] = useState('');

  async function onInput() {
    appendMessage({role: 'user', content: input});
    await resume();
  }

  return (
    <div className={className}
          style={{
              display: 'flex',
              flexDirection: 'column', 
              flex: 1, 
              position: 'relative',
              width: '100%',
              ...(style ?? {})
          }}>
      {state.assistant?.messages.map(
        (message, i) => <MessageView key={i} message={message} />)
      }
      {state.assistant?.status ? <div>{state.assistant.status}...</div> : null}
      <input
          className="message role-user"
          onKeyPress={e => () => { if (e.keyCode === 13) onInput()}}
          type="text" id="input" value={input} onChange={e => setInput(e.target.value)} 
          placeholder="Describe what you want to create"/>
      
      <button onClick={onInput}>Enter</button>
      <button onClick={resume}>Resume</button>
      
      
    </div>
  )
}
