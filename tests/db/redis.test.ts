import { describe, it, expect, vi } from 'vitest'
import redis from '../../src/db/redis'

vi.mock('ioredis', () => {
  class MockRedis {
    get(key: string) {
      if (key === 'noResults') { return Promise.resolve(null) }
      return Promise.resolve(JSON.stringify({ team: [], show: false }))
    }
    set(_key: string, value: string) {
      return Promise.resolve(value)
    }
    del(key: string) {
      return Promise.resolve(key)
    }
  }
  return { default: MockRedis }
})

describe('db/redis', () => {
  describe('redis.get', () => {
    it('should return a rejected promise when the key is invalid', async () => {
      await expect(redis.get(null as unknown as string)).rejects.toThrow()
    })

    it('should return `null` when returns no results', async () => {
      const result = await redis.get('noResults')
      expect(result).toBeNull()
    })

    it('should return deserialized value', async () => {
      const result = await redis.get('hasResults')
      expect(result).toEqual({ team: [], show: false })
    })
  })

  describe('redis.set', () => {
    it('should return a rejected promise when the key is invalid', async () => {
      await expect(redis.set(null as unknown as string, 'value')).rejects.toThrow()
    })

    it('should pass through key and string value to redis', async () => {
      const result = await redis.set('key', 'value')
      expect(result).toBe('value')
    })

    it('should pass through key and auto-serialized value to redis', async () => {
      const result = await redis.set('key', { key: 'value' } as unknown as string)
      expect(result).toBe(JSON.stringify({ key: 'value' }))
    })
  })

  describe('redis.del', () => {
    it('should return a rejected promise when the key is invalid', async () => {
      await expect(redis.del(null as unknown as string)).rejects.toThrow()
    })

    it('should delete record via key', async () => {
      const result = await redis.del('key')
      expect(result).toBe('key')
    })
  })
})
