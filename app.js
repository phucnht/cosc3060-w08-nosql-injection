const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Set up an in-memory database
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});


// Create users table and insert users
db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      username VARCHAR(100) NOT NULL,
      password VARCHAR(60) NOT NULL
    );`)
    .run(`INSERT INTO users (username, password) VALUES ('admin', 'secret');`)
    .run(`INSERT INTO users (username, password) VALUES ('john', ?);`,
      [bcrypt.hashSync('nodejs', 10)]);
});


// Function to render HTML
const renderHTML = (message = '') => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <title>SQL Injection Example</title>
    </head>
    <body>
      ${message ? `<p style="color: blue;">${message}</p>` : ''}

      <h2>Tyrell Corp. Login</h2>
      <p>Welcome to Tyrell Corporation. Enter login details below.</p>

      <p>A few things to test:</p>
      <ul>
        <li>Login as user \`admin\` with password \`secret\`</li>
        <li>Login as user \`admin\` with password \`<code>' OR 1 = 1 LIMIT 1;'</code>\`</li>
        <li>Repeat with prepared statements checkbox enabled</li>
        <li>Login as user \`john\` with password \`nodejs\` (it's broken, you will fix it in the activity class).</li>
      </ul>

      <form method="post">
          <div class="form-group">
              <label for="user">Username:</label>
              <input type="text" name="user" id="user" value="admin" />
          </div>
          <div class="form-group">
              <label for="pass">Password:</label>
              <input type="password" name="pass" id="pass" value="" />
          </div>
          <div class="form-group">
              <label for="ps">Enable prepared statements:</label>
              <input type="checkbox" id="ps" name="ps" />
          </div>

          <input type="submit" name="login" value="Login" />
      </form>
    </body>
    </html>
  `;
};

// Routes
app.get('/', (req, res) => {
  res.send(renderHTML());
});

app.post('/', (req, res) => {
  const { user, pass, ps } = req.body;
  let message = 'Login failed';

  const checkUser = (err, row) => {
    if (err) {
      console.error(err.message);
      res.send(renderHTML('An error occurred.'));
      return;
    }
    if (row) {
      message = `Login success with user \`${user}\` and pass \`${pass}\`.`;
    } else {
      message = 'Login failed';
    }
    res.send(renderHTML(message));
  };

  if (ps === 'on') {
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [user], (err, row) => {
      if (row && bcrypt.compareSync(pass, row.password)) {
        checkUser(err, row);
      } else {
        res.send(renderHTML('Login failed'));
      }
    });
  } else {
    // Note: This is insecure and added for educational purposes only
    const sql = `SELECT * FROM users WHERE username = '${user}' AND password = '${pass}';`;
    db.get(sql, [], checkUser);
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
