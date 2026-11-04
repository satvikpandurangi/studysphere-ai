import { describe, expect, it } from 'vitest'
import api from './index'

const env={APP_ORIGIN:'https://app.example.test'} as Parameters<typeof api.fetch>[1]

describe('API request boundary',()=>{
  it('rejects requests from an unexpected browser origin',async()=>{
    const response=await api.fetch(new Request('https://api.example.test/health',{headers:{Origin:'https://other.example.test'}}),env)
    expect(response.status).toBe(403)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
  it('allows preflight only for the configured app origin',async()=>{
    const response=await api.fetch(new Request('https://api.example.test/quiz/grade',{method:'OPTIONS',headers:{Origin:env.APP_ORIGIN}}),env)
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(env.APP_ORIGIN)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
  it('requires authentication for application routes',async()=>{
    const response=await api.fetch(new Request('https://api.example.test/students/consent',{method:'POST',headers:{Origin:env.APP_ORIGIN}}),env)
    expect(response.status).toBe(401)
    expect((await response.json() as {error:string}).error).toBe('Unauthorized')
  })
})
