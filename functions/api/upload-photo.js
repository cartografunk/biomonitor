import { AwsClient } from 'aws4fetch'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function requiredEnv(env, key) {
  const value = env[key]
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function cleanPublicUrl(url) {
  return url.replace(/\/$/, '')
}

async function requireSupabaseUser(request, env) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const supabaseUrl = requiredEnv(env, 'SUPABASE_URL')
  const supabaseAnonKey = requiredEnv(env, 'SUPABASE_ANON_KEY')

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization,
    },
  })

  if (!response.ok) return null
  return response.json()
}

async function requireEditor(user, request, env) {
  const authorization = request.headers.get('authorization')
  const supabaseUrl = requiredEnv(env, 'SUPABASE_URL')
  const supabaseAnonKey = requiredEnv(env, 'SUPABASE_ANON_KEY')

  const response = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=role`, {
    headers: {
      apikey: supabaseAnonKey,
      authorization,
    },
  })

  if (!response.ok) return false
  const rows = await response.json()
  return rows?.[0]?.role === 'editor'
}

async function putObject({ env, key, file }) {
  const accountId = requiredEnv(env, 'R2_ACCOUNT_ID')
  const accessKeyId = requiredEnv(env, 'R2_ACCESS_KEY_ID')
  const secretAccessKey = requiredEnv(env, 'R2_SECRET_ACCESS_KEY')
  const bucketName = requiredEnv(env, 'R2_BUCKET_NAME')

  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: 'auto',
  })

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`
  const signed = await aws.sign(endpoint, {
    method: 'PUT',
    headers: {
      'content-type': file.type || 'image/webp',
    },
    body: await file.arrayBuffer(),
  })

  const response = await fetch(signed)
  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status}`)
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireSupabaseUser(request, env)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const canUpload = await requireEditor(user, request, env)
    if (!canUpload) return json({ error: 'Forbidden' }, 403)

    const form = await request.formData()
    const image = form.get('image')
    const thumbnail = form.get('thumbnail')
    const visitId = String(form.get('visit_id') ?? '')
    const pointNumber = String(form.get('point_number') ?? '')

    if (!(image instanceof File) || !(thumbnail instanceof File)) {
      return json({ error: 'image and thumbnail are required' }, 400)
    }

    if (image.type !== 'image/webp' || thumbnail.type !== 'image/webp') {
      return json({ error: 'Only image/webp files are accepted' }, 400)
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return json({ error: 'Image exceeds 2MB' }, 413)
    }

    const safeVisitId = visitId.replace(/[^a-zA-Z0-9_-]/g, '')
    const safePointNumber = pointNumber.replace(/[^0-9]/g, '')
    const date = new Date().toISOString().slice(0, 10)
    const id = crypto.randomUUID()
    const prefix = `visits/${date}/${safeVisitId || 'unknown'}/p${safePointNumber || 'x'}`
    const storageKey = `${prefix}/${id}.webp`
    const thumbnailKey = `${prefix}/${id}-thumb.webp`

    await putObject({ env, key: storageKey, file: image })
    await putObject({ env, key: thumbnailKey, file: thumbnail })

    const publicUrl = cleanPublicUrl(requiredEnv(env, 'R2_PUBLIC_URL'))

    return json({
      storage_key: storageKey,
      thumbnail_key: thumbnailKey,
      storage_url: `${publicUrl}/${storageKey}`,
      thumbnail_url: `${publicUrl}/${thumbnailKey}`,
      file_size_kb: Math.ceil(image.size / 1024),
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Upload failed' }, 500)
  }
}
