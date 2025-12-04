import MultiTrafficManager from './MultiTrafficManagerV3'
// Example in a Node.js server file (e.g., server.js or index.js)
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use the PORT environment variable

// ... your other app configurations ...

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});

function App() {
  return (
    // 移除 inline style，改由 CSS 控制
    <MultiTrafficManager />
  )
}

export default App
