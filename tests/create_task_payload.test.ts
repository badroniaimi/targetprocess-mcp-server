import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const TOKEN = 'test-token'
const BASE_URL = 'https://tp.example.com'

// A project id deliberately different from the story's, to prove the payload no
// longer pins the task to TP_PROJECT_ID.
const CONFIGURED_PROJECT_ID = '111111'
const USER_STORY_ID = '362933'

async function loadClient() {
  vi.resetModules()
  vi.stubEnv('TP_TOKEN', TOKEN)
  vi.stubEnv('TP_BASE_URL', BASE_URL)
  vi.stubEnv('TP_PROJECT_ID', CONFIGURED_PROJECT_ID)
  const { TpClient } = await import('../src/tp.js')
  return new TpClient()
}

function stubFetch(response: { ok: boolean, status?: number, body?: string }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    text: async () => response.body ?? JSON.stringify({ Id: 900 }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function bodyOf(fetchMock: ReturnType<typeof stubFetch>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => { })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createTask payload', () => {
  it('does not pin the task to the configured project', async () => {
    const tp = await loadClient()
    const fetchMock = stubFetch({ ok: true })

    await tp.createTask({ title: 'Write tests', userStoryId: USER_STORY_ID })

    // TP derives the task's project from its parent story. Sending Project
    // explicitly is what made every cross-project create fail with 400.
    expect(bodyOf(fetchMock)).not.toHaveProperty('Project')
  })

  it('sends the user story id as a number', async () => {
    const tp = await loadClient()
    const fetchMock = stubFetch({ ok: true })

    await tp.createTask({ title: 'Write tests', userStoryId: USER_STORY_ID })

    expect(bodyOf(fetchMock).UserStory).toEqual({ Id: 362933 })
  })

  it('omits Description when none is given', async () => {
    const tp = await loadClient()
    const fetchMock = stubFetch({ ok: true })

    await tp.createTask({ title: 'Write tests', userStoryId: USER_STORY_ID })

    expect(bodyOf(fetchMock)).not.toHaveProperty('Description')
  })

  it('returns the status and body instead of swallowing a failure', async () => {
    const tp = await loadClient()
    stubFetch({ ok: false, status: 400, body: 'Project mismatch' })

    const result = await tp.createTask({ title: 'Write tests', userStoryId: USER_STORY_ID })

    expect(result).toEqual({ ok: false, status: 400, body: 'Project mismatch' })
  })
})
