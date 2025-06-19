import {hydrate} from 'preact';
import {AgentConnection} from '@lemonmade/web-agents';

import {App} from './App.tsx';

addEventListener('agent-connection-start', (event) => {
  console.log(`[EVENT: agent-connection-start]`, event);

  const {connection} = event as any as {connection: AgentConnection};

  connection.tools.addEventListener('update-tools', (event) => {
    console.log(`[EVENT: update-tools]`, event);
    const tools = Array.from(connection.tools);
    console.log(tools);
  });

  connection.tools.addEventListener('call-tool', (event) => {
    console.log(`[EVENT: call-tool]`, event);
  });

  connection.tools.addEventListener('call-tool-result', (event) => {
    console.log(`[EVENT: call-tool-result]`, event);
  });
});

const agent = new AgentConnection();

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
