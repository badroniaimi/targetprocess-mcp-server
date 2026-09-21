import type { TpClient } from '../tp.js'
import type * as TP from '../types.js'

export async function handleCreateTask(
  tp: TpClient,
  params: {
    title: string
    userStoryId: string
    description?: string
  },
) {
  const result = await tp.createTask<TP.Task>(params)

  if (!result.ok) {
    return {
      content: [{
        type: 'text' as const,
        text: `Failed to create task "${params.title}"\n` +
          `HTTP status: ${result.status}\n` +
          `Response body: ${result.body}`
      }],
    }
  }

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result.data) }],
  }
}
