export type SourceName =
  | 'Hodinkee'
  | 'Worn & Wound'
  | 'Fratello'
  | 'Monochrome'
  | 'ABTW'

export type NewsCategory =
  | 'market'
  | 'new-release'
  | 'review'
  | 'history'
  | 'interview'

export interface NewsItem {
  id: string
  source: SourceName
  title: string
  excerpt: string
  url: string
  publishedAt: string
  imageUrl?: string
  author?: string
  tags: {
    brands: string[]
    references: string[]
    categories: NewsCategory[]
  }
}
