import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={icons:{icon:'/favicon.svg'},title:'研学定价台 · 成本与利润测算',description:'免费研学项目定价计算器。测算成本、毛利、保本价格和招生人数，比较不同定价方案。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}