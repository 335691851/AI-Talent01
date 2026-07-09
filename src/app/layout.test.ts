import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const layoutSource = readFileSync(
  fileURLToPath(new URL("./layout.tsx", import.meta.url)),
  "utf8",
);

test("root layout includes Vercel Analytics", () => {
  expect(layoutSource).toContain(
    'import { Analytics } from "@vercel/analytics/next";',
  );
  expect(layoutSource).toContain("<Analytics />");
});
