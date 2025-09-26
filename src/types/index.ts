export interface Entry {
  id: string
  data: string
  metadata: {
    type?: 'text' | 'audio' | 'image' | 'youtube' | 'spotify'
    audioFile?: string
    audioUrl?: string
    imageFile?: string
    imageUrl?: string
    embedUrl?: string
    originalUrl?: string
    title?: string
    videoId?: string
    author?: {
      name?: string
      instagram?: string
      url?: string
    }
    comment_ids?: string[]
  }
  embedding: number[]
  createdAt: string
  updatedAt: string
  collection: string
  parentId?: string
  comments?: Entry[]
}

export interface Collection {
  name: string
}

export type UploadType = 'text' | 'image' | 'audio' | 'csv'