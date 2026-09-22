import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepository } from '../tools/validate-repo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('仓库插件、技能和 marketplace 自检通过', async () => {
  const result = await validateRepository(root);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.skills, [
    'learning-exam-coach',
    'learning-mastery',
    'learning-material-to-course',
    'learning-review-coach',
    'learning-tutor',
  ]);
});
