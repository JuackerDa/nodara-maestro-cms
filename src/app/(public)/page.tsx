import { PublicPage } from '@/components/public-page'
import { pageMetadata, publishedPage } from '@/lib/public-data'

export async function generateMetadata() { return pageMetadata(await publishedPage()) }
export default function Home() { return <PublicPage /> }
