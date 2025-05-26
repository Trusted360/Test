module.exports = {
    server: {
        port: 3000,
        env: 'test',
        host: '192.168.50.56'
    },
    database: {
        url: 'postgresql://simmer:simmer_password@localhost:5432/simmer'
    },
    redis: {
        url: 'redis://localhost:6379'
    },
    ollama: {
        url: 'http://localhost:11434',
        model: 'llama2'
    },
    workflows: {
        schedules: {
            recipeCrawler: '0 0 * * 0', // Weekly
            recipeEnrichment: '0 0 * * 1', // Weekly
            mealPlanGeneration: '0 0 * * 2', // Weekly
            preferenceAnalysis: '0 0 1 * *', // Monthly
            shoppingListExport: '0 0 * * 3' // Weekly
        }
    }
}; 