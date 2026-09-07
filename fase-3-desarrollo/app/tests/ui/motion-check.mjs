import assert from "node:assert/strict";

export async function checkMotion(page, width) {
  await page.goto("http://127.0.0.1:4175");
  await page.getByRole("heading", { name: "Tus límites por categoría" }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const timings = await page.evaluate(() => {
    const css = selector => getComputedStyle(document.querySelector(selector));
    return {
      page: css(".app-content").animationDuration,
      card: css(".budget-card").animationDuration,
      lastDelay: css(".budget-card:last-child").animationDelay,
      feedback: css(".button").transitionDuration,
      progress: css(".budget-progress-track > span").transitionDuration,
    };
  });
  assert.equal(timings.page, "0.44s");
  assert.equal(timings.card, "0.36s");
  assert.equal(timings.lastDelay, "0.105s");
  assert.ok(timings.feedback.split(", ").every(t => t === "0.2s"));
  assert.ok(timings.progress.includes("0.42s"));

  const samples = await page.locator(".budget-card").first().evaluate(element => {
    element.style.animationName = "none";
    void element.offsetWidth;
    element.style.animationName = "";
    const animation = element.getAnimations().find(a => a.animationName === "motion-rise");
    animation.pause();
    const values = [0, 180, 360].map(time => {
      animation.currentTime = time;
      const style = getComputedStyle(element);
      return { opacity: Number(style.opacity), transform: style.transform };
    });
    animation.finish();
    return values;
  });
  assert.equal(samples[0].opacity, 0);
  assert.ok(samples[1].opacity > 0 && samples[1].opacity < 1);
  assert.equal(samples[2].opacity, 1);
  assert.notEqual(samples[0].transform, samples[2].transform);

  const opener = page.getByRole("button", { name: "Nuevo presupuesto", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.equal(await dialog.evaluate(e => getComputedStyle(e).animationDuration), "0.36s");
  assert.equal(await dialog.evaluate(e => e.scrollWidth <= e.clientWidth), true);
  await page.getByLabel("Nombre del presupuesto").fill("Borrador intacto");
  assert.equal(await page.getByLabel("Nombre del presupuesto").inputValue(), "Borrador intacto");
  await page.screenshot({ path: `test-results/budgets/motion-dialog-${width}.png` });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector("dialog")).opacity) === 1 && Number(getComputedStyle(document.querySelector(".app-content")).opacity) === 1);
  await page.screenshot({ path: `test-results/budgets/motion-dialog-settled-${width}.png` });
  // Invoke the DOM event to inspect the start of exit before Playwright's stability wait.
  await page.getByRole("button", { name: "Cancelar", exact: true }).evaluate(button => button.click());
  assert.equal(await dialog.getAttribute("data-closing"), "true");
  assert.equal(await dialog.getAttribute("inert"), "");
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await opener.evaluate(e => document.activeElement === e), true);
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");

  await opener.click();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await opener.click();
  await page.getByRole("button", { name: "Cerrar ventana" }).click();
  await dialog.waitFor({ state: "hidden" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await page.locator(".budget-card").last().evaluate(e => {
    const style = getComputedStyle(e);
    return { duration: parseFloat(style.animationDuration), delay: style.animationDelay, transition: parseFloat(style.transitionDuration) };
  });
  assert.ok(reduced.duration < 0.01 && reduced.transition < 0.01);
  assert.equal(reduced.delay, "0s");
  await opener.click();
  assert.equal(await dialog.evaluate(e => getComputedStyle(e).getPropertyValue("--motion-exit").trim()), "0ms");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  console.log(`OK: movimiento ${width}px; tiempos, interpolación, cierre, Escape, foco, formularios y movimiento reducido.`);
}
