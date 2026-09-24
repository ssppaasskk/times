// scripts/parse-changes.js
const fs = require("fs");
const path = require("path");
const { parseString } = require("xml2js");

// ---------- Хелпер: "21.09.2026" → Date ----------
function parseRussianDate(str) {
    // Ожидаем формат ДД.ММ.ГГГГ
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(str);
    if (!m) return null;
    const [, dd, mm, yyyy] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

// ---------- Хелпер: Date → "YYYY-MM-DD" ----------
function toIsoDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

// ---------- Хелпер: вычислить дату для Day N ----------
// N=1 → понедельник → monday + 0
// N=2 → вторник   → monday + 1
// ...
// N=6 → суббота   → monday + 5
function dayDateFromMonday(monday, n) {
    if (!monday) return null;
    const d = new Date(monday);
    d.setDate(d.getDate() + (parseInt(n, 10) - 1));
    return toIsoDate(d);
}

// ---------- Основная логика ----------
function extractChanges(results) {
    const changes = [];

    // Корневой узел — берём Monday
    const root = results?.YhZav ?? {};
    const mondayStr = root.Monday?.[0] ?? "";
    const monday = parseRussianDate(mondayStr);

    const groups = root.ListGroup?.[0]?.Group || [];

    for (const group of groups) {
        const groupName = group.$?.Name ?? "";
        const days = group.Timetable?.[0]?.Day || [];

        for (const day of days) {
            const dayN = day.$?.N ?? "";
            const date = dayDateFromMonday(monday, dayN) ?? "";

            for (const lesson of day.Lesson || []) {
                const lessonN = lesson.$?.N ?? "";
                const parts = lesson.Part || [];

                const byN = new Map();

                for (const part of parts) {
                    const status = part?.$?.Status;
                    const n = part?.$?.N;
                    if (!status) continue;

                    if (!byN.has(n)) byN.set(n, {});
                    const entry = byN.get(n);

                    if (status === "Заменён") entry.replaced = part;
                    if (status === "Замена") entry.replacement = part;
                }

                for (const [n, entry] of byN) {
                    if (!entry.replacement) continue;

                    const newTeacher = entry.replacement.Teacher?.[0] ?? "";
                    const isCancelled = newTeacher === "Отменен";

                    changes.push({
                        group: groupName,
                        day: dayN,
                        date,                          // ← новое поле
                        lesson: lessonN,
                        part: n,
                        kind: isCancelled ? "cancelled" : "replaced",
                        oldName: entry.replaced?.Name?.[0] ?? "",
                        oldTeacher: entry.replaced?.Teacher?.[0] ?? "",
                        newName: isCancelled
                            ? ""
                            : entry.replacement.Name?.[0] ?? "",
                        newTeacher: isCancelled ? "" : newTeacher,
                        newAuditorium: isCancelled
                            ? ""
                            : entry.replacement.Auditorium?.[0]?.$.Number ?? "",
                    });
                }
            }
        }
    }

    changes.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.group !== b.group) return a.group.localeCompare(b.group);
        if (a.lesson !== b.lesson) return parseInt(a.lesson) - parseInt(b.lesson);
        return parseInt(a.part) - parseInt(b.part);
    });

    return changes;
}

function parseChanges(xmlPath, outPath) {
    const xmlData = fs.readFileSync(xmlPath, "utf-8");

    parseString(xmlData, (err, results) => {
        if (err) {
            console.error(`[parse-changes] Ошибка парсинга ${xmlPath}:`, err);
            process.exit(1);
        }

        const changes = extractChanges(results);
        fs.writeFileSync(outPath, JSON.stringify(changes, null, 2), "utf-8");
        console.log(`[parse-changes] Записано замен: ${changes.length} → ${outPath}`);
    });
}

const cwd = process.cwd();
const xmlPath = path.join(cwd, "public", "rs.xml");
const outPath = path.join(cwd, "src", "shared", "lib", "data", "changes.json");

parseChanges(xmlPath, outPath);

module.exports = { parseChanges };