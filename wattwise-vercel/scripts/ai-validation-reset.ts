import { resetAiValidationDemo } from '../src/server/services/ai-validation-demo.service';

await resetAiValidationDemo();
console.log('AI validation businesses removed.');
process.exit(0);
