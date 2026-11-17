// 88EST - Real estate marketplace (HUGO TECH)
// Faili kuu la server. Linaunganisha database na routes zote.
const http = require('http');
const path = require('path');
const { Router } = require('./server/router');
const db = require('./server/db');

const app = new Router();
require('./server/routes-public')(app);
require('./server/routes-seller')(app);
require('./server/routes-admin')(app);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

db.init()
  .then(() => {
    http
      .createServer((req, res) => app.handle(req, res, PUBLIC_DIR))
      .listen(PORT, () => console.log('88EST inaendesha kwenye port ' + PORT));
  })
  .catch((e) => {
    console.error('Imeshindwa kuunganisha database:', e);
    process.exit(1);
  });
