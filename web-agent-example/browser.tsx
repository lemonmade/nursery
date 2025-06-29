import {hydrate} from 'preact';
import {AgentConnection} from '@lemonmade/web-agents';

import {App} from './App.tsx';

const agent = AgentConnection.defineGlobal();

agent.tools.addEventListener('update', (event) => {
  console.log(`[EVENT: update]`, event);
  const tools = Array.from(agent.tools);
  console.log(tools);
});

agent.tools.addEventListener('call', (event) => {
  console.log(`[EVENT: call]`, event);
});

agent.tools.addEventListener('result', (event) => {
  console.log(`[EVENT: result]`, event);
});

agent.tools.set('get_message', {
  description: 'Get a message from the website to display to the user',
  async call(args) {
    console.log(
      `[TOOL: get_message] called with args: ${JSON.stringify(args)}`,
    );

    return 'Hello, world!';
  },
});

agent.tools.set('random_color', {
  description: 'Set the background color to a random color',
  async call(args) {
    console.log(
      `[TOOL: random_color] called with args: ${JSON.stringify(args)}`,
    );

    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    document.documentElement.style.backgroundColor = randomColor;

    return `Updated background color to ${randomColor}`;
  },
});

const element = document.querySelector('#app')!;

hydrate(<App />, element);
