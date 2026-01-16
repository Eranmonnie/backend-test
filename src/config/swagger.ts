import swaggerJsdoc from 'swagger-jsdoc';
import process from 'process';

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || '3000';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Donation Platform API',
      version: '1.0.0',
      description: 'A secure donation platform with wallet management and payment integration',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: NODE_ENV === 'production' 
          ? process.env.PRODUCTION_URL || `http://localhost:${PORT}` 
          : `http://localhost:${PORT}`,
        description: NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp in UTC',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'ISO 8601 timestamp in UTC',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                },
                email: {
                  type: 'string',
                  format: 'email',
                },
                firstName: {
                  type: 'string',
                },
                lastName: {
                  type: 'string',
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time',
                },
                wallet: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      format: 'uuid',
                    },
                    balance: {
                      type: 'number',
                      format: 'float',
                    },
                  },
                },
              },
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token (expires in 15 minutes)',
            },
            refreshToken: {
              type: 'string',
              description: 'Refresh token (expires in 7 days)',
            },
          },
        },
        RefreshTokenResponse: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'New JWT access token (expires in 15 minutes)',
            },
          },
        },
        UserInfo: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            firstName: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            balance: {
              type: 'number',
              format: 'float',
            },
            userId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Donation: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            amount: {
              type: 'number',
              format: 'float',
            },
            donorId: {
              type: 'string',
              format: 'uuid',
            },
            beneficiaryId: {
              type: 'string',
              format: 'uuid',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Beneficiary: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            beneficiaryId: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            nickname: {
              type: 'string',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            walletId: {
              type: 'string',
              format: 'uuid',
            },
            type: {
              type: 'string',
              enum: ['CREDIT', 'DEBIT'],
            },
            amount: {
              type: 'number',
              format: 'float',
            },
            reference: {
              type: 'string',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'SUCCESS', 'FAILED'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
