import test from "node:test";
import assert from "node:assert/strict";
import {
  alsoSeeHasItems,
  normalizeAlsoSee,
  normalizeSiteUrl,
  renderAlsoSeeMarkup,
} from "../app/shell/render-shell.js";

test("normalizeSiteUrl strips trailing slash, query, and hash", () => {
  assert.equal(
    normalizeSiteUrl("https://Example.com/app/?x=1#y"),
    "https://example.com/app"
  );
  assert.equal(
    normalizeSiteUrl("https://example.com/app/"),
    "https://example.com/app"
  );
});

test("normalizeAlsoSee excludes the current appUrl from flat links", () => {
  const sections = normalizeAlsoSee(
    [
      {
        label: "Self",
        url: "https://filcuk.github.io/microapp-template/",
      },
      {
        label: "Other",
        url: "https://pqms.gh.fitec.dev/",
      },
    ],
    "https://filcuk.github.io/microapp-template"
  );

  assert.equal(sections.length, 1);
  assert.equal(sections[0].topic, null);
  assert.equal(sections[0].items.length, 1);
  assert.equal(sections[0].items[0].label, "Other");
});

test("normalizeAlsoSee keeps topic sections and drops empty ones after appUrl filter", () => {
  const sections = normalizeAlsoSee(
    [
      {
        topic: "Power BI",
        items: [
          {
            label: "Self",
            url: "https://filcuk.github.io/pbi-tabulator/",
          },
          {
            label: "Other",
            url: "https://filcuk.github.io/pqm-stepper/",
          },
        ],
      },
      {
        topic: "Only self",
        items: [
          {
            label: "Self",
            url: "https://filcuk.github.io/pbi-tabulator/",
          },
        ],
      },
      {
        label: "Profile",
        url: "https://github.com/filcuk",
      },
    ],
    "https://filcuk.github.io/pbi-tabulator/"
  );

  assert.equal(sections.length, 2);
  assert.equal(sections[0].topic, "Power BI");
  assert.deepEqual(
    sections[0].items.map((item) => item.label),
    ["Other"]
  );
  assert.equal(sections[1].topic, null);
  assert.equal(sections[1].items[0].label, "Profile");
});

test("normalizeAlsoSee filters topics by whitelist (case-insensitive)", () => {
  const sections = normalizeAlsoSee(
    [
      {
        topic: "Power BI",
        items: [{ label: "A", url: "https://example.com/a" }],
      },
      {
        topic: "Database",
        items: [{ label: "B", url: "https://example.com/b" }],
      },
      {
        label: "Profile",
        url: "https://github.com/filcuk",
      },
    ],
    "",
    ["power bi"]
  );

  assert.equal(sections.length, 2);
  assert.equal(sections[0].topic, "Power BI");
  assert.equal(sections[1].topic, null);
  assert.equal(sections[1].items[0].label, "Profile");
});

test("normalizeAlsoSee empty topic whitelist keeps only flat links", () => {
  const sections = normalizeAlsoSee(
    [
      {
        topic: "Power BI",
        items: [{ label: "A", url: "https://example.com/a" }],
      },
      {
        label: "Profile",
        url: "https://github.com/filcuk",
      },
    ],
    "",
    []
  );

  assert.equal(sections.length, 1);
  assert.equal(sections[0].topic, null);
  assert.equal(sections[0].items[0].label, "Profile");
});

test("renderAlsoSeeMarkup emits group headers for topics", () => {
  const markup = renderAlsoSeeMarkup([
    {
      topic: "Database",
      items: [
        {
          label: "CS Builder",
          subtitle: "Zero-knowledge",
          url: "https://example.com/cs",
          iconLight: "",
          iconDark: "",
        },
      ],
    },
  ]);

  assert.match(markup, /dropdown-menu-group">Database</);
  assert.match(markup, /href="https:\/\/example\.com\/cs"/);
  assert.match(markup, /CS Builder/);
  assert.equal(alsoSeeHasItems([]), false);
  assert.equal(
    alsoSeeHasItems([{ topic: "X", items: [] }]),
    false
  );
});

test("renderAlsoSeeMarkup adds a separator before ungrouped links", () => {
  const markup = renderAlsoSeeMarkup([
    {
      topic: "Database",
      items: [
        {
          label: "CS Builder",
          subtitle: "",
          url: "https://example.com/cs",
          iconLight: "",
          iconDark: "",
        },
      ],
    },
    {
      topic: null,
      items: [
        {
          label: "Profile",
          subtitle: "",
          url: "https://github.com/filcuk",
          iconLight: "",
          iconDark: "",
        },
      ],
    },
  ]);

  assert.match(
    markup,
    /dropdown-menu-group">Database[\s\S]*dropdown-menu-separator[\s\S]*Profile/
  );
});