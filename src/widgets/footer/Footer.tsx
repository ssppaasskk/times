import { useRef, useState, Suspense} from "react"
import Image from "next/image"
import PageWrapper from "@/entities/PageWrapper/PageWrapper"
import styles from './Footer.module.css'
import Link from "next/link"
import { Raleway } from "next/font/google"


const raleway = Raleway({ 
    variable: '--font-raleway',
    subsets: ['latin'],
})

const Footer = () => {
    return (
        <footer id='custom' className={styles.sticky}>
                    <Suspense>
                        <div className={styles.flex}>
                            <div className={styles.left}>
                                <Image quality={100}
                                       src='/Icon.svg'
                                       width={70} height={70}
                                       alt="Логотип СПАСКа"
                                       priority
                                       className={styles.image}/>
                                <p></p>
                            </div>

                            <div className={styles.right}>
                                <Link href='#nav'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28" fill="none">
                                        <circle cx="14" cy="14" r="14" fill="white"/>
                                        <path d="M14.7071 9.29289C14.3166 8.90237 13.6834 8.90237 13.2929 9.29289L6.92893 15.6569C6.53841 16.0474 6.53841 16.6805 6.92893 17.0711C7.31946 17.4616 7.95262 17.4616 8.34315 17.0711L14 11.4142L19.6569 17.0711C20.0474 17.4616 20.6805 17.4616 21.0711 17.0711C21.4616 16.6805 21.4616 16.0474 21.0711 15.6569L14.7071 9.29289ZM15 11L15 10L13 10L13 11L15 11Z" fill="#AAAAAA"/>
                                    </svg>
                                </Link>
                                <p className={raleway.className}>Сайт разработан: IT SPASK</p>
                            </div>
                        </div>
                    </Suspense>
        </footer>
    )
}

export default Footer
