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
 *
 * Устойчива к порядку: сначала собирает все N, для которых есть "Замена",
 * потом фильтрует.
 */
function collapseLessonParts(lesson) {
    const parts = lesson.Part;
    if (!Array.isArray(parts) || parts.length === 0) return;

    const hasAnyStatus = parts.some(p => p?.$?.Status);
    if (!hasAnyStatus) return;

    // Первый проход: собираем N, для которых есть "Замена"
    const replacedNs = new Set();
    for (const part of parts) {
        if (part?.$?.Status === "Замена") {
            replacedNs.add(part?.$?.N);
        }
    }

    // Второй проход: формируем результат
    const result = [];
    for (const part of parts) {
        const status = part?.$?.Status;
        const n = part?.$?.N;

        if (status === "Заменён") {
            // Если по этому N есть "Замена" — старую пару выбрасываем
            if (replacedNs.has(n)) continue;
            // Иначе — оставляем как есть (замена не пришла)
            result.push(part);
            continue;
        }

        if (status === "Замена") {
            const teacher = part?.Teacher?.[0];
            const isCancellation = teacher === "Отменен";

            // Отмена — пару не показываем вообще
            if (isCancellation) continue;

            // Обычная замена — оставляем без Status
            result.push(stripStatus(part));
            continue;
        }

        // Обычный Part без Status
        result.push(part);
    }

    // Стабильный порядок по N
    result.sort((a, b) => {
        const na = parseInt(a?.$?.N ?? "0", 10);
        const nb = parseInt(b?.$?.N ?? "0", 10);
        return na - nb;
    });

    lesson.Part = result;
}

/**
 * Проходит по всей структуре YhZav → ListGroup → Group → Timetable → Day → Lesson
 * и схлопывает замены в каждом Lesson.
 */
function mergeReplacements(results) {
    const root = results?.YhZav;
    if (!root) return results;

    const listGroup = root.ListGroup?.[0];
    if (!listGroup) return results;

    const groups = listGroup.Group || [];

    for (const group of groups) {
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
 * Удаляет Lesson без Part (например, <Lesson N="4"></Lesson>),
 * а также Lesson с пустым Part (например, после схлопывания всех пар в отмену).
 *
 * Обходит всю структуру YhZav → ListGroup → Group → Timetable → Day → Lesson.
 */
function sanitizeLessons(results) {
    const root = results?.YhZav;
    if (!root) return results;

    const listGroup = root.ListGroup?.[0];
    if (!listGroup) return results;

    const groups = listGroup.Group || [];

    for (const group of groups) {
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

/**
 * Читает XML из public/<readName>, парсит его через xml2js,
 * при необходимости схлопывает замены, санирует пустые уроки
 * и записывает результат в src/shared/lib/data/<writeName>.
 *
 * @param {string} readName    - имя XML-файла в public/
 * @param {string} writeName   - имя JSON-файла (относительно src/shared/lib/data/)
 * @param {boolean} applyMerge - применять ли mergeReplacements (для файлов с Status)
 */
function createDataJsonFile(readName, writeName, applyMerge = false) {
    const getDataPath = (filename) =>
        path.join(process.cwd(), "src", "shared", "lib", "data", filename);
    const getXMLPath = (filename) =>
        path.join(process.cwd(), "public", filename);

    const xmlData = fs.readFileSync(getXMLPath(readName), "utf-8");

    parseString(xmlData, function (err, results) {
        if (err) {
            console.error(`[createDataJsonFile] Ошибка парсинга ${readName}:`, err);
            return null;
        }

        // 1. Схлопываем замены (только для файлов с Status)
        if (applyMerge) {
            mergeReplacements(results);
        }

        // 2. Удаляем пустые Lesson (для всех файлов)
        sanitizeLessons(results);

        // 3. Записываем результат
        fs.writeFileSync(getDataPath(writeName), JSON.stringify(results), "utf-8");
    });
}

// ============================================================
// КОНФИГ NEXT.JS
// ============================================================

const nextConfig = {};
let start = true;

module.exports = (phase) => {
    if (start) {
        // Обычные расписания — без схлопывания замен
        createDataJsonFile("rs.xml", "../data/data.json", false);
        createDataJsonFile("rs202554.xml", "../data/even_data.json", false);
        createDataJsonFile("rs202553.xml", "../data/odd_data.json", false);

        // Файл замен — со схлопыванием
        createDataJsonFile(
            "Расписаниеrs_dop_31.xml",
            "../data/dop_data.json",
            true
        );

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
