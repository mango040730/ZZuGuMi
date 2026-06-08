import { supabase } from './supabase'
import type { Post, PollOption } from '@/app/page'

const TWELVE_HOURS = 12 * 60 * 60 * 1000

// DB row → App Post
const fromRow = (row: Record<string, unknown>): Post => ({
  id: row.id as string,
  imageData: row.image_url as string,
  questionText: row.question_text as string,
  createdAt: row.created_at as number,
  poll: (row.poll as PollOption[]) ?? undefined,
})

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', Date.now() - TWELVE_HOURS)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(fromRow)
}

async function uploadImage(base64: string, postId: string): Promise<string> {
  const [header, body] = base64.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })

  const fileName = `${postId}.jpg`
  const { error } = await supabase.storage.from('photos').upload(fileName, blob, { upsert: true })
  if (error) throw error

  const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
  return data.publicUrl
}

export async function createPost(post: Post, imageBase64: string): Promise<void> {
  const imageUrl = await uploadImage(imageBase64, post.id)
  const { error } = await supabase.from('posts').insert({
    id: post.id,
    image_url: imageUrl,
    question_text: post.questionText,
    poll: post.poll ?? null,
    created_at: post.createdAt,
  })
  if (error) throw error
}

export async function updateVote(postId: string, poll: PollOption[]): Promise<void> {
  const { error } = await supabase.from('posts').update({ poll }).eq('id', postId)
  if (error) throw error
}
