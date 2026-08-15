import { seedAiValidationDemo } from '../src/server/services/ai-validation-demo.service';

const anchorMonth = process.argv[2];
const result = await seedAiValidationDemo(anchorMonth);
console.log(JSON.stringify({
  ...result,
  email: result.email,
  password: 'REDACTED',
}, null, 2));
process.exit(0);
