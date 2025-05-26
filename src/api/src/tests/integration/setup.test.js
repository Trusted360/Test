const request = require('supertest');
const { Pool } = require('pg');
const Redis = require('ioredis');
const config = require('../../config/test.config');

const API_HOST = '192.168.50.56';
const API_PORT = 3000;

describe('System Setup Integration Tests', () => {
    let pgPool;
    let redisClient;

    beforeAll(async () => {
        // Initialize database connection
        pgPool = new Pool(config.database);
        redisClient = new Redis(config.redis.url);
    });

    afterAll(async () => {
        await pgPool.end();
        await redisClient.quit();
    });

    describe('Database Connection', () => {
        it('should connect to PostgreSQL', async () => {
            const result = await pgPool.query('SELECT NOW()');
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].now).toBeDefined();
        });

        it('should have required tables', async () => {
            const tables = [
                'households',
                'members',
                'recipes',
                'meal_plans',
                'shopping_lists',
                'diet_types',
                'meal_history',
                'notifications'
            ];

            for (const table of tables) {
                const result = await pgPool.query(
                    'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
                    [table]
                );
                expect(result.rows[0].exists).toBe(true);
            }
        });
    });

    describe('Redis Connection', () => {
        it('should connect to Redis', async () => {
            const result = await redisClient.ping();
            expect(result).toBe('PONG');
        });

        it('should set and get values', async () => {
            await redisClient.set('test_key', 'test_value');
            const value = await redisClient.get('test_key');
            expect(value).toBe('test_value');
        });
    });

    describe('API Health Check', () => {
        it('should return 200 OK for health check', async () => {
            const response = await request(`http://${API_HOST}:${API_PORT}`)
                .get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', 'ok');
        });
    });

    describe('Traefik Routing', () => {
        it('should access API through Traefik', async () => {
            const response = await request(`http://${API_HOST}`)
                .get('/api/health');
            expect(response.status).toBe(200);
        });

        it('should access Web UI through Traefik', async () => {
            const response = await request(`http://${API_HOST}`)
                .get('/');
            expect(response.status).toBe(200);
        });

        it('should access Traefik dashboard', async () => {
            const response = await request(`http://${API_HOST}`)
                .get('/dashboard');
            expect(response.status).toBe(200);
        });
    });
}); 