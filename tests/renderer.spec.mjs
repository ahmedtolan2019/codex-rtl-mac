import {test,expect} from '@playwright/test';
for(const width of [1280,480])test(`mixed text and native-style link regressions at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/docs/demo.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect(page.locator('#results')).toHaveAttribute('data-total','27');expect(await page.locator('#results').textContent()).not.toContain('FAIL');await expect(page.locator('#results')).toHaveAttribute('data-passed','27');
 await page.getByRole('button',{name:'Rebuild link labels',exact:true}).click();await expect(page.locator('#native-link-0 bdi').filter({hasText:'12 GB'})).toHaveCount(1);await page.getByRole('button',{name:'Check rendering',exact:true}).click();await expect(page.locator('#results')).not.toContainText('FAIL');
 await page.getByRole('button',{name:'Simulate streaming',exact:true}).click();await expect(page.locator('#results')).toHaveAttribute('data-passed','30');
 expect(errors).toEqual([]);
});
test('baseline has no toolkit changes; switch applies the renderer',async({page})=>{
 await page.goto('/docs/demo.html?mode=baseline');await expect(page.locator('body')).toHaveAttribute('data-ready','true');await expect(page.locator('#native-link-0 bdi')).toHaveCount(0);await expect(page.locator('#results')).toContainText('FAIL');
 await page.getByRole('button',{name:'Show correction',exact:true}).click();await expect(page.locator('#results')).toHaveAttribute('data-passed','27');
});
