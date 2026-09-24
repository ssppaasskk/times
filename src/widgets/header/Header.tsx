"use client"

import {Suspense, useEffect, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import font from "next/font/local";
import Search from "@/features/SearchWeak/Search";
import styles from "./Header.module.css";

const myFont = font({src: './PT Sans Pro Extra Condensed Light.otf'});
const navList = [
    {link: "/", content: "Главная"},
    {link: "/room", content: "Поиск по кабинетам"},
    {link: "/room/onGroup", content: "Кабинеты по группам"},
    {link: "/room/onTeacher", content: "Кабинеты по преподавателям"},
    {link: '/main/group', content: "Расписание на семестр для групп"},
    {link: '/main/teacher', content: "Расписание для преподавателей"},
    {link: '/main/changes', content: "Замены"},
];
const Navbar = () => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(false);
    const nodeRef = useRef<HTMLDivElement>(null);
    const buttonOpenRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const handleOutsideClick = (e: globalThis.MouseEvent) => {
            const target = e.target as Node;
            if (!(nodeRef.current?.contains(target) || buttonOpenRef.current?.contains(target))) {
                closeMenu();
            }
        }
        window.addEventListener("click", handleOutsideClick);
        return () => {
            window.removeEventListener("click", handleOutsideClick);
        }
    }, []);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
    }, [open]);

    function closeMenu() {
        setOpen(false);
    }

    function toggleMenu() {
        setOpen((open) => !open);
    }

    function setStatusSearch(value: boolean) {
        setSearch(value);
        closeMenu();
        // setOpen(value)
    }

    return (
        <div id='custom' className={styles.sticky}>
            <header id="nav" className={styles.header}>
                <Suspense>
                    <div className={styles.flex}>
                        <div className={styles.left}>
                            <Image quality={100}
                                   src='/Icon.svg'
                                   width={70} height={70}
                                   alt="Логотип СПАСКа"
                                   priority
                                   className={search ? styles.disImg : styles.image}
                            />
                            <p className={myFont.className}>Расписание занятий</p>
                        </div>

                        <div className={styles.right}>
                            <Search setStatus={setStatusSearch}/>
                            <button
                                className={search ? styles.disBurger : styles.burger}
                                onClick={toggleMenu}
                                style={{color: "white"}}
                            >
                                <span className={styles.nav} ref={buttonOpenRef}>
                                    <div
                                        className={styles.open}
                                        style={{
                                            border: "3px solid white",
                                            borderRadius: '5px',
                                            width: 33,
                                            height: 0,
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            border: "3px solid white",
                                            borderRadius: '5px',
                                            width: 33,
                                            height: 0,
                                            marginTop: 4,
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            border: "3px solid white",
                                            borderRadius: '5px',
                                            width: 19,
                                            height: 0,
                                            marginTop: 4,
                                        }}
                                    ></div>
                                </span>
                            </button>
                        </div>
                    </div>
                </Suspense>
            </header>

            <div className={open ? styles.mob_menu : styles.mob_menuClose} ref={nodeRef}>
                <button className={styles.burger} onClick={closeMenu}>
                    <span className={styles.nav}>
                        <div
                            className={styles.open}
                            style={{
                                border: "1px solid white",
                                width: 50,
                                height: 0,
                                marginTop: 5,
                                transform: "rotateZ(45deg)",
                            }}
                        ></div>
                        <div
                            style={{
                                border: "1px solid white",
                                width: 50,
                                height: 0,
                                marginTop: -1,
                                transform: "rotateZ(-45deg)",
                            }}
                        ></div>
                    </span>
                </button>
                <div>
                    {navList.map((value) => (
                        <Link
                            key={value.link}
                            href={value.link}
                            onClick={closeMenu}
                        >
                            {value.content}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Navbar;
