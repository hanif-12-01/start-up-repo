import { checkAiValidationDemo } from '../src/server/services/ai-validation-demo.service';

const result = await checkAiValidationDemo(process.argv[2]);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ready ? 0 : 1);
