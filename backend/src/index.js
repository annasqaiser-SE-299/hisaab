const app = require('./app');
const { port } = require('./config');

// 0.0.0.0 so a phone on the same Wi-Fi can reach the laptop.
app.listen(port, '0.0.0.0', () => {
  console.log(`Hisaab API listening on http://0.0.0.0:${port}/api/health`);
});
