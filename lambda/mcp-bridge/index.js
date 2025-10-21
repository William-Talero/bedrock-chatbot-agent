const https = require('https');
const http = require('http');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

async function sendMcpRequest(method, params) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_SERVER_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const postData = JSON.stringify({
      method,
      params
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${MCP_AUTH_TOKEN}`
      }
    };

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse MCP response: ${e.message}`));
          }
        } else {
          reject(new Error(`MCP request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`MCP request error: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

function mapBedrockToMcpTool(apiPath, parameters) {
  const toolMapping = {
    '/create-ec2': {
      tool: 'create_ec2_instance',
      mapper: (params) => ({
        instanceType: params.instanceType,
        ami: params.ami,
        tags: {
          Project: params.projectName,
          Department: params.department || 'Infrastructure',
          Environment: params.environment || 'development',
          CreatedBy: 'DaviviendaAgent'
        }
      })
    },
    '/create-s3-bucket': {
      tool: 'create_s3_bucket',
      mapper: (params) => ({
        bucketName: params.bucketName,
        region: params.region || 'us-east-1',
        tags: {
          Project: params.projectName,
          CreatedBy: 'DaviviendaAgent'
        }
      })
    },
    '/list-resources': {
      tool: 'list_resources',
      mapper: (params) => ({
        filters: {
          Project: params.projectName,
          Department: params.department,
          ResourceType: params.resourceType
        }
      })
    },
    '/create-rds': {
      tool: 'create_rds_instance',
      mapper: (params) => ({
        dbInstanceIdentifier: params.dbInstanceIdentifier,
        engine: params.engine,
        instanceClass: params.instanceClass,
        tags: {
          Project: params.projectName,
          CreatedBy: 'DaviviendaAgent'
        }
      })
    }
  };

  const mapping = toolMapping[apiPath];
  if (!mapping) {
    throw new Error(`Unknown API path: ${apiPath}`);
  }

  return {
    tool: mapping.tool,
    params: mapping.mapper(parameters)
  };
}

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const { apiPath, parameters } = event;

    if (!apiPath) {
      return {
        statusCode: 400,
        body: {
          error: 'Missing apiPath in request'
        }
      };
    }

    const { tool, params } = mapBedrockToMcpTool(apiPath, parameters || {});

    console.log(`Executing MCP tool: ${tool}`, params);

    const mcpResponse = await sendMcpRequest('execute_tool', {
      tool,
      parameters: params
    });

    console.log('MCP response:', mcpResponse);

    return {
      statusCode: 200,
      body: mcpResponse
    };

  } catch (error) {
    console.error('Error processing request:', error);

    return {
      statusCode: 500,
      body: {
        error: error.message,
        details: 'Failed to execute infrastructure tool via MCP'
      }
    };
  }
};
