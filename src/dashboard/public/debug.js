// Debug script to catch and display errors on the page
window.onerror = function(message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.padding = '20px';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontSize = '16px';
  errorDiv.style.fontFamily = 'monospace';
  errorDiv.innerHTML = `<strong>Error:</strong> ${message}<br>
                        <strong>Source:</strong> ${source}<br>
                        <strong>Line:</strong> ${lineno}<br>
                        <strong>Column:</strong> ${colno}<br>
                        <strong>Stack:</strong> ${error ? error.stack : 'N/A'}`;
  document.body.appendChild(errorDiv);
  return false;
};

// Log all environment variables
document.addEventListener('DOMContentLoaded', function() {
  const envDiv = document.createElement('div');
  envDiv.style.position = 'fixed';
  envDiv.style.bottom = '0';
  envDiv.style.left = '0';
  envDiv.style.width = '100%';
  envDiv.style.padding = '20px';
  envDiv.style.backgroundColor = 'black';
  envDiv.style.color = 'white';
  envDiv.style.zIndex = '9999';
  envDiv.style.fontSize = '16px';
  envDiv.style.fontFamily = 'monospace';
  
  // Try to extract env variables from window
  const envInfo = [];
  
  // Check if import.meta.env is exposed to window somehow
  if (window.import && window.import.meta && window.import.meta.env) {
    for (const key in window.import.meta.env) {
      envInfo.push(`${key}: ${window.import.meta.env[key]}`);
    }
  }
  
  // Check for any global VITE_ variables
  for (const key in window) {
    if (key.startsWith('VITE_')) {
      envInfo.push(`${key}: ${window[key]}`);
    }
  }
  
  // Display API URL info
  envInfo.push(`window.location: ${window.location.href}`);
  
  envDiv.innerHTML = `<strong>Environment Info:</strong><br>${envInfo.join('<br>')}`;
  document.body.appendChild(envDiv);
}); 