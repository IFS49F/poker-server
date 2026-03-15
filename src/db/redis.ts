import Redis from 'ioredis'
import type { RoomState } from '../types'

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
const ts = new Date().getTime()
const redis = new Redis(redisUrl, {
  keyPrefix: `poker:${ts}:`
})

const isInvalidKey = (key: unknown): boolean => !key || typeof key !== 'string'

export default {
  get(key: string): Promise<RoomState | null> {
    if (isInvalidKey(key)) { return Promise.reject(new Error('invalid key')) }

    return redis.get(key).then(result => {
      if (!result) { return null }
      return JSON.parse(result) as RoomState
    })
  },

  set(key: string, value: RoomState | string): Promise<string> {
    if (isInvalidKey(key)) { return Promise.reject(new Error('invalid key')) }

    const str = typeof value !== 'string' ? JSON.stringify(value) : value
    return redis.set(key, str)
  },

  del(key: string): Promise<number> {
    if (isInvalidKey(key)) { return Promise.reject(new Error('invalid key')) }

    return redis.del(key)
  }
}
