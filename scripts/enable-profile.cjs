// Run from the repository after copying this file into scripts/.
// Adds only the new route; preserves the existing AI and recipe registrations.
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, '..', 'backend', 'server.js');
const source = fs.readFileSync(target, 'utf8');
const registration = 'app.use("/api/account", require("./routes/account"));';
if (/app\.use\(\s*["']\/api\/account["']/.test(source)) {
  console.log('Account route is already registered.');
} else {
  const pattern = /^([ \t]*)app\.listen\(/m;
  if (!pattern.test(source)) {
    throw new Error('Could not find app.listen in backend/server.js. Add this line before app.listen: ' + registration);
  }
  const updated = source.replace(pattern, registration + '\n\n$1app.listen(');
  fs.writeFileSync(target, updated);
  console.log('Added /api/account to backend/server.js.');
}
