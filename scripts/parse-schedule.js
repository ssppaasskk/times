// scripts/parse-schedule.js
const fs = require("fs");
const path = require("path");
const { parseString } = require("xml2js");

// ---------- Хелперы ----------

function stripStatus(part) {
    if (!part || !part.$) return part;
    const { Status, ...rest } = part.$;
    return { ...part, $: rest };
}

function collapseLessonParts(lesson) {
    const parts = lesson.Part;
    if (!Array.isArray(parts) || parts.length === 0) return;

    const hasAnyStatus = parts.some(p => p?.$?.Status);
    if (!hasAnyStatus) return;

    const replacedNs = new Set();
    for (const part of parts) {
        if (part?.$?.Status === "Замена") replacedNs.add(part?.$?.N);
    }

    const result = [];
    for (const part of parts) {
        const status = part?.$?.Status;
        const n = part?.$?.N;

        if (status === "Заменён") {
            if (replacedNs.has(n)) continue;
            result.push(part);
            continue;
        }

        if (status === "Замена") {
            const teacher = part?.Teacher?.[0];
            if (teacher === "Отменен") continue; // отмена — пару убираем совсем
            result.push(stripStatus(part));
            continue;
        }

        result.push(part);
    }

    result.sort((a, b) => parseInt(a?.$?.N ?? "0") - parseInt(b?.$?.N ?? "0"));
    lesson.Part = result;
}

function mergeReplacements(results) {
    const groups = results?.YhZav?.ListGroup?.[0]?.Group || [];
    for (const group of groups) {
        const timetable = group.Timetable?.[0];
        if (!timetable) continue;
        for (const day of timetable.Day || []) {
            for (const lesson of day.Lesson || []) collapseLessonParts(lesson);
        }
    }
}

function isValidLesson(lesson) {
    const parts = lesson?.Part;
    return Array.isArray(parts) && parts.length > 0;
}

function sanitizeLessons(results) {
    const groups = results?.YhZav?.ListGroup?.[0]?.Group || [];
    for (const group of groups) {
        const timetable = group.Timetable?.[0];
        if (!timetable) continue;
        for (const day of timetable.Day || []) {
            if (!Array.isArray(day.Lesson)) continue;
            day.Lesson = day.Lesson.filter(isValidLesson);
        }
    }
}

// ---------- Основная логика ----------

function parseSchedule(xmlPath, outPath) {
    const xmlData = fs.readFileSync(xmlPath, "utf-8");

    parseString(xmlData, (err, results) => {
        if (err) {
            console.error(`[parse-schedule] Ошибка парсинга ${xmlPath}:`, err);
            process.exit(1);
        }

        mergeReplacements(results);
        sanitizeLessons(results);

        fs.writeFileSync(outPath, JSON.stringify(results), "utf-8");
        console.log(`[parse-schedule] Записан: ${outPath}`);
    });
}

// ---------- CLI ----------

const cwd = process.cwd();
const xmlPath = path.join(cwd, "public", "rs.xml");
const outPath = path.join(cwd, "src", "shared", "lib", "data", "data.json");

parseSchedule(xmlPath, outPath);

module.exports = { parseSchedule };