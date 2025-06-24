#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const API_BASE = 'http://localhost:3001';
const UI_BASE = 'http://localhost:3000';

// Demo credentials for testing
const TEST_CREDENTIALS = {
  admin: { email: 'admin@trusted360.com', password: 'demo123' },
  user: { email: 'user@trusted360.com', password: 'demo123' }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || 5000
    };
    
    const req = client.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            success: true,
            status: res.statusCode,
            data: parsedData,
            rawData: data.substring(0, 200)
          });
        } catch (e) {
          resolve({
            success: true,
            status: res.statusCode,
            data: null,
            rawData: data.substring(0, 200)
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve({ available: false, inUse: true });
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve({ available: true, inUse: false });
    });
  });
}

async function testAuthentication() {
  log('\n🔐 Authentication Flow Test:', 'blue');
  const results = { passed: 0, failed: 0, total: 0 };
  
  // Test 1: Login with valid credentials
  results.total++;
  try {
    const loginResult = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: TEST_CREDENTIALS.admin
    });
    
    if (loginResult.success && loginResult.status === 200 && loginResult.data.success && loginResult.data.token) {
      log('  ✅ Admin login successful', 'green');
      results.passed++;
      
      // Test 2: Access protected endpoint with token
      results.total++;
      const profileResult = await makeRequest(`${API_BASE}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${loginResult.data.token}`
        }
      });
      
      if (profileResult.success && profileResult.status === 200 && profileResult.data.success) {
        log('  ✅ Protected endpoint access successful', 'green');
        results.passed++;
      } else {
        log('  ❌ Protected endpoint access failed', 'red');
        results.failed++;
      }
      
      // Test 3: Dashboard data endpoint
      results.total++;
      const dashboardResult = await makeRequest(`${API_BASE}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${loginResult.data.token}`
        }
      });
      
      if (dashboardResult.success && dashboardResult.status === 200 && dashboardResult.data.success) {
        log('  ✅ Dashboard data endpoint accessible', 'green');
        results.passed++;
      } else {
        log('  ❌ Dashboard data endpoint failed', 'red');
        results.failed++;
      }
      
    } else {
      log('  ❌ Admin login failed', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`  ❌ Login test error: ${error.message}`, 'red');
    results.failed++;
  }
  
  // Test 4: Login with invalid credentials
  results.total++;
  try {
    const invalidLoginResult = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: 'invalid@test.com', password: 'wrongpassword' }
    });
    
    if (invalidLoginResult.success && invalidLoginResult.status === 401) {
      log('  ✅ Invalid login properly rejected', 'green');
      results.passed++;
    } else {
      log('  ❌ Invalid login not properly rejected', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`  ❌ Invalid login test error: ${error.message}`, 'red');
    results.failed++;
  }
  
  // Test 5: Access protected endpoint without token
  results.total++;
  try {
    const noTokenResult = await makeRequest(`${API_BASE}/api/auth/profile`);
    
    if (noTokenResult.success && noTokenResult.status === 401) {
      log('  ✅ Unauthorized access properly blocked', 'green');
      results.passed++;
    } else {
      log('  ❌ Unauthorized access not properly blocked', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`  ❌ Unauthorized access test error: ${error.message}`, 'red');
    results.failed++;
  }
  
  return results;
}

async function testUI() {
  log('\n🌐 UI Accessibility Test:', 'blue');
  const results = { passed: 0, failed: 0, total: 0 };
  
  // Test 1: Dashboard homepage
  results.total++;
  try {
    const homeResult = await makeRequest(UI_BASE);
    
    if (homeResult.success && homeResult.status === 200) {
      log('  ✅ Dashboard homepage accessible', 'green');
      results.passed++;
    } else {
      log(`  ❌ Dashboard homepage failed (${homeResult.status})`, 'red');
      results.failed++;
    }
  } catch (error) {
    log(`  ❌ Dashboard homepage error: ${error.message}`, 'red');
    results.failed++;
  }
  
  // Test 2: Check if it's a React app (look for typical React indicators)
  results.total++;
  try {
    const reactResult = await makeRequest(UI_BASE);
    
    if (reactResult.success && reactResult.rawData && 
        (reactResult.rawData.includes('react') || 
         reactResult.rawData.includes('root') || 
         reactResult.rawData.includes('div id="root"'))) {
      log('  ✅ React application detected', 'green');
      results.passed++;
    } else {
      log('  ❌ React application not detected', 'red');
      results.failed++;
    }
  } catch (error) {
    log(`  ❌ React detection error: ${error.message}`, 'red');
    results.failed++;
  }
  
  return results;
}

async function runStandupTest() {
  log('\n🚀 Trusted360 Standup Test - Real Functionality Check', 'bold');
  log('='.repeat(60), 'blue');
  
  const overallResults = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Check if services are running on expected ports
  log('\n📋 Service Status Check:', 'blue');
  const services = [
    { port: 5432, name: 'PostgreSQL', required: false },
    { port: 6379, name: 'Redis', required: false },
    { port: 3001, name: 'API Server', required: true },
    { port: 3000, name: 'Dashboard UI', required: true }
  ];
  
  let criticalServicesRunning = true;
  
  for (const service of services) {
    const status = await checkPort(service.port);
    if (status.inUse) {
      log(`  ✅ ${service.name} (port ${service.port}): Running`, 'green');
    } else {
      const severity = service.required ? 'red' : 'yellow';
      const icon = service.required ? '❌' : '⚠️';
      log(`  ${icon} ${service.name} (port ${service.port}): Not running`, severity);
      if (service.required) {
        criticalServicesRunning = false;
      }
    }
  }
  
  if (!criticalServicesRunning) {
    log('\n❌ Critical services not running. Cannot proceed with tests.', 'red');
    log('\n💡 To start services:', 'blue');
    log('  • API: cd src/api && node minimal-server.js', 'yellow');
    log('  • UI: cd src/dashboard && npm run dev', 'yellow');
    process.exit(1);
  }
  
  // Test API Health
  log('\n🏥 API Health Check:', 'blue');
  overallResults.total++;
  try {
    const healthResult = await makeRequest(`${API_BASE}/health`);
    if (healthResult.success && healthResult.status === 200) {
      log('  ✅ API health check passed', 'green');
      overallResults.passed++;
    } else {
      log('  ❌ API health check failed', 'red');
      overallResults.failed++;
    }
  } catch (error) {
    log(`  ❌ API health check error: ${error.message}`, 'red');
    overallResults.failed++;
  }
  
  // Test Authentication
  const authResults = await testAuthentication();
  overallResults.passed += authResults.passed;
  overallResults.failed += authResults.failed;
  overallResults.total += authResults.total;
  
  // Test UI
  const uiResults = await testUI();
  overallResults.passed += uiResults.passed;
  overallResults.failed += uiResults.failed;
  overallResults.total += uiResults.total;
  
  // Summary
  log('\n📊 Test Summary:', 'bold');
  log('='.repeat(30), 'blue');
  log(`Total Tests: ${overallResults.total}`, 'blue');
  log(`Passed: ${overallResults.passed}`, 'green');
  log(`Failed: ${overallResults.failed}`, 'red');
  
  const successRate = ((overallResults.passed / overallResults.total) * 100).toFixed(1);
  log(`Success Rate: ${successRate}%`, successRate > 70 ? 'green' : 'red');
  
  if (overallResults.failed === 0) {
    log('\n🎉 All tests passed! UI and Authentication are working correctly.', 'green');
  } else if (successRate > 70) {
    log('\n⚠️  Most tests passed. Core functionality appears to work.', 'yellow');
  } else {
    log('\n❌ Multiple issues detected. System may not be ready.', 'red');
  }
  
  // Detailed Results
  log('\n📋 Test Details:', 'blue');
  log(`  • Authentication: ${authResults.passed}/${authResults.total} passed`, 
      authResults.failed === 0 ? 'green' : 'yellow');
  log(`  • UI Accessibility: ${uiResults.passed}/${uiResults.total} passed`, 
      uiResults.failed === 0 ? 'green' : 'yellow');
  
  // Access Information
  log('\n🔗 Access Information:', 'blue');
  log(`  • Dashboard UI: ${UI_BASE}`, 'blue');
  log(`  • API Health: ${API_BASE}/health`, 'blue');
  log(`  • Login Endpoint: ${API_BASE}/api/auth/login`, 'blue');
  
  log('\n👤 Demo Accounts for Testing:', 'blue');
  log('  • Admin: admin@trusted360.com / demo123', 'yellow');
  log('  • User: user@trusted360.com / demo123', 'yellow');
  
  if (overallResults.failed > 0) {
    log('\n💡 Troubleshooting:', 'blue');
    log('  • Check browser console for errors', 'yellow');
    log('  • Verify CORS settings if login fails', 'yellow');
    log('  • Check network tab for failed requests', 'yellow');
  }
  
  process.exit(overallResults.failed > 0 ? 1 : 0);
}

// Run the test
if (require.main === module) {
  runStandupTest().catch(error => {
    log(`\n❌ Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runStandupTest }; 