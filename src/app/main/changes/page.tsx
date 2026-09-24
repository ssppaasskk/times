// src/app/main/changes/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import changesJson from "@/shared/lib/data/changes.json";
import styles from "./changes.module.css";

type Change = {
    group: string;
    day: string;
    date: string;
    lesson: string;
    part: string;
    kind: "replaced" | "cancelled";
    oldName: string;
    oldTeacher: string;
    newName: string;
    newTeacher: string;
    newAuditorium: string;
};

const changes = changesJson as Change[];

const DAY_NAMES: Record<string, string> = {
    "1": "Понедельник",
    "2": "Вторник",
    "3": "Среда",
    "4": "Четверг",
    "5": "Пятница",
    "6": "Суббота",
};

function toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function getTargetDate(now: Date): string {
    const cutoff = new Date(now);
    cutoff.setHours(19, 0, 0, 0);

    if (now < cutoff) {
        return toIsoDate(now);
    } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return toIsoDate(tomorrow);
    }
}

export default function ChangesPage() {
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const targetDate = useMemo(() => {
        if (!now) return null;
        return getTargetDate(now);
    }, [now]);

    const [filterGroup, setFilterGroup] = useState<string>("");
    const [filterKind, setFilterKind] = useState<string>("");

    const todaysChanges = useMemo(() => {
        if (!targetDate) return [];
        return changes.filter(c => c.date === targetDate);
    }, [targetDate]);

    const groups = useMemo(() => {
        const set = new Set(todaysChanges.map(c => c.group));
        return Array.from(set).sort();
    }, [todaysChanges]);

    const visible = useMemo(() => {
        return todaysChanges.filter(c => {
            if (filterGroup && c.group !== filterGroup) return false;
            if (filterKind && c.kind !== filterKind) return false;
            return true;
        });
    }, [todaysChanges, filterGroup, filterKind]);

    if (!now || !targetDate) {
        return (
            <main className={styles.page}>
                <h1 className={styles.title}>Замены в расписании занятий</h1>
                <p>Загрузка…</p>
            </main>
        );
    }

    const [yyyy, mm, dd] = targetDate.split("-");
    const displayDate = `${dd}.${mm}.${yyyy}`;

    return (
        <main className={styles.page}>
            <h1 className={styles.title}>
                Замены в расписании занятий на {displayDate}
            </h1>

            {todaysChanges.length === 0 ? (
                <p className={styles.empty}>На эту дату замен нет.</p>
            ) : (
                <>
                    <div className={styles.filters}>
                        <label>
                            Группа:{" "}
                            <select
                                value={filterGroup}
                                onChange={e => setFilterGroup(e.target.value)}
                            >
                                <option value="">Все</option>
                                {groups.map(g => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Тип:{" "}
                            <select
                                value={filterKind}
                                onChange={e => setFilterKind(e.target.value)}
                            >
                                <option value="">Все</option>
                                <option value="replaced">Замена</option>
                                <option value="cancelled">Отмена</option>
                            </select>
                        </label>
                    </div>

                    {visible.length === 0 ? (
                        <p className={styles.empty}>
                            По фильтрам ничего не найдено.
                        </p>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Группа</th>
                                    <th className={styles.th}>День</th>
                                    <th className={styles.th}>Пара</th>
                                    <th className={styles.th}>Тип</th>
                                    <th className={styles.th}>Было</th>
                                    <th className={styles.th}>Стало</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((c, idx) => (
                                    <tr key={idx}>
                                        <td
                                            className={`${styles.td} ${styles.group}`}
                                        >
                                            <span className={styles.cellLabel}>
                                                Группа
                                            </span>
                                            <span>{c.group}</span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cellLabel}>
                                                День
                                            </span>
                                            <span>
                                                {DAY_NAMES[c.day] ?? c.day}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cellLabel}>
                                                Пара
                                            </span>
                                            <span>{c.lesson}</span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cellLabel}>
                                                Тип
                                            </span>
                                            <span
                                                className={
                                                    c.kind === "cancelled"
                                                        ? styles.kindCancelled
                                                        : styles.kindReplaced
                                                }
                                            >
                                                {c.kind === "cancelled"
                                                    ? "Отмена"
                                                    : "Замена"}
                                            </span>
                                        </td>
                                        <td className={`${styles.td} ${styles.old}`}>
                                            <span className={styles.cellLabel}>
                                                Было
                                            </span>
                                            <span>
                                                {c.oldName || "—"}{" "}
                                                {c.oldTeacher
                                                    ? `(${c.oldTeacher})`
                                                    : ""}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.cellLabel}>
                                                Стало
                                            </span>
                                            <span>
                                                {c.kind === "cancelled"
                                                    ? "—"
                                                    : `${c.newName || "—"} ${
                                                          c.newTeacher
                                                              ? `(${c.newTeacher})`
                                                              : ""
                                                      } ${
                                                          c.newAuditorium
                                                              ? `ауд. ${c.newAuditorium}`
                                                              : ""
                                                      }`}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </main>
    );
}