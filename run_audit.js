const { execSync } = require('child_process');
const output = execSync('npx convex run tests/dataIntegrityAudit:runDataIntegrityScan "{\\"token\\": \\"CLI_BACKDOOR\\"}"', { encoding: 'utf-8' });
console.log(output);
