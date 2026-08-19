import { ClientFunction, Selector } from "testcafe";

const clearTheme = ClientFunction(() => {
  window.localStorage.removeItem("mtg-deck-builder-theme");
});
const storedTheme = ClientFunction(() =>
  window.localStorage.getItem("mtg-deck-builder-theme"),
);

fixture("Theme appearance")
  .page("http://localhost:3000/settings")
  .beforeEach(async (t) => {
    await clearTheme();
    await t.navigateTo("/settings");
  });

test("fresh storage starts in dark mode", async (t) => {
  await t
    .expect(Selector("html").hasClass("dark"))
    .ok()
    .expect(storedTheme())
    .eql(null);
});

test("explicit light selection persists after reload", async (t) => {
  await t
    .click('[data-testid="theme-light"]')
    .expect(Selector("html").hasClass("light"))
    .ok()
    .expect(storedTheme())
    .eql("light")
    .navigateTo("/settings")
    .expect(Selector("html").hasClass("light"))
    .ok();
});

test("returning to dark persists after reload", async (t) => {
  await t
    .click('[data-testid="theme-light"]')
    .click('[data-testid="theme-dark"]')
    .expect(Selector("html").hasClass("dark"))
    .ok()
    .expect(storedTheme())
    .eql("dark")
    .navigateTo("/settings")
    .expect(Selector("html").hasClass("dark"))
    .ok();
});
