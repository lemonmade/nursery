// Otel

import {NodeSDK} from '@opentelemetry/sdk-node';
import {ConsoleSpanExporter} from '@opentelemetry/sdk-trace-node';
import {
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from '@opentelemetry/sdk-metrics';
import {Resource} from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {trace, SpanStatusCode} from '@opentelemetry/api';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'yourServiceName',
    [SEMRESATTRS_SERVICE_VERSION]: '1.0',
  }),
  traceExporter: new ConsoleSpanExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new ConsoleMetricExporter(),
  }),
});

sdk.start();

// App code

const serverTracer = trace.getTracer('dice-server', '0.1.0');

async function handleRequest(request: Request): Promise<Response> {
  return serverTracer.startActiveSpan('handleRequest', (span) => {
    const url = new URL(request.url);
    const rolls = Number.parseInt(url.searchParams.get('rolls') ?? '', 10);

    if (Number.isNaN(rolls)) {
      span.recordException(new Error('Missing rolls'));
      span.setStatus({code: SpanStatusCode.ERROR});
      span.end();
      return new Response('Missing rolls', {
        status: 400,
      });
    }

    span.end();
    return new Response(JSON.stringify(rollTheDice(rolls, 1, 6)), {
      headers: {'content-type': 'text/plain'},
    });
  });
}

const libraryTracer = trace.getTracer('dice-lib');

function rollTheDice(rolls: number, min: number, max: number) {
  return libraryTracer.startActiveSpan(
    'rollTheDice',
    {attributes: {'dicelib.rolls': rolls.toString()}},
    (span) => {
      const result: number[] = [];
      for (let i = 0; i < rolls; i++) {
        result.push(rollOnce(i, min, max));
      }
      span.end();
      return result;
    },
  );
}

function rollOnce(i: number, min: number, max: number) {
  return libraryTracer.startActiveSpan(`rollOnce:${i}`, (span) => {
    const result = Math.floor(Math.random() * (max - min) + min);
    span.end();
    return result;
  });
}

// Go!

const response = await handleRequest(
  new Request('https://example.com/?rolls=3'),
);
console.log(await response.text());
await new Promise((resolve) => setTimeout(resolve, 10000));
