#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const WORKING_DIR = process.argv[2] || process.cwd();

const server = new Server(
  {
    name: 'fujdq-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read the complete contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the file to read (relative to working directory)',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the file to write (relative to working directory)',
            },
            content: {
              type: 'string',
              description: 'Content to write to the file',
            },
          },
          required: ['file_path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List all files and directories in a given path',
        inputSchema: {
          type: 'object',
          properties: {
            dir_path: {
              type: 'string',
              description: 'Path to the directory to list (relative to working directory)',
            },
          },
          required: ['dir_path'],
        },
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            dir_path: {
              type: 'string',
              description: 'Path to the directory to create (relative to working directory)',
            },
          },
          required: ['dir_path'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the file to delete (relative to working directory)',
            },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'delete_directory',
        description: 'Delete a directory and all its contents',
        inputSchema: {
          type: 'object',
          properties: {
            dir_path: {
              type: 'string',
              description: 'Path to the directory to delete (relative to working directory)',
            },
          },
          required: ['dir_path'],
        },
      },
      {
        name: 'move_file',
        description: 'Move or rename a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            source_path: {
              type: 'string',
              description: 'Source path (relative to working directory)',
            },
            destination_path: {
              type: 'string',
              description: 'Destination path (relative to working directory)',
            },
          },
          required: ['source_path', 'destination_path'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'read_file': {
        const filePath = path.resolve(WORKING_DIR, args.file_path);
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content: [{ type: 'text', text: content }],
        };
      }

      case 'write_file': {
        const filePath = path.resolve(WORKING_DIR, args.file_path);
        await fs.writeFile(filePath, args.content, 'utf-8');
        return {
          content: [{ type: 'text', text: `Successfully wrote to ${args.file_path}` }],
        };
      }

      case 'list_directory': {
        const dirPath = path.resolve(WORKING_DIR, args.dir_path);
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const items = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(items, null, 2) }],
        };
      }

      case 'create_directory': {
        const dirPath = path.resolve(WORKING_DIR, args.dir_path);
        await fs.mkdir(dirPath, { recursive: true });
        return {
          content: [{ type: 'text', text: `Successfully created directory: ${args.dir_path}` }],
        };
      }

      case 'delete_file': {
        const filePath = path.resolve(WORKING_DIR, args.file_path);
        await fs.unlink(filePath);
        return {
          content: [{ type: 'text', text: `Successfully deleted file: ${args.file_path}` }],
        };
      }

      case 'delete_directory': {
        const dirPath = path.resolve(WORKING_DIR, args.dir_path);
        await fs.rm(dirPath, { recursive: true, force: true });
        return {
          content: [{ type: 'text', text: `Successfully deleted directory: ${args.dir_path}` }],
        };
      }

      case 'move_file': {
        const sourcePath = path.resolve(WORKING_DIR, args.source_path);
        const destPath = path.resolve(WORKING_DIR, args.destination_path);
        await fs.rename(sourcePath, destPath);
        return {
          content: [{ type: 'text', text: `Successfully moved from ${args.source_path} to ${args.destination_path}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FUJDQ MCP Server running on:', WORKING_DIR);
}

main().catch(console.error);
