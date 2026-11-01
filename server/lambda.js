/**
 * server/lambda.js
 * AWS Lambda Adapter for Agent Travel Express Application.
 * Bridges Lambda Function URLs and API Gateway v2/v1 events to the Express server.
 * Operates without external networking or credentials, relying on Lambda execution role.
 */

import serverlessExpress from '@codegenie/serverless-express';
import { app } from './index.js';

let serverlessExpressInstance;

async function setup(event, context) {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

export const handler = async (event, context) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return setup(event, context);
};

export default handler;
