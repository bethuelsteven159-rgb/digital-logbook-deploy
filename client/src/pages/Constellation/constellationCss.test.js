import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/pages/Constellation/constellation.css'), 'utf8');

function ruleBody(selector) {
  const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : '';
}

it('defines the app-shell layout contract so a fresh /constellation load is not pushed below the fold', () => {
  // Regression: these rules previously existed only in the Dashboard/Projects/ProjectDetails
  // <style> blocks, which unmount on navigation. A direct load of /constellation then fell
  // back to display:block and the whole interface started one viewport down.
  const shell = ruleBody('\\.app-shell');
  expect(shell).toMatch(/display:\s*flex/);
  expect(shell).toMatch(/min-height:\s*100vh/);

  const main = ruleBody('\\.app-main');
  expect(main).toMatch(/flex:\s*1/);
  expect(main).toMatch(/min-width:\s*0/);
});
