const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
} = require("next/constants");

const path = require("path");
const fs = require("fs");
const { parseString } = require("xml2js");

// ============================================================
// ХЕЛПЕРЫ ДЛЯ ОБРАБОТКИ ЗАМЕН (Status="Заменён" / "Замена")
// ============================================================

/**
 * Убирает атрибут Status у Part, сохраняя остальные атрибуты ($).
 * Возвращает новый объект, не мутируя исходный.
 */
function stripStatus(part) {
    if (!part || !part.$) return part;
    const { Status, ...rest } = part.$;
    return { ...part, $: rest };
}

/**
 * Обрабатывает Part внутри одного Lesson:
 *  - Part со Status="Заменён"  — удаляется (старая пара)
 *  - Part со Status="Замена"   — остаётся (новая пара), Status убирается
 *  - Part со Status="Замена" и Teacher="Отменен" — удаляется полностью
 *  - Part без Status           — остаётся как есть
 */
function collapseLessonParts(lesson) {
    const parts = lesson.Part;
    if (!Array.isArray(parts) || parts.length === 0) return;

    const hasAnyStatus = parts.some(p => p?.$?.Status);
    if (!hasAnyStatus) return;

    // Собираем N, для которых есть "Замена"
    const replacedNs = new Set();
    for (const part of parts) {
        if (part?.$?.Status === "Замена") {
            replacedNs.add(part?.$?.N);
        }
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
            if (teacher === "Отменен") continue;
            result.push(stripStatus(part));
            continue;
        }

        result.push(part);
    }

    result.sort((a, b) => {
        const na = parseInt(a?.$?.N ?? "0", 10);
        const nb = parseInt(b?.$?.N ?? "0", 10);
        return na - nb;
    });

    lesson.Part = result;
}

/**
 * Проходит по всей структуре и схлопывает замены в каждом Lesson.
 */
function mergeReplacements(results) {
    const root = results?.YhZav;
    if (!root) return results;

    const listGroup = root.ListGroup?.[0];
    if (!listGroup) return results;

    for (const group of listGroup.Group || []) {
        const timetable = group.Timetable?.[0];
        if (!timetable) continue;

        for (const day of timetable.Day || []) {
            for (const lesson of day.Lesson || []) {
                collapseLessonParts(lesson);
            }
        }
    }

    return results;
}

// ============================================================
// ХЕЛПЕРЫ ДЛЯ САНИТАЦИИ (удаление пустых Lesson без Part)
// ============================================================

/**
 * Урок считается валидным, если у него есть непустой массив Part.
 */
function isValidLesson(lesson) {
    const parts = lesson?.Part;
    return Array.isArray(parts) && parts.length > 0;
}

/**
 * Удаляет Lesson без Part и Lesson с пустым Part.
 */
function sanitizeLessons(results) {
    const root = results?.YhZav;
    if (!root) return results;

    const listGroup = root.ListGroup?.[0];
    if (!listGroup) return results;

    for (const group of listGroup.Group || []) {
        const timetable = group.Timetable?.[0];
        if (!timetable) continue;

        for (const day of timetable.Day || []) {
            const lessons = day.Lesson;
            if (!Array.isArray(lessons)) continue;
            day.Lesson = lessons.filter(isValidLesson);
        }
    }

    return results;
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ: XML → JSON
// ============================================================

function createDataJsonFile(readName, writeName, applyMerge = false) {
    const dataDir = path.join(process.cwd(), "src", "shared", "lib", "data");
    const getDataPath = (filename) => path.join(dataDir, filename);
    const getXMLPath = (filename) =>
        path.join(process.cwd(), "public", filename);

    // Создаём папку, если её нет
    fs.mkdirSync(dataDir, { recursive: true });

    const xmlPath = getXMLPath(readName);

    // Проверка существования файла
    if (!fs.existsSync(xmlPath)) {
        console.warn(`[createDataJsonFile] Файл не найден: ${xmlPath}`);
        return;
    }

    const xmlData = fs.readFileSync(xmlPath, "utf-8");

    parseString(xmlData, function (err, results) {
        if (err) {
            console.error(`[createDataJsonFile] Ошибка парсинга ${readName}:`, err);
            return null;
        }

        // 1. Схлопываем замены (только если в файле есть Status)
        if (applyMerge) {
            mergeReplacements(results);
        }

        // 2. Удаляем пустые Lesson
        sanitizeLessons(results);

        // 3. Записываем результат
        fs.writeFileSync(getDataPath(writeName), JSON.stringify(results), "utf-8");
        console.log(`[createDataJsonFile] Записан: ${writeName}`);
    });
}

// ============================================================
// КОНФИГ NEXT.JS
// ============================================================

const nextConfig = {};
let start = true;

module.exports = (phase) => {
    if (start) {
        // Единственный файл с расписанием (содержит замены и пустые пары)
        createDataJsonFile("rs.xml", "../data/data.json", true);

        start = false;
    }

    if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
        const withPWA = require("@ducanh2912/next-pwa").default({
            dest: "public",
        });
        return withPWA(nextConfig);
    }

    return nextConfig;
};