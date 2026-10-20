import test from "node:test";
import assert from "node:assert/strict";
import { shiftIso, toIso, weekStartIso } from "../src/lib/dates.js";
import {
  TAGS_PER_ENTRY,
  buildBackup,
  buildText,
  cleanTag,
  cleanTags,
  filterEntries,
  groupByDay,
  isBlank,
  mergeEntries,
  newEntry,
  normalizeEntries,
  parseBackup,
  FREEZES_PER_WEEK,
  streakInfo,
  topTags,
  wordCount,
} from "../src/lib/entries.js";

const e = (id, date, extra = {}) => ({
  id,
  date,
  createdAt: 1,
  title: "",
  body: "x",
  mood: 0,
  tags: [],
  deleted: false,
  updatedAt: 1,
  ...extra,
});

test("tags: tidy, de-duplicate (Turkish case) and limit", () => {
  assert.equal(cleanTag("  #Okul  "), "Okul");
  assert.deepEqual(cleanTags(["İş", "iş", "  ", "aile"]), ["İş", "aile"]);
  assert.equal(cleanTags(Array.from({ length: 12 }, (_, i) => "t" + i)).length, TAGS_PER_ENTRY);
});

test("newEntry: trims, clamps mood and tags", () => {
  const n = newEntry({ date: "2026-10-20", title: "  Merhaba ", body: "gün\n\n", mood: 9, tags: ["a", "a"] });
  assert.equal(n.title, "Merhaba");
  assert.equal(n.body, "gün");
  assert.equal(n.mood, 0);
  assert.deepEqual(n.tags, ["a"]);
  assert.equal(n.deleted, false);
});

test("blank drafts and word count", () => {
  assert.equal(isBlank({ title: " ", body: "\n", mood: 3, tags: ["a"] }), true);
  assert.equal(isBlank({ title: "", body: "a", mood: 0, tags: [] }), false);
  assert.equal(wordCount(""), 0);
  assert.equal(wordCount("  bir iki\nüç "), 3);
});

test("normalize drops broken rows", () => {
  const list = normalizeEntries([null, { id: 1 }, { id: "a", date: "bugün" }, { id: "b", date: "2026-10-20", body: "ok" }]);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "b");
  assert.equal(list[0].mood, 0);
});

test("merge: newest change wins, deletions travel, old tombstones are purged", () => {
  const a = e("1", "2026-10-20", { body: "eski", updatedAt: 10 });
  const b = e("1", "2026-10-20", { body: "yeni", updatedAt: 20 });
  assert.equal(mergeEntries([a], [b])[0].body, "yeni");
  assert.equal(mergeEntries([b], [a])[0].body, "yeni");

  const gone = e("2", "2026-10-20", { deleted: true, updatedAt: Date.now() });
  assert.equal(mergeEntries([e("2", "2026-10-20", { updatedAt: 5 })], [gone])[0].deleted, true);

  const stale = e("3", "2026-01-01", { deleted: true, updatedAt: Date.now() - 31 * 86400000 });
  assert.equal(mergeEntries([stale], []).length, 0);
});

test("groupByDay: today included when empty, newest first", () => {
  const g = groupByDay(
    [e("a", "2026-10-18", { createdAt: 1 }), e("b", "2026-10-18", { createdAt: 5 }), e("c", "2026-10-17", { deleted: true })],
    "2026-10-20"
  );
  assert.deepEqual(g.map((x) => x.date), ["2026-10-20", "2026-10-18"]);
  assert.deepEqual(g[1].items.map((x) => x.id), ["b", "a"]);
  assert.equal(groupByDay([], null).length, 0);
});

test("search: title, body, tags and tag filter (Turkish case-insensitive)", () => {
  const list = [
    e("1", "2026-10-20", { title: "Işık", body: "sabah yürüyüşü", tags: ["spor"] }),
    e("2", "2026-10-20", { body: "İstanbul'da toplantı", tags: ["iş"] }),
    e("3", "2026-10-20", { body: "silinmiş", deleted: true }),
  ];
  assert.deepEqual(filterEntries(list, "ışık").map((x) => x.id), ["1"]);
  assert.deepEqual(filterEntries(list, "istanbul").map((x) => x.id), ["2"]);
  assert.deepEqual(filterEntries(list, "", "İŞ").map((x) => x.id), ["2"]);
  assert.deepEqual(filterEntries(list, "SPOR").map((x) => x.id), ["1"]);
  assert.equal(filterEntries(list, "silinmiş").length, 0);
});

test("topTags: most used first", () => {
  const list = [
    e("1", "2026-10-20", { tags: ["a", "b"] }),
    e("2", "2026-10-19", { tags: ["B"] }),
    e("3", "2026-10-18", { tags: ["c"], deleted: true }),
  ];
  assert.deepEqual(topTags(list), ["b", "a"]);
});

const info = (list, today) => streakInfo(list, today, shiftIso, weekStartIso);
const days = (...ds) => ds.map((d, i) => e("d" + i, d));

test("weeks run Monday to Sunday", () => {
  assert.equal(weekStartIso("2026-10-19"), "2026-10-19"); // Monday
  assert.equal(weekStartIso("2026-10-25"), "2026-10-19"); // Sunday
  assert.equal(weekStartIso("2026-10-26"), "2026-10-26");
  assert.equal(FREEZES_PER_WEEK, 2);
});

test("streak: plain run, today still open", () => {
  const list = days("2026-10-18", "2026-10-19", "2026-10-20");
  assert.equal(info(list, "2026-10-20").count, 3);
  assert.equal(info(list, "2026-10-21").count, 3); // nothing yet today: not penalised
  assert.equal(info([], "2026-10-20").count, 0);
  assert.equal(info([], "2026-10-20").left, 2);
});

test("streak: a missed day is covered by a freeze, and does not add to the count", () => {
  // Mon 19, Tue 20 written; Wed 21 missed; Thu 22 written
  const list = days("2026-10-19", "2026-10-20", "2026-10-22");
  const r = info(list, "2026-10-22");
  assert.equal(r.count, 3);
  assert.equal(r.left, 1);
});

test("streak: two missed days in a week are covered, a third breaks it", () => {
  const base = days("2026-10-19");
  // Tue, Wed missed (2 freezes), Thu written -> alive
  assert.equal(info([...base, e("x", "2026-10-22")], "2026-10-22").count, 2);
  assert.equal(info([...base, e("x", "2026-10-22")], "2026-10-22").left, 0);
  // Tue, Wed, Thu missed, Fri written -> third miss resets, Friday starts over
  assert.equal(info([...base, e("x", "2026-10-23")], "2026-10-23").count, 1);
});

test("streak: freezes renew every Monday and do not carry over", () => {
  // Week A: Mon 19, Tue 20 written; Wed 21, Thu 22 frozen; Fri 23 - Sun 25 written.
  // Week B: Mon 26 written; Tue 27, Wed 28 frozen again (renewed); Thu 29 written.
  const list = days("2026-10-19", "2026-10-20", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-29");
  const r = info(list, "2026-10-29");
  assert.equal(r.count, 7);
  assert.equal(r.left, 0);
  // Unused freezes do not stack: after a perfect week there are still only 2
  const perfect = days("2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26");
  assert.equal(info(perfect, "2026-10-26").left, 2);
});

test("streak: freezes only protect a running streak", () => {
  // Long gap with no streak: nothing to protect, so nothing is spent
  const r = info(days("2026-10-01", "2026-10-21"), "2026-10-21");
  assert.equal(r.count, 1);
  assert.equal(r.left, 2);
});

test("streak: today's missing entry does not use a freeze; yesterday's does", () => {
  const list = days("2026-10-19", "2026-10-20");
  const r = info(list, "2026-10-22"); // Wed 21 missed, Thu 22 not written yet
  assert.equal(r.count, 2);
  assert.equal(r.left, 1);
});

test("shiftIso crosses months and years", () => {
  assert.equal(shiftIso("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftIso("2026-01-01", -1), "2025-12-31");
  assert.equal(toIso(new Date(2026, 9, 20)), "2026-10-20");
});

test("backup round trip", () => {
  const list = [e("1", "2026-10-20", { title: "a", mood: 4, tags: ["x"] }), e("2", "2026-10-19", { deleted: true })];
  const file = JSON.stringify(buildBackup(list));
  const back = parseBackup(file);
  assert.equal(back.length, 1);
  assert.equal(back[0].title, "a");
  assert.equal(back[0].mood, 4);
  assert.equal(parseBackup(JSON.stringify([e("9", "2026-10-01")])).length, 1);
});

test("backup: readable errors for bad files", () => {
  assert.throws(() => parseBackup("not json"), /okunamadı/);
  assert.throws(() => parseBackup('{"foo":1}'), /bulunamadı/);
  assert.throws(() => parseBackup('{"entries":[{"x":1}]}'), /tanınmadı/);
  assert.equal(parseBackup('{"entries":[]}').length, 0);
});

test("text export is newest day first", () => {
  const text = buildText(
    [e("1", "2026-10-19", { body: "dün" }), e("2", "2026-10-20", { title: "Bugün", body: "bu gün", tags: ["x"], mood: 5 })],
    (d) => d
  );
  assert.ok(text.indexOf("2026-10-20") < text.indexOf("2026-10-19"));
  assert.match(text, /#x/);
  assert.match(text, /Çok iyi/);
});
