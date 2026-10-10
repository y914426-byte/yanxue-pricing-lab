import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},title:'江南农耕研学 · 运营工作台',description:'研学活动定价、日历排期、物资准备与方案管理，一站完成研学运营。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}