/**
 * Test Runner - Run All Tests
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
}

function runTest(testPath: string, testName: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testName}`);
    console.log('='.repeat(60));

    const proc = spawn('npx', ['tsx', testPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      const duration = Date.now() - startTime;
      const passed = code === 0;

      resolve({
        name: testName,
        passed,
        duration
      });
    });
  });
}

async function main() {
  console.log('🚀 Running All Tests...\n');

  const tests = [
    {
      path: path.join(__dirname, 'unit', 'test-vtth-calculator.ts'),
      name: 'VTTH Calculator'
    },
    {
      path: path.join(__dirname, 'unit', 'test-chemical-calculator.ts'),
      name: 'Chemical Calculator'
    },
    {
      path: path.join(__dirname, 'unit', 'test-inventory-comparator.ts'),
      name: 'Inventory Comparator'
    },
    {
      path: path.join(__dirname, 'integration', 'test-full-workflow.ts'),
      name: 'Full Workflow Integration'
    }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.path, test.name);
    results.push(result);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of results) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = (result.duration / 1000).toFixed(2);
    console.log(`${status} | ${result.name} (${duration}s)`);

    if (result.passed) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  console.log('='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${totalPassed} | Failed: ${totalFailed}`);
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main();
